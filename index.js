
"use strict";

const express = require("express");

const app = express();
app.set("view engine, "ejs");
const(express.urlencoded({ express: true )};

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (req, res) => {
    let name = ["Dhoni", "Virat", "Hardik"];
    
    res.render("hello", { username: name });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
