
"use strict";

const http = require("node:http");
const mysql = require("mysql2/promise");
const sql = require("mssql");

const PORT = Number(process.env.PORT) || 3000;

// Microsoft SQL Server configuration
const mssqlConfig = {
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

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    // Hosted MySQL database test
    if (path === "/mysql") {

        let connection;

        try {
            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT || 3306),
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });

            const [rows] = await connection.query(
                "SELECT 1 AS connected"
            );

            res.end(
                "MySQL Connected Successfully!\n" +
                JSON.stringify(rows)
            );

        } catch (err) {
            console.error("MySQL error:", err);
            res.statusCode = 500;
            res.end("MySQL Connection Failed: " +
                (err.code || "UNKNOWN"));

        } finally {
            if (connection) await connection.end();
        }

    }

    // Microsoft SQL Server database test
    else if (path === "/mssql") {

        let pool;

        try {
            pool = await new sql.ConnectionPool(mssqlConfig)
                .connect();

            const result = await pool.request().query(
                "SELECT 1 AS connected"
            );

            res.end(
                "MSSQL Connected Successfully!\n" +
                JSON.stringify(result.recordset)
            );

        } catch (err) {
            console.error("MSSQL error:", err);
            res.statusCode = 500;
            res.end("MSSQL Connection Failed: " +
                (err.code || "UNKNOWN"));

        } finally {
            if (pool) await pool.close();
        }

    }

    // Default route
    else {
        res.end(
            "Party karo " + path +
            "\n\nDatabase Tests:\n" +
            "/mysql\n" +
            "/mssql"
        );
    }
});

if (require.main === module) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = { server };
