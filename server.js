const express = require("express");
const app = express();

app.use(express.json());

// ===== ВАРИАНТЫ =====
const variants = ["натурал", "гомосек"];

// ===== РАНДОМ =====
const MIN_MS = 60 * 1000;
const MAX_MS = 3 * 24 * 60 * 60 * 1000;

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

setInterval(() => {
  if (mode === "auto" && Date.now() > state.nextChange) {
    autoToggle();
  }
}, 5000);

// ===== API =====
app.get("/state", (req, res) => {
  res.json({ text: state.text, mode });
});

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

    console.log("BACK TO AUTO");
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

  background: radial-gradient(circle at 30% 30%, #0b1a3a, #050816 60%, #02030a);
}

/* ===== ЖИДКАЯ МЕТАБОЛИЧЕСКАЯ ВОДА ===== */
.water{
  position:absolute;
  inset:0;
  overflow:hidden;
  filter: blur(50px);
}

/* основные “живые массы” */
.blob{
  position:absolute;
  border-radius:50%;
  mix-blend-mode: screen;
  opacity:0.7;
  animation: morph 18s infinite ease-in-out;
}

/* фиолетовая глубина */
.b1{
  width:600px;
  height:600px;
  background: radial-gradient(circle at 30% 30%, rgba(124,58,237,0.9), transparent 65%);
  top:-10%;
  left:-10%;
}

/* синяя вода */
.b2{
  width:700px;
  height:700px;
  background: radial-gradient(circle at 30% 30%, rgba(59,130,246,0.7), transparent 65%);
  bottom:-20%;
  right:-15%;
  animation-delay:-5s;
}

/* светлые переливы */
.b3{
  width:500px;
  height:500px;
  background: radial-gradient(circle at 30% 30%, rgba(147,197,253,0.5), transparent 70%);
  top:35%;
  left:40%;
  animation-delay:-10s;
}

/* блик */
.glow{
  position:absolute;
  width:300px;
  height:300px;
  border-radius:50%;
  background: radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%);
  mix-blend-mode: screen;
  animation: morph 14s infinite ease-in-out;
}

/* ===== ПЕРЕТЕКАНИЕ ФОРМ ===== */
@keyframes morph{
  0%{
    transform:translate(0,0) scale(1);
    border-radius:40% 60% 55% 45% / 50% 40% 60% 50%;
  }
  25%{
    transform:translate(120px,-90px) scale(1.2);
    border-radius:60% 40% 30% 70% / 40% 60% 40% 60%;
  }
  50%{
    transform:translate(-110px,120px) scale(0.95);
    border-radius:30% 70% 65% 35% / 60% 40% 60% 40%;
  }
  75%{
    transform:translate(90px,70px) scale(1.1);
    border-radius:55% 45% 35% 65% / 50% 70% 30% 50%;
  }
  100%{
    transform:translate(0,0) scale(1);
    border-radius:40% 60% 55% 45% / 50% 40% 60% 50%;
  }
}

/* ===== СТЕКЛО ===== */
h1{
  font-size:48px;
  color:#e5e7eb;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(30px);

  border:1px solid rgba(255,255,255,0.12);

  box-shadow:
    inset 0 0 60px rgba(124,58,237,0.12),
    inset 0 0 80px rgba(59,130,246,0.08),
    0 10px 50px rgba(0,0,0,0.6);
}

span{
  font-family:cursive;
  color:#c4b5fd;
  text-shadow:0 0 15px rgba(124,58,237,0.6);
}

/* админ */
#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:42px;
  height:42px;
  background:rgba(255,255,255,0.08);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(12px);
  border:1px solid rgba(255,255,255,0.15);
}
</style>
</head>

<body>

<div class="water">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="glow"></div>
</div>

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
  if(pass !== "4724") return;

  const text = prompt("текст");
  const sec = prompt("время (сек)");

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
  console.log("FINAL WATER SYSTEM RUNNING");
});
