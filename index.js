
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

            

            res.end("SQL Server Connected Successfully!" + pool);

        } catch (err) {

            
            res.end("SQL Connection Failed. Check server logs." + err);

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
