const express = require("express");
const app = express();

app.use(express.json());

// 2 состояния
const variants = ["натурал", "гомосек"];

// интервалы (1 мин – 3 дня)
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

// переключение
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

// авто-обновление
setInterval(() => {
  if (Date.now() > state.nextChange) {
    toggleState();
  }
}, 10000);

// API
app.get("/state", (req, res) => {
  res.json({
    text: state.text,
    nextChange: state.nextChange,
    updatedAt: state.updatedAt
  });
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

  background: linear-gradient(135deg,#ff4fd8,#7c3aed,#00d4ff,#22c55e);
  background-size:400% 400%;
  animation: gradientMove 10s ease infinite;
}

@keyframes gradientMove{
  0%{background-position:0% 50%;}
  50%{background-position:100% 50%;}
  100%{background-position:0% 50%;}
}

h1{
  font-size:48px;
  color:white;
  padding:30px 50px;
  border-radius:25px;

  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  border:1px solid rgba(255,255,255,0.25);

  box-shadow:
    0 0 20px rgba(255,255,255,0.4),
    0 0 60px rgba(124,58,237,0.4),
    0 0 120px rgba(0,212,255,0.3);

  text-shadow:0 0 10px rgba(255,255,255,0.6);
}

span{
  font-family:cursive;
  text-shadow:0 0 15px rgba(255,255,255,0.8);
}

#adminBtn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:rgba(255,255,255,0.15);
  border-radius:10px;
  cursor:pointer;
  backdrop-filter: blur(10px);
  border:1px solid rgba(255,255,255,0.2);
  box-shadow:0 0 20px rgba(255,255,255,0.2);
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
  console.log("Server running on port", PORT);
});
