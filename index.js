
"use strict";

const http = require("node:http");
const net = require("node:net");
const mysql = require("mysql2/promise");
const sql = require("mssql");

const PORT = Number(process.env.PORT) || 3000;

// ====================================
// MICROSOFT SQL SERVER CONFIGURATION
// ====================================

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
    const path = url.pathname;

    // ====================================
    // MYSQL CONNECTION TEST
    // ====================================

    if (path === "/mysql") {

        let connection;

        try {

            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT || 3306),
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            });

            const [rows] = await connection.query(
                "SELECT 1 AS connected"
            );

            console.log("MySQL connected:", rows);

            res.end(
                "MySQL Connected Successfully!\n\n" +
                JSON.stringify(rows, null, 2)
            );

        } catch (err) {

            console.error("MySQL Error:", err);

            res.statusCode = 500;

            res.end(
                "MySQL Connection Failed!\n" +
                "Error Code: " + (err.code || "UNKNOWN")
            );

        } finally {

            if (connection) {
                try {
                    await connection.end();
                } catch (err) {
                    console.error("MySQL close error:", err);
                }
            }

        }

    }

    // ====================================
    // MSSQL TCP PORT TEST
    // ====================================

    else if (path === "/mssql-port") {

        const host = mssqlConfig.server;
        const port = mssqlConfig.port;

        const result = await new Promise((resolve) => {

            const socket = net.createConnection({
                host: host,
                port: port
            });

            let finished = false;

            function finish(message, status) {

                if (finished) return;
                finished = true;

                socket.destroy();

                resolve({
                    message: message,
                    status: status
                });
            }

            socket.setTimeout(10000);

            socket.on("connect", () => {

                finish(
                    "SUCCESS!\n\n" +
                    "MSSQL Server: " + host + "\n" +
                    "Port: " + port + "\n\n" +
                    "TCP connection successful.",
                    200
                );

            });

            socket.on("timeout", () => {

                finish(
                    "FAILED!\n\n" +
                    "Connection timed out.\n" +
                    "Check firewall or network restrictions.",
                    504
                );

            });

            socket.on("error", (err) => {

                console.error("MSSQL TCP Error:", err);

                finish(
                    "FAILED!\n\n" +
                    "Error Code: " + err.code + "\n" +
                    "Message: " + err.message,
                    500
                );

            });

        });

        res.statusCode = result.status;
        res.end(result.message);

    }

    // ====================================
    // MICROSOFT SQL SERVER CONNECTION
    // ====================================

    else if (path === "/mssql") {

        let pool;

        try {

            if (!mssqlConfig.password) {
                throw new Error(
                    "MSSQL_PASSWORD environment variable is missing"
                );
            }

            pool = await new sql.ConnectionPool(mssqlConfig)
                .connect();

            const result = await pool.request().query(
                "SELECT 1 AS connected"
            );

            console.log(
                "MSSQL Connected Successfully:",
                result.recordset
            );

            res.end(
                "MSSQL Connected Successfully!\n\n" +
                JSON.stringify(result.recordset, null, 2)
            );

        } catch (err) {

            console.error("MSSQL Error:", err);

            if (err.originalError) {
                console.error(
                    "Original MSSQL Error:",
                    err.originalError
                );
            }

            res.statusCode = 500;

            res.end(
                "MSSQL Connection Failed!\n\n" +
                "Error Code: " + (err.code || "UNKNOWN") +
                "\n\nCheck server logs for details."
            );

        } finally {

            if (pool) {
                try {
                    await pool.close();
                } catch (err) {
                    console.error("MSSQL close error:", err);
                }
            }

        }

    }

    // ====================================
    // HOME PAGE
    // ====================================

    else {

        res.end(
            "Party karo " + path + "\n\n" +
            "Node.js Database Test Server\n\n" +
            "Available Routes:\n\n" +
            "/mysql       - Test MySQL connection\n" +
            "/mssql       - Test Microsoft SQL Server\n" +
            "/mssql-port  - Test MSSQL TCP port 1433\n"
        );

    }

});

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
