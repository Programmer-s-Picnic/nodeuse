
"use strict";

const http = require("node:http");
const mysql = require("mysql2/promise");
const ejs = require("ejs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;

// ========================================
// MYSQL CONFIGURATION
// ========================================

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
    connectTimeout: 10000
};

// ========================================
// EJS VIEW LOCATION
// ========================================

const sqlConsoleView = path.join(
    __dirname,
    "views",
    "sql-console.ejs"
);
const helloView = path.join(
    __dirname,
    "views",
    "hello.ejs"
);
// ========================================
// FORMAT MYSQL VALUES
// ========================================

function formatValue(value) {

    if (value === null || value === undefined) {
        return "NULL";
    }

    if (Buffer.isBuffer(value)) {
        return "[binary data]";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

// ========================================
// EXECUTE MYSQL QUERY
// ========================================

async function executeSQL(query) {

    let connection;

    try {

        connection = await mysql.createConnection(dbConfig);

        const [result, metadata] =
            await connection.query(query);

        let fields = [];
        let rows = [];
        let message = "";

        if (Array.isArray(result)) {

            // Handle SELECT, SHOW, DESCRIBE, CALL, etc.

            const resultSets = Array.isArray(result[0])
                ? result.filter(Array.isArray)
                : [result];

            const firstSet = resultSets[0] || [];

            const firstMetadata =
                Array.isArray(metadata?.[0])
                    ? metadata[0]
                    : metadata;

            fields = Array.isArray(firstMetadata)
                ? firstMetadata.map(field => field.name)
                : Object.keys(firstSet[0] || {});

            rows = firstSet.slice(0, 100).map(row =>
                fields.map(field => formatValue(row[field]))
            );

            message =
                "Query executed successfully.\n" +
                "Rows returned: " + firstSet.length;

            if (firstSet.length > 100) {
                message += "\nShowing first 100 rows.";
            }

            if (resultSets.length > 1) {
                message +=
                    "\nMultiple result sets returned; " +
                    "showing the first.";
            }

        } else {

            // Handle INSERT, UPDATE, DELETE,
            // CREATE, ALTER, DROP, TRUNCATE, etc.

            message =
                "Query executed successfully.\n" +
                "Affected Rows: " +
                (result.affectedRows ?? 0) + "\n" +
                "Changed Rows: " +
                (result.changedRows ?? 0) + "\n" +
                "Insert ID: " +
                (result.insertId ?? 0);

        }

        return {
            fields,
            rows,
            message,
            error: ""
        };

    } catch (error) {

        console.error("MySQL Error:", error);

        return {
            fields: [],
            rows: [],
            message: "",
            error: error.message
        };

    } finally {

        if (connection) {

            try {
                await connection.end();
            } catch (error) {
                console.error(
                    "Connection close error:",
                    error
                );
            }

        }

    }

}

// ========================================
// HTTP SERVER
// ========================================

const server = http.createServer(async (req, res) => {

    const pathname = new URL(
        req.url,
        "http://localhost"
    ).pathname;

//***********Hello*****************
if (pathname === "/hello") { 
let myname="MS Dhoni";
   
    res.end("jjk");
        
}

    //**********Hello*****************
    
    // ====================================
    // MYSQL CONSOLE
    // ====================================

    if (pathname === "/mysql-console") {

        if (req.method !== "GET" &&
            req.method !== "POST") {

            res.writeHead(405, {
                "Allow": "GET, POST"
            });

            res.end("Method Not Allowed");
            return;
        }

        let query = "";
        let fields = [];
        let rows = [];
        let message = "";
        let error = "";

        if (req.method === "POST") {

            try {

                let body = "";

                for await (const chunk of req) {

                    body += chunk.toString("utf8");

                    if (
                        Buffer.byteLength(body, "utf8") > 65536
                    ) {

                        res.writeHead(413);
                        res.end("Query too large");
                        return;
                    }

                }

                query = new URLSearchParams(body)
                    .get("query") || "";

                if (!query.trim()) {

                    error = "Please enter an SQL query.";

                } else {

                    const result = await executeSQL(query);

                    fields = result.fields;
                    rows = result.rows;
                    message = result.message;
                    error = result.error;

                }

            } catch (err) {

                console.error("Request Error:", err);

                error = "Unable to process the request.";

            }

        }

        // Render EJS page

        try {

            const html = await ejs.renderFile(
                sqlConsoleView,
                {
                    query,
                    fields,
                    rows,
                    message,
                    error
                }
            );

            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy":
                    "default-src 'none'; " +
                    "style-src 'unsafe-inline'; " +
                    "form-action 'self'; " +
                    "base-uri 'none'; " +
                    "frame-ancestors 'none'"
            });

            res.end(html);

        } catch (err) {

            console.error("EJS Rendering Error:", err);

            res.statusCode = 500;
            res.end("Error loading SQL Console");

        }

        return;
    }

    // ====================================
    // MYSQL ADMIN PLACEHOLDER
    // ====================================

    if (pathname === "/mysql-admin") {

        res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8"
        });

        res.end("<h1>MySQL Admin</h1>");
        return;
    }

    // ====================================
    // HOME PAGE
    // ====================================

    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
    });

    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Node.js Server</title>
        </head>
        <body>
            <h1>Hello World!</h1>

            <p>Node.js server is running.</p>

            <ul>
                <li><a href="/mysql-admin">
                    MySQL Admin
                </a></li>

                <li><a href="/mysql-console">
                    MySQL Console
                </a></li>
            </ul>
        </body>
        </html>
    `);

});

// ========================================
// START SERVER
// ========================================

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        "Server running on port " + PORT
    );

});
