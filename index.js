
"use strict";

const http = require("node:http");
 import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const PORT = Number(process.env.PORT) || 3000;


// Create HTTP server
const server = http.createServer(async (req, res) => {

    // CORS for GitHub Pages
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    // Read URL and path
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    // SQL Server connection
    

        res.end("Party karo " + path);

    

});

// Start server
if (require.main === module) {

    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });

}

module.exports = { server };
