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

function createState() {
  const index = Math.random() < 0.5 ? 0 : 1;

  return {
    mode: "auto",
    index,
    text: variants[index],
    nextChange: Date.now() + randomInterval(),
    until: null
  };
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    const s = createState();
    fs.writeFileSync(FILE, JSON.stringify(s));
    return s;
  }
}

function saveState(s) {
  fs.writeFileSync(FILE, JSON.stringify(s));
}

let state = loadState();
saveState(state);

function updateState() {
  const now = Date.now();

  if (state.mode === "manual") {
    if (state.until && now >= state.until) {
      state = createState();
      saveState(state);
    }
    return;
  }

  if (now >= state.nextChange) {
    state.index = state.index === 0 ? 1 : 0;
    state.text = variants[state.index];
    state.nextChange = now + randomInterval();
    saveState(state);
  }
}

setInterval(updateState, 1000);

// API
app.get("/state", (req, res) => res.json(state));

app.post("/update", (req, res) => {
  const { text, ms } = req.body;

  state.mode = "manual";
  state.text = text;
  state.until = Date.now() + Math.max(1000, Number(ms) || 0);

  saveState(state);
  res.json({ ok: true });
});

// FRONT
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
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

.glass{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  width:min(80vw,920px);
  padding:36px 80px;
  border-radius:32px;

  background: linear-gradient(135deg,
    rgba(255,255,255,0.10),
    rgba(255,255,255,0.02)
  );

  backdrop-filter: blur(30px) saturate(140%);
  -webkit-backdrop-filter: blur(30px) saturate(140%);

  border:1px solid rgba(255,255,255,0.18);

  box-shadow:
    0 8px 40px rgba(0,0,0,0.45),
    inset 0 1px 1px rgba(255,255,255,0.25),
    inset 0 -2px 12px rgba(167,139,250,0.25);

  overflow:hidden;
}

.glass::before{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 60%);
  opacity:0.6;
  pointer-events:none;
  animation: shine 6s ease-in-out infinite;
}

.glass::after{
  content:"";
  position:absolute;
  inset:0;
  background: linear-gradient(to bottom,
    rgba(255,255,255,0.15),
    transparent 40%,
    rgba(0,0,0,0.25)
  );
  opacity:0.5;
  pointer-events:none;
}

@keyframes shine{
  0%,100%{ transform: translateX(0); }
  50%{ transform: translateX(40px); }
}

h1{
  margin:0;
  color:#e0e7ff;
  font-size:78px;
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

  background: rgba(167,139,250,0.15);
  backdrop-filter: blur(18px);
  border-radius:16px;
  border:1px solid rgba(167,139,250,0.35);
  color:#a78bfa;
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
const c = document.getElementById("c");
const ctx = c.getContext("2d");
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

function resize(){
  c.width = innerWidth;
  c.height = innerHeight;
}
resize();
addEventListener("resize", resize);

let blobs = [];
const count = isMobile ? 6 : 10;

for(let i=0;i<count;i++){
  blobs.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,
    vx:(Math.random()-0.5)*1.2,
    vy:(Math.random()-0.5)*1.2,
    ax:0,
    ay:0,
    r: isMobile ? (140 + Math.random()*220) : (180 + Math.random()*320)
  });
}

let p = {x:innerWidth/2, y:innerHeight/2};

addEventListener("mousemove", e=>{
  p.x = e.clientX;
  p.y = e.clientY;
});

addEventListener("touchmove", e=>{
  let t = e.touches[0];
  p.x = t.clientX;
  p.y = t.clientY;
});

function flow(x,y,t){
  return Math.sin(x*0.003+t)*Math.cos(y*0.003-t);
}

function boundary(b){
  let m=120, s=0.003;

  if(b.x<m) b.ax+=(m-b.x)*s;
  if(b.x>innerWidth-m) b.ax-=(b.x-(innerWidth-m))*s;

  if(b.y<m) b.ay+=(m-b.y)*s;
  if(b.y>innerHeight-m) b.ay-=(b.y-(innerHeight-m))*s;
}

function draw(){
  ctx.clearRect(0,0,c.width,c.height);
  ctx.globalCompositeOperation="lighter";

  let t=Date.now()*0.001;

  for(let i=0;i<blobs.length;i++){
    let b=blobs[i];

    b.ax+=flow(b.x,b.y,t)*0.4;
    b.ay+=flow(b.y,b.x,t)*0.4;

    let dx=p.x-b.x, dy=p.y-b.y;
    let d=Math.sqrt(dx*dx+dy*dy);

    if(d<900){
      let f=(1-d/900)*0.002;
      b.ax+=dx*f;
      b.ay+=dy*f;
    }

    for(let j=0;j<blobs.length;j+=isMobile?2:1){
      if(i===j) continue;
      let o=blobs[j];
      let dx2=b.x-o.x, dy2=b.y-o.y;
      let dist=Math.sqrt(dx2*dx2+dy2*dy2);

      if(dist<260){
        let k=(1-dist/260);
        b.ax+=dx2*k*0.02;
        b.ay+=dy2*k*0.02;
      }
    }

    boundary(b);

    b.vx=(b.vx+b.ax)*0.9;
    b.vy=(b.vy+b.ay)*0.9;

    b.x+=b.vx;
    b.y+=b.vy;

    b.ax*=0.5;
    b.ay*=0.5;

    let g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);

    g.addColorStop(0,"rgba(196,181,253,0.28)");
    g.addColorStop(0.35,"rgba(167,139,250,0.25)");
    g.addColorStop(0.75,"rgba(139,92,246,0.12)");
    g.addColorStop(1,"rgba(5,8,22,0)");

    ctx.fillStyle=g;

    ctx.beginPath();

let points = isMobile ? 18 : 24;

let prevX, prevY;

for (let k = 0; k <= points + 2; k++) {
  let a = (k / points) * Math.PI * 2;

  let noise =
    Math.sin(a * 3 + t + i) * 0.18 +
    Math.cos(a * 5 + t * 0.7) * 0.12;

  let r = b.r * (1 + noise);

  let x = b.x + Math.cos(a) * r;
  let y = b.y + Math.sin(a) * r * 0.75;

  if (k === 0) {
    ctx.moveTo(x, y);
  } else {
    // сглаживание вместо рваных линий
    let cx = (prevX + x) / 2;
    let cy = (prevY + y) / 2;
    ctx.quadraticCurveTo(prevX, prevY, cx, cy);
  }

  prevX = x;
  prevY = y;
}

ctx.closePath();
ctx.fill();
  }

  requestAnimationFrame(draw);
}
draw();

async function load(){
  let r=await fetch("/state");
  let d=await r.json();
  document.getElementById("text").textContent=d.text;
}

load();
setInterval(load,1000);

adminBtn.onclick=async()=>{
  let pass=prompt("пароль");
  if(pass!=="4724") return;

  let text=prompt("текст");
  let type=prompt("1-сек 2-мин 3-час");

  let mult=1000;
  if(type==="2") mult=60000;
  if(type==="3") mult=3600000;

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
