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
    state.nextChange = now + randomInterval();
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
  padding:0;
  overflow:hidden;
  height:100%;
  font-family:Arial;
}

/* 🌌 фон как у тебя */
body{
  background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1020 60%, #050816);
}

/* canvas */
canvas{
  position:fixed;
  top:0;
  left:0;
  z-index:0;
}

/* 💎 стекло (увеличенное) */
.glass{
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  border:1px solid rgba(255,255,255,0.10);
  border-radius:28px;

  padding:32px 80px;

  box-shadow:
    0 20px 60px rgba(0,0,0,0.55),
    inset 0 0 25px rgba(255,255,255,0.05);
}

/* текст */
h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  color:#e0e7ff;
  font-size:44px;
  z-index:2;

  text-shadow:
    0 0 12px rgba(167,139,250,0.35),
    0 0 30px rgba(139,92,246,0.2);
}

span{
  color:#a78bfa;
}

/* ❤️ кнопка */
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

  color:rgba(255,255,255,0.9);

  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);

  border:1px solid rgba(255,255,255,0.12);
  border-radius:16px;

  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
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

/* 🌊 ЖИДКОСТЬ (исправленная — НЕ убегает, а тянется) */
let blobs = Array.from({length:9}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:0,
  vy:0,
  ax:0,
  ay:0,
  r:200 + Math.random()*180   // 👈 БОЛЬШЕ РАЗМЕР
}));

let pointer = {x: innerWidth/2, y: innerHeight/2};

window.addEventListener("mousemove",e=>{
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("touchmove",e=>{
  const t = e.touches[0];
  pointer.x = t.clientX;
  pointer.y = t.clientY;
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.globalCompositeOperation = "lighter";

  for(let i=0;i<blobs.length;i++){
    let b = blobs[i];

    // 🌊 внутреннее течение
    b.ax += Math.sin(Date.now()*0.001 + i)*0.02;
    b.ay += Math.cos(Date.now()*0.001 + i)*0.02;

    // 👆 ПРИТЯЖЕНИЕ к пальцу (НЕ ОТТАЛКИВАНИЕ)
    let dx = pointer.x - b.x;
    let dy = pointer.y - b.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    if(dist < 600){
      let force = (1 - dist/600)*0.05;
      b.ax += dx * force * 0.02;
      b.ay += dy * force * 0.02;
    }

    // 🌐 слияние массы
    for(let j=0;j<blobs.length;j++){
      if(i===j) continue;

      let b2 = blobs[j];
      let dx2 = b2.x - b.x;
      let dy2 = b2.y - b.y;
      let d2 = Math.sqrt(dx2*dx2 + dy2*dy2);

      if(d2 < 240){
        let f = (1 - d2/240)*0.02;
        b.ax += dx2 * f;
        b.ay += dy2 * f;
      }
    }

    // 🧈 вязкость
    b.vx = (b.vx + b.ax) * 0.88;
    b.vy = (b.vy + b.ay) * 0.88;

    b.x += b.vx;
    b.y += b.vy;

    b.ax *= 0.6;
    b.ay *= 0.6;

    // 💧 форма жидкости
    let wobble = Math.sin(Date.now()*0.002 + i)*0.5;

    let g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0,"rgba(139,92,246,0.6)");
    g.addColorStop(0.4,"rgba(99,102,241,0.25)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.ellipse(
      b.x + Math.sin(i)*12,
      b.y + Math.cos(i)*12,
      b.r * (1 + wobble*0.15),
      b.r * (0.75 - wobble*0.15),
      wobble,
      0,
      Math.PI*2
    );
    ctx.fill();
  }

  requestAnimationFrame(draw);
}
draw();

/* текст */
async function load(){
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("text").textContent = d.text;
}
load();
setInterval(load,1000);

/* админка */
adminBtn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("текст");
  const type = prompt("1-сек 2-мин 3-час");

  let mult = 1000;
  if(type==="2") mult = 60000;
  if(type==="3") mult = 3600000;

  const val = prompt("число");

  await fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text, ms:Number(val)*mult})
  });

  load();
};
</script>

</body>
</html>
  `);
});

app.listen(3000, () => console.log("RUNNING"));
