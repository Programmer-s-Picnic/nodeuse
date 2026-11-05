
"use strict";

const express = require("express");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (req, res) => {
    // res.send("<h1>Hello World Express</h1>");

    res.render("hello.ejs",{});
    
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
