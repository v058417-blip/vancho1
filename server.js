const express = require("express");
const app = express();

app.use(express.json());

let state = {
  text: "натурал",
  until: null,
  updatedAt: Date.now()
};

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
