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

/* 🔥 ФОН (ЖЁСТКО ЗАФИКСИРОВАН, БЕЗ БЕЛИЗНЫ) */
body{
  background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1020 65%, #050816);
}

/* canvas НЕ влияет на фон */
canvas{
  position:fixed;
  top:0;
  left:0;
  z-index:0;
  pointer-events:none;
}

/* текст */
h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  font-size:42px;
  color:#e0e7ff;
  z-index:2;
}

span{
  color:#a78bfa;
}

/* 💎 стекло (без выбеливания!) */
.glass{
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius:20px;
  box-shadow:
    inset 0 0 25px rgba(255,255,255,0.05),
    0 10px 40px rgba(0,0,0,0.6);
}

/* ❤️ кнопка стеклянная */
#adminBtn{
  position:fixed;
  top:15px;
  left:15px;
  width:55px;
  height:55px;

  display:flex;
  align-items:center;
  justify-content:center;

  font-size:22px;
  cursor:pointer;

  color:rgba(255,255,255,0.85);

  /* стекло */
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  border:1px solid rgba(255,255,255,0.15);
  border-radius:16px;

  box-shadow:
    inset 0 0 20px rgba(255,255,255,0.08),
    0 10px 30px rgba(0,0,0,0.5);
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

/* 🌊 ЖИВАЯ ВОДА (оставлена, но НЕ ломает фон) */
let blobs = Array.from({length:6}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.5,
  vy:(Math.random()-0.5)*0.5,
  r:220 + Math.random()*120
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

  blobs.forEach(b=>{

    b.x += b.vx;
    b.y += b.vy;

    b.vx += (Math.random()-0.5)*0.03;
    b.vy += (Math.random()-0.5)*0.03;

    b.vx *= 0.98;
    b.vy *= 0.98;

    if(pointer){
      let dx = pointer.x - b.x;
      let dy = pointer.y - b.y;
      let d = Math.sqrt(dx*dx + dy*dy);

      if(d < 220){
        b.vx -= dx * 0.002;
        b.vy -= dy * 0.002;
      }
    }

    const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0,"rgba(139,92,246,0.40)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
  });

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
