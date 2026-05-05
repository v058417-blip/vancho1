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

function updateState() {
  const now = Date.now();

  if (state.mode === "manual") {
    if (now >= state.until) {
      state.mode = "auto";
      state.index = Math.floor(Math.random() * 2);
      state.text = variants[state.index];
      state.nextChange = now + randomInterval();
    } else {
      return saveState(state);
    }
  }

  if (state.mode === "auto" && now >= state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = randomInterval();
  }

  saveState(state);
}

setInterval(updateState, 1000);

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
}

body{
  background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1020 60%, #050816);
}

canvas{
  position:fixed;
  top:0;
  left:0;
  z-index:0;
  pointer-events:none;
}

.glass{
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border-radius:28px;
  padding:34px 90px;
  border:1px solid rgba(255,255,255,0.10);
  box-shadow: 0 20px 60px rgba(0,0,0,0.55);
}

h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  color:#e0e7ff;
  font-size:46px;
  z-index:2;
  text-shadow:0 0 20px rgba(139,92,246,0.25);
}

span{ color:#a78bfa; }

#adminBtn{
  position:fixed;
  top:15px;
  left:15px;
  width:56px;
  height:56px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:22px;
  cursor:pointer;

  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(18px);
  border-radius:16px;
  border:1px solid rgba(255,255,255,0.12);
  color:white;
  z-index:3;
}
</style>
</head>

<body>

<canvas id="c"></canvas>
<div id="adminBtn">❤️</div>

<h1 class="glass">сейчас Ваня <span id="text">...</span></h1>

<script>
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
onresize = resize;

/* 🌊 стабильные “жидкие массы” */
let blobs = [];

// большие
for(let i=0;i<4;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:0,vy:0,
    r:320 + Math.random()*260
  });
}

// средние
for(let i=0;i<5;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:0,vy:0,
    r:140 + Math.random()*120
  });
}

// мелкие (почти невидимые)
for(let i=0;i<8;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:(Math.random()-0.5)*0.6,
    vy:(Math.random()-0.5)*0.6,
    r:25 + Math.random()*50
  });
});

let pointer = {x:innerWidth/2,y:innerHeight/2};

window.addEventListener("mousemove",e=>{
  pointer.x=e.clientX;
  pointer.y=e.clientY;
});

window.addEventListener("touchmove",e=>{
  let t=e.touches[0];
  pointer.x=t.clientX;
  pointer.y=t.clientY;
});

function glow(x,y,r,intensity){
  let g = ctx.createRadialGradient(x,y,0,x,y,r);

  g.addColorStop(0,`rgba(167,139,250,${0.30*intensity})`);
  g.addColorStop(0.4,`rgba(139,92,246,${0.12*intensity})`);
  g.addColorStop(1,"rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation="lighter";

  for(let b of blobs){

    // движение
    b.vx += (Math.random()-0.5)*0.01;
    b.vy += (Math.random()-0.5)*0.01;

    let dx = pointer.x - b.x;
    let dy = pointer.y - b.y;
    let d = Math.sqrt(dx*dx + dy*dy);

    if(d < 850){
      let f = (1 - d/850)*0.02;
      b.vx += dx*f;
      b.vy += dy*f;
    }

    b.vx *= 0.94;
    b.vy *= 0.94;

    b.x += b.vx;
    b.y += b.vy;

    // 💡 мягкое “световое наложение” (НЕ слипание)
    let intensity = 1;

    for(let o of blobs){
      if(o === b) continue;

      let dx2 = b.x - o.x;
      let dy2 = b.y - o.y;
      let dist = Math.sqrt(dx2*dx2 + dy2*dy2);

      if(dist < (b.r + o.r)*0.35){
        intensity += 0.2;
      }
    }

    if(b.r < 60) intensity *= 0.4;

    glow(b.x,b.y,b.r,intensity);
  }

  requestAnimationFrame(draw);
}
draw();

/* state */
async function load(){
  try{
    let r = await fetch("/state");
    let d = await r.json();
    document.getElementById("text").textContent = d.text;
  }catch(e){}
}

load();
setInterval(load,1000);

/* admin */
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
