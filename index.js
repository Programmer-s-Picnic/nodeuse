
"use strict";

const http = require("node:http");
const sql = require("mssql");

const PORT = Number(process.env.PORT) || 3000;

// Microsoft SQL Server configuration
const config = {
    server: "SG2NWPLS19SQL-v09.mssql.shr.prod.sin2.secureserver.net",
    port: 1433,
    database: "testwhatsapp",
    user: "testwhatsapp",
    password: "M%E4Zn3li3oxjkp_",

    options: {
        encrypt: true,
        trustServerCertificate: true
    },

    connectionTimeout: 30000,
    requestTimeout: 30000
};

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
    if (path === "/sql") {

        try {
            const pool = await sql.connect(config);

            const result = await pool.request().query("SELECT 1 AS connected");

            res.end("SQL Server Connected Successfully!");

        } catch (err) {

            console.error("SQL Error:", err);
            res.statusCode = 500;
            res.end("SQL Connection Failed. Check server logs.");

        }

    }

    // Addition
    else if (path === "/add") {

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

    }

    // Subtraction
    else if (path === "/sub") {

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

    }

    // Factorial
    else if (path === "/factorial") {

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

    }

    // Even or Odd
    else if (path === "/even-odd") {

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

    }

    // Default route
    else {

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
