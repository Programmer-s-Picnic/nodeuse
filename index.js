
"use strict";

const http = require("node:http");
const mysql = require("mysql2/promise");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/sql") {

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

            console.log("Database connected:", rows);

            res.end(
                "MySQL Connected Successfully!\n" +
                "Query Result: " + JSON.stringify(rows)
            );

        } catch (err) {

            console.error("Database error:", err);

            res.statusCode = 500;
            res.end(
                "MySQL Connection Failed!\n" +
                "Error Code: " + (err.code || "UNKNOWN")
            );

        } finally {

            if (connection) {
                await connection.end();
            }

        }

    } else {

        res.end("Party karo " + url.pathname);

    }

});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
