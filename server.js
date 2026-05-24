const express = require("express");
const fs = require("fs");

const app = express();
app.use(express.json());

const FILE = "/tmp/state.json";

const variants = [
  "со мной не дружит",
  "что ты тут делаешь?"
];

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

updateState();
saveState(state);

setInterval(updateState, 1000);

// API
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  const { text, ms } = req.body;

  state.mode = "manual";
  state.text = text;

  state.until =
    Date.now() + Math.max(1000, Number(ms) || 0);

  state.nextChange =
    state.until + randomInterval();

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
  background:
    radial-gradient(
      circle at 30% 30%,
      #120a2a,
      #070812 60%,
      #04040a
    );
}

canvas{
  position:fixed;
  inset:0;
}

/* ===== LIQUID GLASS ===== */

.glass{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);

  width:min(80vw,920px);

  padding:36px 80px;

  border-radius:32px;

  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.10),
    rgba(255,255,255,0.02)
  );

  backdrop-filter: blur(30px) saturate(140%);
  -webkit-backdrop-filter: blur(30px) saturate(140%);

  border:1px solid rgba(255,255,255,0.18);

  box-shadow:
    0 8px 40px rgba(0,0,0,0.45);

  overflow:hidden;
  isolation:isolate;

  transform:
    translate(-50%,-50%)
    translateZ(0);

  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

.glass::before{
  content:"";
  position:absolute;
  inset:0;

  border-radius:inherit;

  background:
    radial-gradient(
      circle at 30% 20%,
      rgba(255,255,255,0.22),
      transparent 60%
    );

  opacity:0.5;

  pointer-events:none;
}

h1{
  margin:0;
  color:#e0e7ff;
  font-size:78px;
}

span{
  color:#a78bfa;
}

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

  background:
    rgba(167,139,250,0.15);

  backdrop-filter: blur(18px);

  border-radius:16px;

  border:
    1px solid rgba(167,139,250,0.35);

  color:#a78bfa;
}

@media (max-width:700px){

  .glass{
    width:85vw;
    padding:28px 30px;
  }

  h1{
    font-size:42px;
    line-height:1.15;
  }

}
</style>
</head>

<body>

<canvas id="c"></canvas>

<div id="adminBtn">❤️</div>

<div class="glass">
  <h1>
    сейчас Ваня
    <span id="text">...</span>
  </h1>
</div>

<script>
const c = document.getElementById("c");
const ctx = c.getContext("2d");

const isMobile =
  /Mobi|Android/i.test(navigator.userAgent);

function resize(){
  c.width = innerWidth;
  c.height = innerHeight;
}

resize();

addEventListener("resize", resize);

let blobs = [];

const count = isMobile ? 14 : 18;

for(let i=0;i<count;i++){

  blobs.push({
    x: Math.random()*innerWidth,
    y: Math.random()*innerHeight,

    vx:(Math.random()-0.5)*1.6,
    vy:(Math.random()-0.5)*1.6,

    ax:0,
    ay:0,

    r: isMobile
      ? (220 + Math.random()*260)
      : (260 + Math.random()*340)
  });

}

let p = {
  x:innerWidth/2,
  y:innerHeight/2
};

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
  return Math.sin(x*0.002+t)
    * Math.cos(y*0.002-t);
}

function boundary(b){

  let m=120;
  let s=0.003;

  if(b.x<m)
    b.ax+=(m-b.x)*s;

  if(b.x>innerWidth-m)
    b.ax-=(b.x-(innerWidth-m))*s;

  if(b.y<m)
    b.ay+=(m-b.y)*s;

  if(b.y>innerHeight-m)
    b.ay-=(b.y-(innerHeight-m))*s;
}

function draw(){

  ctx.clearRect(0,0,c.width,c.height);

  ctx.globalCompositeOperation="lighter";

  let t=Date.now()*0.001;

  ctx.filter =
    isMobile
      ? "blur(30px)"
      : "blur(40px)";

  for(let i=0;i<blobs.length;i++){

    let b=blobs[i];

    b.ax+=flow(b.x,b.y,t)*0.3;
    b.ay+=flow(b.y,b.x,t)*0.3;

    let dx=p.x-b.x;
    let dy=p.y-b.y;

    let d=Math.sqrt(dx*dx+dy*dy);

    // 👇 СЛАБОЕ ПРИТЯЖЕНИЕ
    if(d<900){

      let f=(1-d/900)*0.0007;

      b.ax+=dx*f;
      b.ay+=dy*f;
    }

    boundary(b);

    // 👇 ОТТАЛКИВАНИЕ МЕЖДУ BLOBS
    for(let j=0;j<blobs.length;j++){

      if(i===j) continue;

      let o = blobs[j];

      let dx2 = b.x - o.x;
      let dy2 = b.y - o.y;

      let dist =
        Math.sqrt(dx2*dx2 + dy2*dy2);

      let minDist =
        (b.r + o.r) * 0.35;

      if(dist < minDist){

        let force =
          (1 - dist/minDist) * 0.003;

        b.ax += dx2 * force;
        b.ay += dy2 * force;
      }
    }

    // 👇 БОЛЕЕ ЖИДКАЯ ИНЕРЦИЯ
    b.vx=(b.vx+b.ax)*0.985;
    b.vy=(b.vy+b.ay)*0.985;

    b.x+=b.vx;
    b.y+=b.vy;

    b.ax*=0.5;
    b.ay*=0.5;

    let hue =
      280 + Math.sin(t*0.1 + i)*40;

    let g =
      ctx.createRadialGradient(
        b.x,b.y,0,
        b.x,b.y,b.r
      );

    g.addColorStop(
      0,
      "hsla(" + hue + ", 80%, 75%, 0.30)"
    );

    g.addColorStop(
      0.5,
      "hsla(" + (hue+20) + ", 70%, 70%, 0.15)"
    );

    g.addColorStop(
      1,
      "rgba(5,8,22,0)"
    );

    ctx.fillStyle = g;

    ctx.beginPath();

    ctx.arc(
      b.x,
      b.y,
      b.r,
      0,
      Math.PI*2
    );

    ctx.fill();
  }

  requestAnimationFrame(draw);
}

draw();

async function load(){

  let r = await fetch("/state");
  let d = await r.json();

  document.getElementById("text")
    .textContent = d.text;
}

load();

setInterval(load,1000);

adminBtn.onclick = async ()=>{

  let pass = prompt("пароль");

  if(pass !== "4724")
    return;

  let text = prompt("текст");

  let type =
    prompt("1-сек 2-мин 3-час");

  let mult = 1000;

  if(type==="2")
    mult=60000;

  if(type==="3")
    mult=3600000;

  let val = prompt("число");

  await fetch("/update",{
    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      text,
      ms:Number(val)*mult
    })
  });

  load();
};
</script>

</body>
</html>
`);
});

app.listen(3000, () => {
  console.log("RUNNING");
});
