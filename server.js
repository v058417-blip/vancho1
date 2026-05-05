const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const FILE = path.join(__dirname, "state.json");

const variants = ["натурал", "гомосек"];

function randomInterval() {
  return 60000 + Math.random() * (3 * 24 * 60 * 60 * 1000);
}

/* ===== STATE ===== */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    const index = Math.floor(Math.random() * 2);
    const state = {
      mode: "auto",
      index,
      text: variants[index],
      nextChange: Date.now() + randomInterval(),
      until: null
    };
    fs.writeFileSync(FILE, JSON.stringify(state));
    return state;
  }
}

function saveState(s) {
  fs.writeFileSync(FILE, JSON.stringify(s));
}

let state = loadState();

/* ===== LOGIC (СТАБИЛЬНАЯ) ===== */
function updateState() {
  const now = Date.now();

  if (state.mode === "manual") {
    if (now >= state.until) {
      state.mode = "auto";
      state.index = Math.floor(Math.random() * 2);
      state.text = variants[state.index];
      state.nextChange = now + randomInterval();
    }
  }

  if (state.mode === "auto" && now >= state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = now + randomInterval();
  }

  saveState(state);
}

setInterval(updateState, 1000);

/* ===== API ===== */
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  const { text, ms } = req.body;

  state.mode = "manual";
  state.text = text;
  state.until = Date.now() + ms;

  saveState(state);
  res.json({ ok: true });
});

/* ===== FRONT ===== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>

html,body{
  margin:0;
  height:100%;
  overflow:hidden;
  font-family:Arial;
  background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1020 60%, #050816);
}

/* ВАЖНО: слои НЕ ломают друг друга */
#bg{
  position:fixed;
  inset:0;
  z-index:0;
}

canvas{
  position:fixed;
  inset:0;
  z-index:1;
  pointer-events:none;
}

h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  color:#e0e7ff;
  font-size:46px;
  z-index:2;
}

span{color:#a78bfa;}

.glass{
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border-radius:28px;
  padding:30px 70px;
  border:1px solid rgba(255,255,255,0.1);
}

#adminBtn{
  position:fixed;
  top:15px;
  left:15px;
  width:56px;
  height:56px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:16px;
  cursor:pointer;
  z-index:3;
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(18px);
  border:1px solid rgba(255,255,255,0.12);
  color:white;
}
</style>
</head>

<body>

<div id="bg"></div>
<canvas id="c"></canvas>

<div id="adminBtn">❤️</div>

<h1 class="glass">сейчас Ваня <span id="text">...</span></h1>

<script>
/* ===== SAFE CANVAS (НЕ ЛОМАЕТСЯ) ===== */
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

/* частицы */
let blobs = Array.from({length:12}, ()=>({
  x:Math.random()*innerWidth,
  y:Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.4,
  vy:(Math.random()-0.5)*0.4,
  r:50 + Math.random()*250
}));

let p = {x:innerWidth/2,y:innerHeight/2};

addEventListener("mousemove",e=>{
  p.x=e.clientX;
  p.y=e.clientY;
});

/* ===== DRAW ===== */
function draw(){
  try {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation="lighter";

    for(let b of blobs){

      let dx=p.x-b.x;
      let dy=p.y-b.y;
      let d=Math.sqrt(dx*dx+dy*dy);

      if(d<700){
        let f=(1-d/700)*0.02;
        b.vx+=dx*f;
        b.vy+=dy*f;
      }

      b.vx*=0.92;
      b.vy*=0.92;

      b.x+=b.vx;
      b.y+=b.vy;

      let g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

      g.addColorStop(0,"rgba(167,139,250,0.35)");
      g.addColorStop(0.4,"rgba(139,92,246,0.15)");
      g.addColorStop(1,"transparent");

      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(draw);

  } catch(e) {
    // если canvas упал — просто перезапускаем безопасно
    setTimeout(draw, 500);
  }
}
draw();

/* ===== TEXT ===== */
async function load(){
  try{
    let r=await fetch("/state");
    let d=await r.json();
    document.getElementById("text").textContent=d.text;
  }catch(e){}
}
load();
setInterval(load,1000);

/* ===== ADMIN ===== */
adminBtn.onclick=async()=>{
  let pass=prompt("пароль");
  if(pass!=="4724")return;

  let text=prompt("текст");
  let type=prompt("1-сек 2-мин 3-час");

  let mult=1000;
  if(type==="2")mult=60000;
  if(type==="3")mult=3600000;

  let val=prompt("число");

  await fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text,ms:Number(val)*mult})
  });

  load();
};
</script>

</body>
</html>
`);
});

app.listen(3000, () => console.log("RUNNING"));
