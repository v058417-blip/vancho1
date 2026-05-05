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
    } else return saveState(state);
  }

  if (state.mode === "auto" && now >= state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = randomInterval();
  }

  saveState(state);
}

setInterval(updateState, 1000);

// API
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

// FRONT
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
  inset:0;
}

/* 📦 ТАБЛИЧКА (УМЕНЬШЕНА) */
.glass{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);

  width:82vw;            /* ↓ было 90vw */
  max-width:980px;       /* ↓ было 1100px */

  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(18px);

  border-radius:34px;

  padding:70px 90px;     /* чуть компактнее */

  border:1px solid rgba(255,255,255,0.10);

  text-align:center;
}

/* 🔤 текст чуть крупнее */
h1{
  margin:0;
  color:#e0e7ff;
  font-size: clamp(50px, 4.8vw, 76px);
  line-height:1.1;
}

span{
  color:#a78bfa;
}

/* ❤️ админка */
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

  background: rgba(167,139,250,0.18);
  backdrop-filter: blur(18px);
  border-radius:16px;

  border:1px solid rgba(167,139,250,0.35);
  color:#c4b5fd;
}
</style>
</head>

<body>

<canvas id="c"></canvas>
<div id="adminBtn">❤️</div>

<div class="glass">
  <h1>сейчас Ваня <span id="text">...</span></h1>
</div>

<script>
const c=document.getElementById("c");
const ctx=c.getContext("2d");

function resize(){
  c.width=innerWidth;
  c.height=innerHeight;
}
resize();
addEventListener("resize",resize);

/* 🌊 ЛЮБИМАЯ ФИЗИКА (ВОЗВРАЩЕНА) */
let blobs=[];

for(let i=0;i<10;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:(Math.random()-0.5)*1.2,
    vy:(Math.random()-0.5)*1.2,
    ax:0,
    ay:0,
    r:180 + Math.random()*320
  });
}

let p={x:innerWidth/2,y:innerHeight/2};

addEventListener("mousemove",e=>{
  p.x=e.clientX;
  p.y=e.clientY;
});

addEventListener("touchmove",e=>{
  let t=e.touches[0];
  p.x=t.clientX;
  p.y=t.clientY;
});

function flow(x,y,t){
  return Math.sin(x*0.003+t)*Math.cos(y*0.003-t);
}

function draw(){
  ctx.clearRect(0,0,c.width,c.height);
  ctx.globalCompositeOperation="lighter";

  let t=Date.now()*0.001;

  for(let i=0;i<blobs.length;i++){
    let b=blobs[i];

    // 🌪 вихрь
    b.ax += flow(b.x,b.y,t)*0.4;
    b.ay += flow(b.y,b.x,t)*0.4;

    // 👆 палец
    let dx=p.x-b.x;
    let dy=p.y-b.y;
    let d=Math.sqrt(dx*dx+dy*dy);

    if(d<900){
      let f=(1-d/900)*0.002;
      b.ax+=dx*f;
      b.ay+=dy*f;
    }

    // 🧠 вязкость
    b.vx=(b.vx+b.ax)*0.9;
    b.vy=(b.vy+b.ay)*0.9;

    b.x+=b.vx;
    b.y+=b.vy;

    b.ax*=0.5;
    b.ay*=0.5;

    // wrap
    if(b.x<0)b.x=innerWidth;
    if(b.x>innerWidth)b.x=0;
    if(b.y<0)b.y=innerHeight;
    if(b.y>innerHeight)b.y=0;

    // 💜 мягкий градиент (как раньше)
    let g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    g.addColorStop(0,"rgba(255,255,255,0.30)");
    g.addColorStop(0.25,"rgba(180,150,255,0.22)");
    g.addColorStop(0.6,"rgba(139,92,246,0.15)");
    g.addColorStop(1,"rgba(10,10,30,0)");

    ctx.fillStyle=g;

    ctx.beginPath();
    ctx.ellipse(
      b.x,
      b.y,
      b.r,
      b.r*0.75,
      Math.sin(i+t)*0.2,
      0,
      Math.PI*2
    );
    ctx.fill();
  }

  requestAnimationFrame(draw);
}
draw();

/* TEXT */
async function load(){
  let r=await fetch("/state");
  let d=await r.json();
  document.getElementById("text").textContent=d.text;
}
load();
setInterval(load,1000);

/* ADMIN */
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
