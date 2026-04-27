const express = require("express");
const app = express();

app.use(express.json());

// базовые варианты
const variants = ["натурал", "гомосек"];

// режим системы
let mode = "auto"; // auto | manual

// состояние
let state = {
  index: 0,
  text: variants[0],
  nextChange: Date.now() + randomInterval(),
  updatedAt: Date.now()
};

// временный ручной режим
let manualTimeout = null;

// интервалы авто-режима
const MIN_MS = 60 * 1000;
const MAX_MS = 3 * 24 * 60 * 60 * 1000;

// случайный интервал
function randomInterval() {
  return Math.floor(Math.random() * (MAX_MS - MIN_MS)) + MIN_MS;
}

// переключение авто-режима
function toggleAuto() {
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

// проверка авто-режима
setInterval(() => {
  if (mode === "auto" && Date.now() > state.nextChange) {
    toggleAuto();
  }
}, 5000);

// API состояние
app.get("/state", (req, res) => {
  res.json({
    text: state.text,
    mode
  });
});

// API обновление (админка)
app.post("/update", (req, res) => {
  const { text, seconds } = req.body;

  // включаем ручной режим
  mode = "manual";

  state = {
    index: -1,
    text: text || "натурал",
    nextChange: null,
    updatedAt: Date.now()
  };

  console.log("MANUAL →", text);

  // сброс обратно в авто-режим
  if (manualTimeout) clearTimeout(manualTimeout);

  const time = Number(seconds || 10) * 1000;

  manualTimeout = setTimeout(() => {
    mode = "auto";
    state.index = Math.floor(Math.random() * 2);
    state.text = variants[state.index];
    state.nextChange = Date.now() + randomInterval();

    console.log("BACK TO AUTO MODE");
  }, time);

  res.json({ ok: true, state, mode });
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
  background:#eef3ff;
}

/* 💧 водяные фиолетовые блоки */
body::before,
body::after,
body div.glow{
  content:"";
  position:absolute;
  width:500px;
  height:500px;
  border-radius:50%;
  filter: blur(90px);
  opacity:0.7;
  animation: move 8s infinite ease-in-out;
}

body::before{
  background: rgba(124,58,237,0.7);
  top:-120px;
  left:-120px;
}

body::after{
  background: rgba(147,197,253,0.5);
  bottom:-120px;
  right:-120px;
  animation-delay:-3s;
}

.glow{
  background: rgba(124,58,237,0.4);
  top:30%;
  left:40%;
  animation-delay:-6s;
}

@keyframes move{
  0%{transform:translate(0,0) scale(1);}
  25%{transform:translate(120px,-80px) scale(1.1);}
  50%{transform:translate(-100px,120px) scale(0.9);}
  75%{transform:translate(80px,60px) scale(1.2);}
  100%{transform:translate(0,0) scale(1);}
}

/* стекло */
h1{
  font-size:48px;
  color:#1f2937;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(25px);

  border:1px solid rgba(255,255,255,0.4);

  box-shadow:
    inset 0 0 50px rgba(255,255,255,0.3),
    0 10px 40px rgba(0,0,0,0.1);
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
  background:rgba(255,255,255,0.3);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(10px);
}
</style>
</head>

<body>
<div class="glow"></div>
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("FULL MODE server running on port", PORT);
});

