const express = require("express");
const app = express();

app.use(express.json());

// состояние
let state = {
  text: "натурал",
  until: null,
  updatedAt: Date.now()
};

// получить состояние
app.get("/state", (req, res) => {
  res.json(state);
});

// обновить состояние
app.post("/update", (req, res) => {
  state = {
    text: req.body.text || state.text,
    until: req.body.until || null,
    updatedAt: Date.now()
  };

  res.json({ ok: true, state });
});

// главная страница
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
  font-family: Arial, sans-serif;
  background: linear-gradient(120deg,#c7d2fe,#e9d5ff,#bae6fd);
}

h1{
  font-size:48px;
}

span{
  color:#4f46e5;
  font-family: cursive;
}

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
const API = "";

async function load(){
  const res = await fetch("/state");
  const data = await res.json();
  document.getElementById("text").textContent = data.text;
}
load();
setInterval(load, 2000);

// админка
document.getElementById("adminBtn").onclick = async () => {
  const pass = prompt("пароль");
  if(pass !== "wTMWe175") return;

  const text = prompt("текст:");
  const sec = prompt("время (сек):");

  const until = Date.now() + (Number(sec || 5) * 1000);

  await fetch("/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ text, until })
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
  console.log("Server running on port", PORT);
});
