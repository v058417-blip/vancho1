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
  padding:0;
  overflow:hidden;
  height:100%;
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
}

/* стекло */
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
  border-radius:16px;
  border:1px solid rgba(255,255,255,0.12);
  color:white;
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

/* 🌊 БАЛАНС: большие + средние + маленькие */
let blobs = [];

// 💜 большие (фоновые массы)
for(let i=0;i<4;i++){
  blobs.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    vx:(Math.random()-0.5)*0.3,
    vy:(Math.random()-0.5)*0.3,
    r:320 + Math.random()*250
  });
}

// 🌫 средние
for(let i=0;i<5;i++){
  blobs.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    vx:(Math.random()-0.5)*0.5,
    vy:(Math.random()-0.5)*0.5,
    r:140 + Math.random()*120
  });
}

// ✨ мелкие
for(let i=0;i<6;i++){
  blobs.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    vx:(Math.random()-0.5)*0.8,
    vy:(Math.random()-0.5)*0.8,
    r:40 + Math.random()*60
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

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation="lighter";

  for(let b of blobs){

    // 🌊 лёгкое самодвижение
    b.vx += Math.sin(Date.now()*0.001)*0.01;
    b.vy += Math.cos(Date.now()*0.001)*0.01;

    // 👆 только ПРИТЯЖЕНИЕ к пальцу (без сцепления между собой)
    let dx = pointer.x - b.x;
    let dy = pointer.y - b.y;
    let d = Math.sqrt(dx*dx + dy*dy);

    if(d < 700){
      let f = (1 - d/700)*0.03;
      b.vx += dx*f*0.01;
      b.vy += dy*f*0.01;
    }

    // 🧈 плавность
    b.vx *= 0.92;
    b.vy *= 0.92;

    b.x += b.vx;
    b.y += b.vy;

    // 💧 рисование
    let g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    g.addColorStop(0,"rgba(139,92,246,0.55)");
    g.addColorStop(0.5,"rgba(99,102,241,0.2)");
    g.addColorStop(1,"transparent");

    ctx.fillStyle=g;

    ctx.beginPath();
    ctx.ellipse(
      b.x,
      b.y,
      b.r,
      b.r*0.75,
      0,
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
  let r=await fetch("/state");
  let d=await r.json();
  document.getElementById("text").textContent=d.text;
}
load();
setInterval(load,1000);

/* админка */
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
