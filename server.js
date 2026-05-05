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
      saveState(state);
      return;
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
  updateState();
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
body{
  margin:0;
  overflow:hidden;
  font-family:Arial;
  background: radial-gradient(circle at 30% 30%, #1e1b4b, #0b1020 60%, #050816);
}

/* canvas */
canvas{
  position:fixed;
  top:0;
  left:0;
}

/* 💎 стекло (как iOS) */
.glass{
  backdrop-filter: blur(25px) saturate(160%);
  background: rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:
    inset 0 0 30px rgba(255,255,255,0.08),
    0 10px 40px rgba(0,0,0,0.6);
}

/* текст */
h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  color:#e0e7ff;
  font-size:48px;
  padding:30px 50px;
  border-radius:25px;
}

span{
  color:#a78bfa;
}

/* ❤️ кнопка */
#adminBtn{
  position:fixed;
  top:15px;
  left:15px;
  width:55px;
  height:55px;
  border-radius:15px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:22px;
  cursor:pointer;
}
</style>
</head>

<body>

<canvas id="c"></canvas>

<div id="adminBtn" class="glass">❤️</div>

<h1 class="glass">
  сейчас Ваня <span id="text">...</span>
</h1>

<script>
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
onresize = resize;

// 🌊 ЖИВАЯ ВОДА (реально плавная)
let blobs = Array.from({length:7}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.6,
  vy:(Math.random()-0.5)*0.6,
  r:250 + Math.random()*150
}));

let pointer = {x:null,y:null};

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  blobs.forEach(b=>{

    // движение
    b.vx += (Math.random()-0.5)*0.03;
    b.vy += (Math.random()-0.5)*0.03;

    // 👆 реакция на касание (деформация)
    if(pointer.x !== null){
      const dx = pointer.x - b.x;
      const dy = pointer.y - b.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if(dist < 300){
        b.vx += dx * 0.001;
        b.vy += dy * 0.001;
      }
    }

    b.vx *= 0.97;
    b.vy *= 0.97;

    b.x += b.vx;
    b.y += b.vy;

    const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    g.addColorStop(0,"rgba(139,92,246,0.45)");
    g.addColorStop(0.4,"rgba(99,102,241,0.30)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}
animate();

// 👆 мышь / тач
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
setInterval(load,1000);

// админка
adminBtn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("текст");

  const choice = prompt("1 - сек\\n2 - мин\\n3 - часы");

  let mult = 1000;
  if(choice === "2") mult = 60000;
  if(choice === "3") mult = 3600000;

  const value = prompt("число");

  const ms = Number(value) * mult;

  await fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text, ms})
  });

  load();
};
</script>

</body>
</html>
  `);
});

app.listen(3000, () => console.log("RUNNING"));
