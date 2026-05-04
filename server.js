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

// ===== STATE =====
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
  if (state.mode === "manual") {
    if (Date.now() > state.until) {
      state.mode = "auto";
      state.index = Math.floor(Math.random() * 2);
      state.text = variants[state.index];
      state.nextChange = Date.now() + randomInterval();
    }
  }

  if (state.mode === "auto" && Date.now() > state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = Date.now() + randomInterval();
  }

  saveState(state);
}

setInterval(updateState, 5000);

// ===== API =====
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

// ===== FRONT =====
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
  background:#020617;
  font-family:Arial;
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
  color:white;
  font-size:48px;
  padding:30px 50px;
  border-radius:30px;

  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(40px);

  border:1px solid rgba(255,255,255,0.1);

  box-shadow:
    inset 0 0 60px rgba(124,58,237,0.15),
    0 20px 60px rgba(0,0,0,0.7);
}

span{
  font-family:cursive;
  color:#c4b5fd;
}

#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.1);
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

// 🔥 метаболлы
let blobs = Array.from({length:7}, () => ({
  x: Math.random()*canvas.width,
  y: Math.random()*canvas.height,
  r: 150 + Math.random()*200,
  dx: (Math.random()-0.5)*1.2,
  dy: (Math.random()-0.5)*1.2
}));

function draw(){
  const w = canvas.width;
  const h = canvas.height;

  const image = ctx.createImageData(w, h);
  const data = image.data;

  for(let y=0;y<h;y+=2){
    for(let x=0;x<w;x+=2){

      let sum = 0;

      blobs.forEach(b=>{
        const dx = x - b.x;
        const dy = y - b.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        sum += b.r / d;
      });

      const i = (y*w + x) * 4;

      if(sum > 1){
        data[i] = 124;
        data[i+1] = 58;
        data[i+2] = 237;
        data[i+3] = 180;
      }
    }
  }

  ctx.putImageData(image,0,0);

  blobs.forEach(b=>{
    b.x += b.dx;
    b.y += b.dy;

    if(b.x<0||b.x>w) b.dx*=-1;
    if(b.y<0||b.y>h) b.dy*=-1;
  });

  requestAnimationFrame(draw);
}

draw();

// данные
async function load(){
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("text").textContent = d.text;
}
load();
setInterval(load,2000);

// админка
adminBtn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("текст");
  const sec = prompt("секунды");

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
app.listen(PORT, () => console.log("LIQUID SYSTEM RUNNING"));
