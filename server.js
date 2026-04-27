const express = require("express");
const app = express();

app.use(express.json());

// ===== НАСТРОЙКИ =====
const variants = ["натурал", "гомосек"];

const MIN_MS = 60 * 1000; // 1 минута
const MAX_MS = 3 * 24 * 60 * 60 * 1000; // 3 дня

function randomInterval() {
  return Math.floor(Math.random() * (MAX_MS - MIN_MS)) + MIN_MS;
}

// ===== СОСТОЯНИЕ =====
let mode = "auto";

let state = {
  index: 0,
  text: variants[0],
  nextChange: Date.now() + randomInterval(),
  updatedAt: Date.now()
};

let manualTimeout = null;

// ===== АВТО ПЕРЕКЛЮЧЕНИЕ =====
function autoToggle() {
  if (mode !== "auto") return;

  state.index = state.index === 0 ? 1 : 0;

  state = {
    ...state,
    text: variants[state.index],
    nextChange: Date.now() + randomInterval(),
    updatedAt: Date.now()
  };

  console.log("AUTO →", state.text);
}

// проверка каждые 5 сек
setInterval(() => {
  if (mode === "auto" && Date.now() > state.nextChange) {
    autoToggle();
  }
}, 5000);

// ===== API =====

// получить состояние
app.get("/state", (req, res) => {
  res.json({
    text: state.text,
    mode
  });
});

// админка
app.post("/update", (req, res) => {
  const { text, seconds } = req.body;

  mode = "manual";

  state = {
    index: -1,
    text: text || "натурал",
    nextChange: null,
    updatedAt: Date.now()
  };

  if (manualTimeout) clearTimeout(manualTimeout);

  const time = Number(seconds || 10) * 1000;

  manualTimeout = setTimeout(() => {
    mode = "auto";

    state.index = Math.floor(Math.random() * 2);

    state = {
      ...state,
      text: variants[state.index],
      nextChange: Date.now() + randomInterval(),
      updatedAt: Date.now()
    };

    console.log("BACK TO AUTO MODE");
  }, time);

  res.json({ ok: true, state, mode });
});

// ===== САЙТ =====
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
  background:#eef2ff;
}

/* 🌊 фиолетовые "водяные" формы */
body::before,
body::after{
  content:"";
  position:absolute;
  width:600px;
  height:600px;
  border-radius:50%;
  filter: blur(100px);
  opacity:0.65;
  animation: float 10s ease-in-out infinite;
}

body::before{
  background: rgba(124,58,237,0.6);
  top:-150px;
  left:-150px;
}

body::after{
  background: rgba(147,197,253,0.5);
  bottom:-150px;
  right:-150px;
  animation-delay:-4s;
}

@keyframes float{
  0%   {transform: translate(0,0) scale(1);}
  25%  {transform: translate(120px,-90px) scale(1.1);}
  50%  {transform: translate(-100px,120px) scale(0.95);}
  75%  {transform: translate(80px,60px) scale(1.05);}
  100% {transform: translate(0,0) scale(1);}
}

/* 💧 стекло */
h1{
  font-size:48px;
  color:#1f2937;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);

  border:1px solid rgba(255,255,255,0.4);

  box-shadow:
    inset 0 0 50px rgba(255,255,255,0.25),
    0 10px 40px rgba(0,0,0,0.08);
}

span{
  font-family:cursive;
  color:#4f46e5;
}

/* админ */
#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.35);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(10px);
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

  const text = prompt("введи любой текст");
  const sec = prompt("на сколько секунд");

  await fetch("/update", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ text, seconds: sec })
  });

  load();
};
</script>

</body>
</html>
  `);
});

// ===== СЕРВЕР =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("FINAL SYSTEM running on port", PORT);
});
