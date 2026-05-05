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
html, body{
  margin:0;
  padding:0;
  overflow:hidden;
  height:100%;
  font-family:Arial;
}

/* 🌌 стабильный фон */
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

/* 💎 стекло (УВЕЛИЧЕНО как ты хотела) */
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

/* 🌊 ЖИДКОСТЬ (metaballs + вязкость) */
let blobs = Array.from({length:9}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.4,
  vy:(Math.random()-0.5)*0.4,
  ax:0,
  ay:0,
  r:140 + Math.random()*130
}));

let pointer = null;

window.addEventListener("mousemove",e=>{
  pointer = {x:e.clientX,y:e.clientY};
});

window.addEventListener("touchmove",e=>{
  const t = e.touches[0];
  pointer = {x:t.clientX,y:t.clientY};
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.globalCompositeOperation = "lighter";

  for(let i=0;i<blobs.length;i++){
    let b = blobs[i];

    // инерция
    b.vx += b.ax;
    b.vy += b.ay;

    b.vx *= 0.92;
    b.vy *= 0.92;

    b.ax *= 0.85;
    b.ay *= 0.85;

    // самодвижение жидкости
    b.ax += Math.sin(Date.now()*0.001 + i)*0.02;
    b.ay += Math.cos(Date.now()*0.001 + i)*0.02;

    // палец тянет жидкость
    if(pointer){
      let dx = pointer.x - b.x;
      let dy = pointer.y - b.y;
      let dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < 260){
        let f = (1 - dist/260)*0.05;
        b.ax += dx * f * 0.02;
        b.ay += dy * f * 0.02;
      }
    }

    // слияние жидкости
    for(let j=0;j<blobs.length;j++){
      if(i===j) continue;

      let b2 = blobs[j];
      let dx = b2.x - b.x;
      let dy = b2.y - b.y;
      let dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < 190){
        let f = (1 - dist/190)*0.02;
        b.ax += dx * f;
        b.ay += dy * f;
      }
    }

    b.x += b.vx;
    b.y += b.vy;

    // 💧 НЕ КРУГ — ЖЕЛЕ-ФОРМА
    let g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    g.addColorStop(0,"rgba(139,92,246,0.55)");
    g.addColorStop(0.5,"rgba(99,102,241,0.25)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;

    let wobble = Math.sin(Date.now()*0.002 + i)*0.5;

    ctx.beginPath();
    ctx.ellipse(
      b.x + Math.sin(i)*10,
      b.y + Math.cos(i)*10,
      b.r * (1 + wobble*0.15),
      b.r * (0.7 - wobble*0.15),
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
