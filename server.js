const express = require("express");
const app = express();

app.use(express.json());

// 2 состояния
const variants = ["натурал", "гомосек"];

// умный интервал
const MIN_MS = 60 * 1000;
const MAX_MS = 3 * 24 * 60 * 60 * 1000;

let state = {
  index: 0,
  text: variants[0],
  nextChange: Date.now() + randomInterval(),
  updatedAt: Date.now()
};

function randomInterval() {
  return Math.floor(Math.random() * (MAX_MS - MIN_MS)) + MIN_MS;
}

function toggleState() {
  state.index = state.index === 0 ? 1 : 0;

  state = {
    ...state,
    text: variants[state.index],
    nextChange: Date.now() + randomInterval(),
    updatedAt: Date.now()
  };

  console.log("AUTO TOGGLE →", state.text);
}

setInterval(() => {
  if (Date.now() > state.nextChange) toggleState();
}, 10000);

// API
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  if (req.body.text && variants.includes(req.body.text)) {
    state.index = variants.indexOf(req.body.text);
  }

  state = {
    ...state,
    text: variants[state.index],
    nextChange: Date.now() + randomInterval(),
    updatedAt: Date.now()
  };

  res.json({ ok: true, state });
});

// сайт
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Сейчас Ваня</title>

<style>
body{
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family: Arial;
  overflow:hidden;
  background:#eaf2ff;
}

/* 💧 "капли света" */
body::before,
body::after{
  content:"";
  position:absolute;
  width:600px;
  height:600px;
  border-radius:50%;
  filter: blur(80px);
  opacity:0.6;
  animation: float 18s infinite ease-in-out;
}

body::before{
  background: rgba(124,58,237,0.6); /* фиолетовый */
  top:-150px;
  left:-150px;
}

body::after{
  background: rgba(173,216,230,0.6); /* нежный голубой */
  bottom:-150px;
  right:-150px;
  animation-delay: -8s;
}

@keyframes float{
  0%   {transform: translate(0,0) scale(1);}
  25%  {transform: translate(120px, -80px) scale(1.1);}
  50%  {transform: translate(-100px, 100px) scale(0.9);}
  75%  {transform: translate(80px, 60px) scale(1.05);}
  100% {transform: translate(0,0) scale(1);}
}

/* 💧 стекло (вода) */
h1{
  font-size:48px;
  color:#1f2937;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);

  border:1px solid rgba(255,255,255,0.4);

  /* мягкие водяные переливы */
  box-shadow:
    inset 0 0 40px rgba(255,255,255,0.3),
    0 10px 40px rgba(0,0,0,0.08);
}

span{
  font-family:cursive;
  color:#4f46e5;
}

/* админка */
#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.25);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(12px);
  border:1px solid rgba(255,255,255,0.3);
}
</style>
</head>

<body>

<div id="adminBtn"></div>

<h1>сейчас Ваня <span id="text">...</span></h1>

<script>
async function load(){
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("text").textContent = d.text;
}
load();
setInterval(load, 2000);

// админка
document.getElementById("adminBtn").onclick = async () => {
  const pass = prompt("пароль");
  if(pass !== "wTMWe175") return;

  const choice = prompt("натурал / гомосек");

  await fetch("/update", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ text: choice })
  });

  load();
};
</script>

</body>
</html>
  `);
});

// сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Water glass server running on port", PORT);
});
