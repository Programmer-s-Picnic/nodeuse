"use strict";

const http = require("node:http");
const PORT = Number(process.env.PORT) || 3000;

// ====================================
// CREATE HTTP SERVER
// ====================================

const server = http.createServer(async (req, res) => {

    // Allow requests from GitHub Pages
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const url = new URL(req.url, "http://localhost");
    
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

 res.end("Hello Roshan");
 
 

// ====================================
// START SERVER
// ====================================

if (require.main === module) {

    server.listen(PORT, "0.0.0.0", () => {

        console.log(
            "Server running on port " + PORT
        );

    });

}

module.exports = { server };
