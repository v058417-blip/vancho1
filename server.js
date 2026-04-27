const express = require("express");
const app = express();

app.use(express.json());

// текущее состояние сайта
let state = {
  text: "натурал",
  until: null,
  updatedAt: Date.now()
};

// API: получить состояние
app.get("/state", (req, res) => {
  res.json(state);
});

// API: обновить состояние
app.post("/update", (req, res) => {
  state = {
    text: req.body.text || "натурал",
    until: req.body.until || null,
    updatedAt: Date.now()
  };

  res.json({ ok: true, state });
});

// главная страница сайта
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
  color:#111827;
}

span{
  color:#4f46e5;
  font-family: cursive;
}
</style>
</head>

<body>
  <h1>сейчас Ваня <span id="text">...</span></h1>

<script>
async function load(){
  try {
    const res = await fetch("/state");
    const data = await res.json();
    document.getElementById("text").textContent = data.text;
  } catch(e) {
    document.getElementById("text").textContent = "ошибка";
  }
}

load();
setInterval(load, 2000);
</script>

</body>
</html>
  `);
});

// порт Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
