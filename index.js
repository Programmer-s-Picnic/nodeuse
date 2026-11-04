
"use strict";

const http = require("node:http");
const ejs = require("ejs");
const mysql = require("mysql2/promise");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    multipleStatements: false
});

const view = path.join(
    __dirname,
    "views",
    "sql-console.ejs"
);

function authorized(req) {
    const user = process.env.CONSOLE_USER;
    const pass = process.env.CONSOLE_PASSWORD;

    if (!user || !pass) return false;

    const header = req.headers.authorization || "";

    if (!header.startsWith("Basic ")) return false;

    const value = Buffer.from(
        header.slice(6), "base64"
    ).toString("utf8");

    return value === `${user}:${pass}`;
}

const server = http.createServer(async (req, res) => {

    const pathname = new URL(
        req.url, "http://localhost"
    ).pathname;

    if (pathname === "/mysql-console") {

        res.setHeader("Cache-Control", "no-store");

        if (!authorized(req)) {
            res.writeHead(401, {
                "WWW-Authenticate": 'Basic realm="MySQL Console"'
            });
            res.end("Authentication required");
            return;
        }

        if (req.method !== "GET" &&
            req.method !== "POST") {
            res.writeHead(405, { Allow: "GET, POST" });
            res.end("Method Not Allowed");
            return;
        }

        let query = "SELECT * FROM task LIMIT 10";
        let fields = [];
        let rows = [];
        let message = "";
        let error = "";

        if (req.method === "POST") {
            try {
                const chunks = [];
                let size = 0;

                for await (const chunk of req) {
                    size += chunk.length;

                    if (size > 8192) {
                        res.writeHead(413);
                        res.end("Query too large");
                        return;
                    }

                    chunks.push(chunk);
                }

                const body = Buffer.concat(chunks)
                    .toString("utf8");

                query = new URLSearchParams(body)
                    .get("query") || "";

                const sql = query.trim()
                    .replace(/;\s*$/, "");

                if (
                    !/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(sql) ||
                    sql.includes(";")
                ) {
                    throw new Error(
                        "Only one read-only query is allowed"
                    );
                }

                // A SELECT-only database account is
                // required: this text check is not a
                // database security boundary.
                const [result, metadata] =
                    await pool.query({
                        sql,
                        timeout: 10000
                    });

                fields = metadata.map(
                    field => field.name
                );

                rows = result.slice(0, 100).map(row =>
                    fields.map(field => {
                        const value = row[field];

                        if (value === null) return "NULL";
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
                    `Query successful. Showing ${rows.length} row(s).`;

            } catch (err) {
                console.error("MySQL Error:", err);

                error = "Query failed. Check SQL syntax and permissions.";
            }
        }

        try {
            const html = await ejs.renderFile(view, {
                query,
                fields,
                rows,
                message,
                error
            });

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
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
