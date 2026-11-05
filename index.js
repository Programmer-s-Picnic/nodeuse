
const express = require("express");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
    let name = ["Dhoni", "Virat", "Hardik"];
    
    res.render("hello.ejs", {uername: name});
});

app.listen(PORT, (req,res) => {
    console.log("Server running on port " + PORT);
});
