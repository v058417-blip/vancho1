app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Сейчас Ваня</title>

<style>
body{
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:sans-serif;
  background: linear-gradient(120deg, #c7d2fe, #e9d5ff, #bae6fd);
  animation: bg 10s infinite alternate;
}

@keyframes bg {
  0% {filter: hue-rotate(0deg);}
  100% {filter: hue-rotate(30deg);}
}

h1{
  font-size:50px;
  color:#111827;
  text-shadow:0 10px 30px rgba(0,0,0,0.2);
}

span{
  font-family: cursive;
  color:#4f46e5;
}
</style>
</head>

<body>
<h1>сейчас Ваня <span id="t">...</span></h1>

<script>
async function load(){
  const res = await fetch('/state');
  const data = await res.json();
  document.getElementById('t').textContent = data.text;
}
load();
setInterval(load, 2000);
</script>

</body>
</html>
  `);
});


const express = require("express");
const app = express();

app.use(express.json());

let state = {
  text: "натурал",
  until: null,
  updatedAt: Date.now()
};

// API
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  state = {
    ...req.body,
    updatedAt: Date.now()
  };
  res.json({ ok: true });
});

// ГЛАВНАЯ СТРАНИЦА
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Сейчас Ваня</title>
<style>
body{
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:sans-serif;
  background: linear-gradient(120deg, #c7d2fe, #e9d5ff, #bae6fd);
}
h1{
  font-size:50px;
}
span{
  color:#4f46e5;
  font-family:cursive;
}
</style>
</head>
<body>
<h1>сейчас Ваня <span id="t">...</span></h1>

<script>
async function load(){
  const r = await fetch("/state");
  const d = await r.json();
  document.getElementById("t").textContent = d.text;
}
load();
setInterval(load, 2000);
</script>

</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
