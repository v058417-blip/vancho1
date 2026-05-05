const express = require("express");
const app = express();

app.use(express.json());

let state = {
  mode: "auto",
  text: Math.random() > 0.5 ? "натурал" : "гомосек",
  until: null
};

// обновление состояния
setInterval(() => {
  const now = Date.now();

  if (state.mode === "manual") {
    if (now >= state.until) {
      state.mode = "auto";
      state.text = Math.random() > 0.5 ? "натурал" : "гомосек";
    }
  } else {
    // случайная смена раз в 10–60 секунд
    if (Math.random() < 0.1) {
      state.text = Math.random() > 0.5 ? "натурал" : "гомосек";
    }
  }
}, 1000);

// API
app.get("/state", (req, res) => {
  res.json(state);
});

app.post("/update", (req, res) => {
  const { text, ms } = req.body;

  state.mode = "manual";
  state.text = text;
  state.until = Date.now() + ms;

  res.json({ ok: true });
});

// САЙТ
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;

  /* НЕ БЕЛЫЙ */
  background:#0b1020;
  color:white;
  font-family:Arial;
}

h1{
  font-size:40px;
}

#btn{
  position:fixed;
  top:10px;
  left:10px;
  width:40px;
  height:40px;
  background:gray;
}
</style>
</head>

<body>

<div id="btn"></div>
<h1>сейчас Ваня <span id="t">...</span></h1>

<script>
async function load(){
  try{
    const r = await fetch("/state");
    const d = await r.json();
    document.getElementById("t").textContent = d.text;
  }catch(e){
    document.getElementById("t").textContent = "ошибка";
  }
}
load();
setInterval(load,1000);

btn.onclick = async ()=>{
  const pass = prompt("пароль");
  if(pass !== "4724") return;

  const text = prompt("текст");

  const sec = prompt("секунды");
  const ms = Number(sec) * 1000;

  await fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text, ms})
  });

  load();
};
</script>

</body>
</html>
  `);
});

app.listen(3000, () => console.log("OK"));
