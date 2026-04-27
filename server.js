const express = require("express");
const app = express();

app.use(express.json());

// ===== НАСТРОЙКИ =====
const variants = ["натурал", "гомосек"];

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

// ===== АВТО РЕЖИМ =====
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
  res.json({
    text: state.text,
    mode
  });
});

// ===== АДМИНКА =====
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
  background:#0b0b14;
}

/* ===== ЖИДКАЯ ФИОЛЕТОВАЯ ВОДА ===== */
.water{
  position:absolute;
  width:100%;
  height:100%;
  overflow:hidden;
}

/* основные “массы воды” */
.water::before,
.water::after,
.water i{
  content:"";
  position:absolute;
  width:700px;
  height:700px;
  border-radius:50%;
  filter: blur(120px);
  opacity:0.65;
  animation: flow 8s ease-in-out infinite;
}

/* фиолетовая глубина */
.water::before{
  background: radial-gradient(circle, rgba(124,58,237,0.9), transparent 60%);
  top:-200px;
  left:-200px;
}

/* голубой оттенок */
.water::after{
  background: radial-gradient(circle, rgba(147,197,253,0.5), transparent 60%);
  bottom:-200px;
  right:-200px;
  animation-delay:-3s;
}

/* центральные блики */
.water i{
  background: radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%);
  top:30%;
  left:30%;
  animation-delay:-6s;
}

@keyframes flow{
  0%   {transform:translate(0,0) scale(1);}
  25%  {transform:translate(120px,-90px) scale(1.15);}
  50%  {transform:translate(-110px,130px) scale(0.95);}
  75%  {transform:translate(90px,70px) scale(1.1);}
  100% {transform:translate(0,0) scale(1);}
}

/* ===== стеклянная карточка ===== */
h1{
  font-size:48px;
  color:#e5e7eb;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(30px);

  border:1px solid rgba(255,255,255,0.15);

  box-shadow:
    inset 0 0 60px rgba(124,58,237,0.15),
    inset 0 0 80px rgba(147,197,253,0.1),
    0 10px 50px rgba(0,0,0,0.5);
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
  background:rgba(255,255,255,0.1);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(12px);
  border:1px solid rgba(255,255,255,0.2);
}
</style>
</head>

<body>

<div class="water"><i></i></div>
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

// ===== АДМИНКА =====
document.getElementById("adminBtn").onclick = async () => {
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("введи текст");
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
  console.log("WATER SYSTEM RUNNING");
});
