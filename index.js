
"use strict";

const http = require("node:http");
const mysql = require("mysql2/promise");
const ejs = require("ejs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {

    const pathname = new URL(
        req.url, "http://localhost"
    ).pathname;

    if (pathname === "/mysql-console") {

        let query = "SELECT * FROM task LIMIT 10";
        let fields = [];
        let rows = [];
        let message = "";
        let error = "";

        if (req.method !== "GET" && req.method !== "POST") {
            res.writeHead(405, { Allow: "GET, POST" });
            res.end("Method Not Allowed");
            return;
        }

        if (req.method === "POST") {

            let connection;

            try {
                let body = "";

                for await (const chunk of req) {
                    body += chunk.toString("utf8");

                    if (Buffer.byteLength(body, "utf8") > 8192) {
                        res.writeHead(413);
                        res.end("Query too large");
                        return;
                    }
                }

                query = new URLSearchParams(body)
                    .get("query") || "";

                const sql = query.trim()
                    .replace(/;\s*$/, "");

                if (
                    !/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(sql) ||
                    sql.includes(";")
                ) {
                    throw new Error(
                        "Only one read-only SQL statement is allowed"
                    );
                }

                // Use existing GoDaddy MySQL configuration
                connection = await mysql.createConnection({
                    host: process.env.DB_HOST,
                    port: Number(process.env.DB_PORT || 3306),
                    database: process.env.DB_NAME,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    multipleStatements: false,
                    connectTimeout: 10000
                });

                const [result, metadata] =
                    await connection.query({
                        sql,
                        timeout: 10000
                    });

                if (!Array.isArray(result)) {
                    throw new Error("Expected a result set");
                }

                fields = metadata.map(field => field.name);

                rows = result.slice(0, 100).map(row =>
                    fields.map(field => {
                        const value = row[field];

                        if (value == null) return "NULL";
                        if (Buffer.isBuffer(value))
                            return "[binary data]";
                        if (value instanceof Date)
                            return value.toISOString();

                        return typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value);
                    })
                );

                message =
                    `Query successful. ${result.length} row(s) returned.` +
                    (result.length > 100 ? " Showing first 100." : "");

            } catch (err) {
                console.error("MySQL Error:", err);
                error = "Query failed: check SQL and database permissions.";

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

        try {
            const html = await ejs.renderFile(
                path.join(__dirname, "views", "sql-console.ejs"),
                { query, fields, rows, message, error }
            );

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy":
                    "default-src 'none'; style-src 'unsafe-inline'; " +
                    "form-action 'self'; base-uri 'none'; " +
                    "frame-ancestors 'none'"
            });

            res.end(html);

        } catch (err) {
            console.error("EJS Error:", err);
            res.writeHead(500);
            res.end("Error loading SQL Console");
        }

        return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (pathname === "/mysql-admin") {
        res.end("<h1>MySQL Admin</h1>");
    } else {
        res.end("<h1>Hello World!</h1>");
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
