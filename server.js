const express = require("express");
const app = express();

app.use(express.json());

// строго 2 состояния
const variants = ["натурал", "гомосек"];

// интервалы (1 минута – 3 дня)
const MIN_MS = 60 * 1000;
const MAX_MS = 3 * 24 * 60 * 60 * 1000;

// начальное состояние
let state = {
  index: 0,
  text: variants[0],
  nextChange: Date.now() + randomInterval(),
  updatedAt: Date.now()
};

// случайный интервал
function randomInterval() {
  return Math.floor(Math.random() * (MAX_MS - MIN_MS)) + MIN_MS;
}

// переключение текста
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

// проверка времени
setInterval(() => {
  if (Date.now() > state.nextChange) {
    toggleState();
  }
}, 10000);

// получить состояние
app.get("/state", (req, res) => {
  res.json({
    text: state.text,
    nextChange: state.nextChange,
    updatedAt: state.updatedAt
  });
});

// ручное управление
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
  background: linear-gradient(120deg,#c7d2fe,#e9d5ff,#bae6fd);
}

h1{font-size:48px;}
span{color:#4f46e5;font-family:cursive;}

#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(128,128,128,0.3);
  border-radius:8px;
  cursor:pointer;
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

  const choice = prompt("выбери: натурал / гомосек");

  await fetch("/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ text: choice })
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
  console.log("Smart toggle server running on port", PORT);
});
