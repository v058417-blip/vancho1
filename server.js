const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const FILE = path.join(__dirname, "state.json");

const variants = ["натурал", "гомосек"];

const MIN_MS = 60000;
const MAX_MS = 3 * 24 * 60 * 60 * 1000;

function randomInterval() {
  return Math.floor(Math.random() * (MAX_MS - MIN_MS)) + MIN_MS;
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {
      mode: "auto",
      index: Math.floor(Math.random() * 2),
      text: variants[Math.floor(Math.random() * 2)],
      nextChange: Date.now() + randomInterval(),
      until: null
    };
  }
}

function saveState(s) {
  fs.writeFileSync(FILE, JSON.stringify(s));
}

let state = loadState();

function updateState() {
  if (state.mode === "manual" && Date.now() > state.until) {
    state.mode = "auto";
    state.index = Math.floor(Math.random() * 2);
    state.text = variants[state.index];
    state.nextChange = Date.now() + randomInterval();
  }

  if (state.mode === "auto" && Date.now() > state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = Date.now() + randomInterval();
  }

  saveState(state);
}

setInterval(updateState, 5000);

// API
app.get("/state", (req, res) => {
  updateState();
  res.json(state);
});

app.post("/update", (req, res) => {
  const { text, seconds } = req.body;

  state.mode = "manual";
  state.text = text;
  state.until = Date.now() + Number(seconds) * 1000;

  saveState(state);

  res.json({ ok: true });
});

// FRONTEND
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Liquid</title>

<style>
body{
  margin:0;
  overflow:hidden;
  font-family:Arial;

  /* 🌌 глубокий сине-фиолетовый фон */
  background: radial-gradient(circle at 30% 20%, #1e1b4b, #0b1020 60%, #050816);
}

canvas{
  position:absolute;
  top:0;
  left:0;
}

/* 💎 стекло */
h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  color:#e0e7ff;
  font-size:48px;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(30px);

  border:1px solid rgba(255,255,255,0.08);

  box-shadow:
    inset 0 0 60px rgba(124,58,237,0.15),
    0 20px 60px rgba(0,0,0,0.7);
}

span{
  font-family:cursive;
  color:#a78bfa;
}

/* админ кнопка */
#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.08);
  border-radius:10px;
  cursor:pointer;
}
</style>
</head>

<body>

<canvas id="c"></canvas>
<div id="adminBtn"></div>

<h1>сейчас Ваня <span id="text">...</span></h1>

<script>
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
onresize = resize;

// 🌊 крупная “жидкость”
let blobs = Array.from({length:6}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.4,
  vy:(Math.random()-0.5)*0.4,
  r:220 + Math.random()*180
}));

let pointer = {x:null,y:null};

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  blobs.forEach(b=>{

    // плавное самостоятельное движение
    b.vx += (Math.random()-0.5)*0.015;
    b.vy += (Math.random()-0.5)*0.015;

    // реакция на касание
    if(pointer.x !== null){
      const dx = pointer.x - b.x;
      const dy = pointer.y - b.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < 350){
        b.vx += dx * 0.0007;
        b.vy += dy * 0.0007;
      }
    }

    b.vx *= 0.985;
    b.vy *= 0.985;

    b.x += b.vx;
    b.y += b.vy;

    const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0,"rgba(99,102,241,0.35)");
    g.addColorStop(0.4,"rgba(124,58,237,0.25)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}
animate();

// управление
window.addEventListener("mousemove",e=>{
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("touchmove",e=>{
  const t = e.touches[0];
  pointer.x = t.clientX;
  pointer.y = t.clientY;
});

// текст
async function load(){
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("text").textContent = d.text;
}
load();
setInterval(load,2000);

// 🧩 админка (простая как ты просила)
adminBtn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("введи текст");
  const sec = prompt("время в секундах");

  await fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text, seconds:sec})
  });

  load();
};
</script>

</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("RUNNING"));
