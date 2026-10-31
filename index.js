
"use strict";

const http = require("node:http");
const sql = require("mssql");
const PORT = Number(process.env.PORT) || 3000;

const config = {
    server: "SG2NWPLS19SQL-v09.mssql.shr.prod.sin2.secureserver.net",
    port: 1433,
    database: "testwhatsapp",
    user: "testwhatsapp",
    password: process.env.DB_PASSWORD,

    options: {
        encrypt: true,
        trustServerCertificate: true
    },

    connectionTimeout: 30000,
    requestTimeout: 30000
};

const server = http.createServer((req, res) => {

    // Allow requests from GitHub Pages
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    if (path === "/sql") {

        res.end("SQL configuration ready. Database not connected yet.");

    } else if (path === "/add") {

        const a = Number(url.searchParams.get("a"));
        const b = Number(url.searchParams.get("b"));

        if (!url.searchParams.has("a") ||
            !url.searchParams.has("b") ||
            !Number.isFinite(a) ||
            !Number.isFinite(b)) {
            res.statusCode = 400;
            res.end("Provide valid numbers a and b");
            return;
        }

        res.end("Sum: " + (a + b));

    } else if (path === "/sub") {

        const a = Number(url.searchParams.get("a"));
        const b = Number(url.searchParams.get("b"));

        if (!url.searchParams.has("a") ||
            !url.searchParams.has("b") ||
            !Number.isFinite(a) ||
            !Number.isFinite(b)) {
            res.statusCode = 400;
            res.end("Provide valid numbers a and b");
            return;
        }

        res.end("Difference: " + (a - b));

    } else if (path === "/factorial") {

        const n = Number(url.searchParams.get("n"));

        if (!url.searchParams.has("n") ||
            !Number.isInteger(n) ||
            n < 0 || n > 170) {
            res.statusCode = 400;
            res.end("Provide an integer n between 0 and 170");
            return;
        }

        let fact = 1;

        for (let i = 1; i <= n; i++) {
            fact = fact * i;
        }

        res.end("Factorial: " + fact);

    } else if (path === "/even-odd") {

        const n = Number(url.searchParams.get("n"));

        if (!url.searchParams.has("n") ||
            !Number.isSafeInteger(n)) {
            res.statusCode = 400;
            res.end("Provide a valid integer n");
            return;
        }

        if (n % 2 === 0) {
            res.end("Even Number!");
        } else {
            res.end("Odd Number!");
        }

    } else {

        res.end("Party karo " + path);

    }

});

// Start server
if (require.main === module) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = { server };
