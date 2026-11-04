
"use strict";

const http = require("node:http");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
    });

    if (req.url === "/mysql-admin") {
        res.end("<h1>MySQL Admin</h1>");
    } else {
        res.end("<h1>Hello World!</h1>");
    }

});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
