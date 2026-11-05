
"use strict";

const http = require("node:http");
const mysql = require("mysql2/promise");
const ejs = require("ejs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

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
// EJS VIEW LOCATIONS
// ========================================

const views = {
    hello: path.join(
        __dirname, "views", "hello.ejs"
    ),

    sqlConsole: path.join(
        __dirname, "views", "sql-console.ejs"
    )
};

// ========================================
// RESPONSE HELPERS
// ========================================

function sendHTML(res, html, status = 200) {

    res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    res.end(html);
}

function sendText(res, message, status = 200) {

    res.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end(message);
}

// ========================================
// RENDER EJS
// ========================================

async function renderView(res, viewPath, data = {}) {

    try {

        const html = await ejs.renderFile(
            viewPath,
            data
        );

        sendHTML(res, html);

    } catch (error) {

        console.error(
            "EJS rendering error:",
            error
        );

        sendText(
            res,
            "Unable to load the requested page.",
            500
        );
    }
}

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

        connection = await mysql.createConnection(
            dbConfig
        );

        const [result, metadata] =
            await connection.query(query);

        let fields = [];
        let rows = [];
        let message = "";

        if (Array.isArray(result)) {

            // SELECT, SHOW, DESCRIBE, etc.

            const resultSets =
                Array.isArray(result[0])
                    ? result.filter(Array.isArray)
                    : [result];

            const firstSet = resultSets[0] || [];

            const firstMetadata =
                Array.isArray(metadata?.[0])
                    ? metadata[0]
                    : metadata;

            fields = Array.isArray(firstMetadata)
                ? firstMetadata.map(
                    field => field.name
                )
                : Object.keys(firstSet[0] || {});

            rows = firstSet.slice(0, 100).map(
                row => fields.map(
                    field => formatValue(row[field])
                )
            );

            message =
                "Query executed successfully.\n" +
                "Rows returned: " + firstSet.length;

            if (firstSet.length > 100) {
                message +=
                    "\nShowing first 100 rows.";
            }

            if (resultSets.length > 1) {
                message +=
                    "\nMultiple result sets returned; " +
                    "showing the first.";
            }

        } else {

            // INSERT, UPDATE, DELETE,
            // CREATE, ALTER, DROP, etc.

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
// READ POST BODY
// ========================================

async function readBody(req) {

    let body = "";
    let totalBytes = 0;

    for await (const chunk of req) {

        totalBytes += chunk.length;

        if (totalBytes > 65536) {

            const error = new Error(
                "Request body too large"
            );

            error.statusCode = 413;
            throw error;
        }

        body += chunk.toString("utf8");
    }

    return body;
}

// ========================================
// MYSQL CONSOLE HANDLER
// ========================================

async function handleMySQLConsole(req, res) {

    let query = "";
    let fields = [];
    let rows = [];
    let message = "";
    let error = "";

    if (req.method === "POST") {

        try {

            const body = await readBody(req);

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

            if (err.statusCode === 413) {

                sendText(
                    res,
                    "Query too large",
                    413
                );

                return;
            }

            console.error("Request Error:", err);

            error = "Unable to process request.";
        }
    }

    await renderView(
        res,
        views.sqlConsole,
        {
            query,
            fields,
            rows,
            message,
            error
        }
    );
}

// ========================================
// HTTP SERVER
// ========================================

const server = http.createServer(
    async (req, res) => {

        try {

            const pathname = new URL(
                req.url,
                "http://localhost"
            ).pathname;

            console.log(
                req.method,
                pathname
            );

            // =================================
            // HEALTH CHECK
            // =================================

            if (pathname === "/health") {

                sendText(res, "OK");
                return;
            }

            // =================================
            // HELLO EJS PAGE
            // =================================

            if (pathname === "/hello") {

                if (req.method !== "GET") {
                    sendText(
                        res,
                        "Method Not Allowed",
                        405
                    );
                    return;
                }

                await renderView(
                    res,
                    views.hello,
                    {
                        title: "Hello World",
                        name: "World"
                    }
                );

                return;
            }

            // =================================
            // MYSQL CONSOLE
            // =================================

            if (pathname === "/mysql-console") {

                if (
                    req.method !== "GET" &&
                    req.method !== "POST"
                ) {

                    sendText(
                        res,
                        "Method Not Allowed",
                        405
                    );

                    return;
                }

                await handleMySQLConsole(req, res);

                return;
            }

            // =================================
            // MYSQL ADMIN
            // =================================

            if (pathname === "/mysql-admin") {

                if (req.method !== "GET") {
                    sendText(
                        res,
                        "Method Not Allowed",
                        405
                    );
                    return;
                }

                sendHTML(
                    res,
                    "<h1>MySQL Admin</h1>" +
                    "<p>Admin page is available.</p>"
                );

                return;
            }

            // =================================
            // HOME PAGE
            // =================================

            if (pathname === "/") {

                sendHTML(res, `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1">
    <title>Node.js Server</title>
</head>

<body>

    <h1>Hello World!</h1>

    <p>Node.js server is running.</p>

    <h2>Available Pages</h2>

    <ul>
        <li>
            <a href="/hello">
                Hello EJS
            </a>
        </li>

        <li>
            <a href="/mysql-console">
                MySQL Console
            </a>
        </li>

        <li>
            <a href="/mysql-admin">
                MySQL Admin
            </a>
        </li>

        <li>
            <a href="/health">
                Health Check
            </a>
        </li>
    </ul>

</body>
</html>
                `);

                return;
            }

            // =================================
            // 404
            // =================================

            sendText(
                res,
                "404 - Page Not Found",
                404
            );

        } catch (error) {

            console.error(
                "Server Request Error:",
                error
            );

            if (!res.headersSent) {

                sendText(
                    res,
                    "Internal Server Error",
                    500
                );

            } else if (!res.writableEnded) {

                res.end();
            }
        }
    }
);

// ========================================
// SERVER ERROR HANDLING
// ========================================

server.on("error", error => {

    console.error(
        "Server startup error:",
        error
    );
});

// ========================================
// START SERVER
// ========================================

server.listen(PORT, HOST, () => {

    console.log("==========================");
    console.log("Node.js Server Started");
    console.log("Port:", PORT);
    console.log("Host:", HOST);
    console.log("==========================");
});
