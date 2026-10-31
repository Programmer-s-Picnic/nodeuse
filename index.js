
"use strict";
const { ename } = require('ejs');
const express = require('express');
const app = express();


const http = require("node:http");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {

    // Allow requests from GitHub Pages
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // Read name from URL
    const url = new URL(req.url, "http://localhost");
    const path=url.pathname;

    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

if(path=="/add"){
    res.end(`Jodo`);
}
    else
    if(path=="/sub"){
    res.end(`Ghatao`);
}
    else
     res.end(`Party karo`);
    
     
    

});

// Start server
if (require.main === module) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = { server };
