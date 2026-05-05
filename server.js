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
  z-index:0;
}

.glass{
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
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
  text-shadow: 0 0 20px rgba(139,92,246,0.25);
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
  border:1px solid rgba(255,255,255,0.12);
  border-radius:16px;
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
addEventListener("resize", resize);

/* 🌊 БЛОБЫ */
let blobs = [];

/* большие */
for(let i=0;i<3;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:0,vy:0,
    ax:0,ay:0,
    r:380 + Math.random()*420
  });
}

/* средние */
for(let i=0;i<5;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:0,vy:0,
    ax:0,ay:0,
    r:140 + Math.random()*160
  });
}

/* мелкие */
for(let i=0;i<6;i++){
  blobs.push({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:0,vy:0,
    ax:0,ay:0,
    r:25 + Math.random()*60
  });
}

let p = {x:innerWidth/2,y:innerHeight/2};

addEventListener("mousemove",e=>{
  p.x=e.clientX;
  p.y=e.clientY;
});

addEventListener("touchmove",e=>{
  const t=e.touches[0];
  p.x=t.clientX;
  p.y=t.clientY;
});

/* ================= WATER ================= */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation="lighter";

  for(let i=0;i<blobs.length;i++){
    let b = blobs[i];

    let dx = p.x - b.x;
    let dy = p.y - b.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    /* 🌊 мягкое притяжение */
    if(dist < 950){
      let f = (1 - dist/950) * 0.006;
      b.ax += dx * f;
      b.ay += dy * f;
    }

    /* хаотичное движение */
    b.ax += Math.sin(Date.now()*0.001 + i) * 0.003;
    b.ay += Math.cos(Date.now()*0.001 + i) * 0.003;

    /* 🌐 СЛИЯНИЕ + РАЗЛИПАНИЕ (главное исправление) */
    for(let j=0;j<blobs.length;j++){
      if(i===j) continue;

      let o = blobs[j];
      let dx2 = o.x - b.x;
      let dy2 = o.y - b.y;
      let d2 = Math.sqrt(dx2*dx2 + dy2*dy2);

      if(d2 < 520){
        let k = (1 - d2/520);

        /* ✨ эффект СЛИЯНИЯ (свет в центре) */
        b.ax += dx2 * k * 0.0025;
        b.ay += dy2 * k * 0.0025;

        /* ❌ разлипание (чтобы не слипались навсегда) */
        b.ax -= dx2 * k * 0.0022;
        b.ay -= dy2 * k * 0.0022;
      }
    }

    /* 🧈 инерция */
    b.vx = (b.vx + b.ax) * 0.88;
    b.vy = (b.vy + b.ay) * 0.88;

    b.x += b.vx;
    b.y += b.vy;

    b.ax *= 0.5;
    b.ay *= 0.5;

    /* 💧 ЖИВОЕ СИЯНИЕ (без контуров) */
    let g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    let a = b.r > 300 ? 0.45 : b.r > 100 ? 0.25 : 0.12;

    g.addColorStop(0,"rgba(255,255,255,"+a+")"); // 💡 центр слияния
    g.addColorStop(0.3,"rgba(167,139,250,"+(a*0.8)+")");
    g.addColorStop(0.7,"rgba(139,92,246,"+(a*0.5)+")");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.ellipse(
      b.x,
      b.y,
      b.r,
      b.r*0.75,
      Math.sin(i + Date.now()*0.001)*0.2,
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
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("text").textContent = d.text;
}
load();
setInterval(load,1000);

/* ADMIN */
adminBtn.onclick=async()=>{
  const pass=prompt("пароль");
  if(pass!=="4724")return;

  const text=prompt("текст");
  const type=prompt("1-сек 2-мин 3-час");

  let mult=1000;
  if(type==="2")mult=60000;
  if(type==="3")mult=3600000;

  const val=prompt("число");

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
