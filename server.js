const express = require("express");
const app = express();

app.use(express.json());

let state = {
  mode: "auto",
  text: Math.random() > 0.5 ? "натурал" : "гомосек",
  until: null
};

// логика
setInterval(() => {
  const now = Date.now();

  if (state.mode === "manual") {
    if (now >= state.until) {
      state.mode = "auto";
      state.text = Math.random() > 0.5 ? "натурал" : "гомосек";
    }
  } else {
    if (Math.random() < 0.05) {
      state.text = Math.random() > 0.5 ? "натурал" : "гомосек";
    }
  }
}, 1000);

// API
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  const { text, ms } = req.body;

  state.mode = "manual";
  state.text = text;
  state.until = Date.now() + ms;

  res.json({ ok: true });
});

// САЙТ
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
  background:#0b1020;
  font-family:Arial;
  color:white;
}

/* текст */
h1{
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%,-50%);
  font-size:40px;
  z-index:2;
}

span{
  color:#a78bfa;
}

/* кнопка */
#btn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.1);
  z-index:3;
}

/* canvas */
canvas{
  position:fixed;
  top:0;
  left:0;
}
</style>
</head>

<body>

<canvas id="c"></canvas>
<div id="btn"></div>

<h1>сейчас Ваня <span id="t">...</span></h1>

<script>
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
onresize = resize;

/* 💜 ФИОЛЕТОВЫЕ "ЖИВЫЕ ПЯТНА" */
let blobs = Array.from({length:5}, () => ({
  x: Math.random()*innerWidth,
  y: Math.random()*innerHeight,
  vx:(Math.random()-0.5)*0.3,
  vy:(Math.random()-0.5)*0.3,
  r:200 + Math.random()*150
}));

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  blobs.forEach(b=>{
    b.x += b.vx;
    b.y += b.vy;

    // мягкое движение
    b.vx += (Math.random()-0.5)*0.01;
    b.vy += (Math.random()-0.5)*0.01;

    b.vx *= 0.99;
    b.vy *= 0.99;

    const g = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0,"rgba(139,92,246,0.35)");
    g.addColorStop(0.5,"rgba(99,102,241,0.25)");
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
  try{
    const r = await fetch("/state");
    const d = await r.json();
    document.getElementById("t").textContent = d.text;
  }catch{
    document.getElementById("t").textContent = "ошибка";
  }
}
load();
setInterval(load,1000);

/* админка */
btn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("текст");
  const sec = prompt("секунды");

  const ms = Number(sec) * 1000;

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

app.listen(3000, () => console.log("OK"));
