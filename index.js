"use strict";

const http = require("node:http");
const net = require("node:net");
const mysql = require("mysql2/promise");
const sql = require("mssql");
const ejs = require("ejs");
const crypto = require("node:crypto");
const pathModule = require("node:path");

const PORT = Number(process.env.PORT) || 3000;

// ====================================
// MICROSOFT SQL SERVER CONFIGURATION
// ====================================

const mssqlConfig = {
    server: "SG2NWPLS19SQL-v09.mssql.shr.prod.sin2.secureserver.net",
    port: 1433,
    database: "testwhatsapp",
    user: "testwhatsapp",
    password: process.env.MSSQL_PASSWORD,

    options: {
        encrypt: true,
        trustServerCertificate: true
    },

    connectionTimeout: 30000,
    requestTimeout: 30000
};


// ====================================
// AUTHENTICATED READ-ONLY EJS SQL CONSOLE
// Configure SQL_CONSOLE_USER, SQL_CONSOLE_PASSWORD and a SELECT-only MySQL account.
// ====================================
const SQL_CONSOLE_VIEW = pathModule.join(__dirname, "views", "sql-console.ejs");
const MAX_SQL_BODY_BYTES = 12 * 1024;

function constantTimeEqual(a, b) {
    const x = crypto.createHash("sha256").update(String(a)).digest();
    const y = crypto.createHash("sha256").update(String(b)).digest();
    return crypto.timingSafeEqual(x, y);
}

function consoleAuthorized(req) {
    const user = process.env.SQL_CONSOLE_USER;
    const pass = process.env.SQL_CONSOLE_PASSWORD;
    if (!user || !pass || !req.headers.authorization?.startsWith("Basic ")) return false;
    try {
        const decoded = Buffer.from(req.headers.authorization.slice(6), "base64").toString("utf8");
        const i = decoded.indexOf(":");
        return i >= 0 && constantTimeEqual(decoded.slice(0, i), user) && constantTimeEqual(decoded.slice(i + 1), pass);
    } catch { return false; }
}

async function handleSqlConsole(req, res) {
    // Ignore permissive CORS settings of the legacy demonstration server.
    res.removeHeader("Access-Control-Allow-Origin");
    res.removeHeader("Access-Control-Allow-Methods");
    res.removeHeader("Access-Control-Allow-Headers");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    if (!consoleAuthorized(req)) {
        res.writeHead(401, { "WWW-Authenticate": 'Basic realm="MySQL Query Console", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" });
        res.end("Authentication required. Configure SQL_CONSOLE_USER and SQL_CONSOLE_PASSWORD.");
        return;
    }
    if (req.method !== "GET" && req.method !== "POST") {
        res.writeHead(405, { Allow: "GET, POST" }); res.end("Method not allowed"); return;
    }

    let query = "SELECT * FROM task LIMIT 10";
    let fields = [], rows = [], message = "", error = "";
    if (req.method === "POST") {
        try {
            let body = "";
            for await (const chunk of req) {
                body += chunk.toString("utf8");
                if (Buffer.byteLength(body, "utf8") > MAX_SQL_BODY_BYTES) {
                    res.writeHead(413); res.end("Query too large"); return;
                }
            }
            query = new URLSearchParams(body).get("query") || "";
            const q = query.trim().replace(/;\s*$/, "");
            // This gate is for usability, NOT a security boundary. The DB account must be read-only.
            if (!/^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(q) || q.includes(";")) {
                error = "Only one read-only SELECT, SHOW, DESCRIBE or EXPLAIN statement is allowed.";
            } else if (q.length > 4000) {
                error = "Query length must not exceed 4,000 characters.";
            } else {
                const connection = await mysql.createConnection({
                    host: process.env.SQL_CONSOLE_DB_HOST || process.env.DB_HOST,
                    port: Number(process.env.SQL_CONSOLE_DB_PORT || process.env.DB_PORT || 3306),
                    database: process.env.SQL_CONSOLE_DB_NAME || process.env.DB_NAME,
                    user: process.env.SQL_CONSOLE_DB_USER,
                    password: process.env.SQL_CONSOLE_DB_PASSWORD,
                    multipleStatements: false,
                    connectTimeout: 10000
                });
                try {
                    const [result, metadata] = await connection.query({ sql: q, timeout: 10000 });
                    if (!Array.isArray(result)) throw new Error("Expected a read-only result set");
                    fields = metadata.map(f => f.name);
                    rows = result.slice(0, 100).map(r => fields.map(k => {
                        const v = r[k];
                        if (v === null || v === undefined) return "NULL";
                        if (Buffer.isBuffer(v)) return "[binary data]";
                        if (v instanceof Date) return v.toISOString();
                        return typeof v === "object" ? JSON.stringify(v) : String(v);
                    }));
                    message = `${result.length} row(s) returned` + (result.length > 100 ? "; showing first 100" : "");
                } finally { await connection.end().catch(e => console.error("Console close error:", e)); }
            }
        } catch (e) {
            console.error("SQL console error:", e);
            error = "Could not execute the query. Check the server logs and database permissions.";
        }
    }
    const html = await ejs.renderFile(SQL_CONSOLE_VIEW, { query, fields, rows, message, error });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
}

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

    if (path === "/sql-console") {
        try { await handleSqlConsole(req, res); }
        catch (err) { console.error("EJS rendering error:", err); if (!res.headersSent) res.writeHead(500); res.end("Internal server error"); }
        return;
    }

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
    "SELECT DATABASE() AS database_name"
);

console.log("MySQL Database Name:", rows[0].database_name);

res.end(
    "MySQL Connected Successfully!\n\n" +
    "Database Name: " + rows[0].database_name
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
else if (path==="/rohit")
{
        res.end("rohit");
        }
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

else if (path === "/show-tables") {

    let connection;

    try {

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const [rows] = await connection.query("SELECT * FROM task");

        res.end(JSON.stringify(rows, null, 2));

    } catch (error) {

        res.statusCode = 500;
        res.end(error.message);

    } finally {

        if (connection) await connection.end();

    }

}

    // ====================================
// INSERT DATA INTO MYSQL TABLE
// ====================================

else if (path === "/insert-task") {

    let connection;

    try {

        const taskName = url.searchParams.get("task_name");
        const message = url.searchParams.get("message");

        if (!taskName || !message) {
            res.statusCode = 400;
            res.end("Please provide task_name and message");
            return;
        }

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const query = `INSERT INTO task (task_name, message)VALUES (?, ?)`;

        const [result] = await connection.execute(query,[taskName, message]);
        res.end("Data Inserted Successfully!\n" + "Inserted ID: " + result.insertId);

    } catch (error) {

        console.log("Insert Error:", error);
        res.statusCode = 500;
        res.end("Insert Failed: " + error.message);

    } finally {

        if (connection)
        {
            await connection.end();
        }

    }

}



else if (path === "/update-task") {

    let connection;

    try {

        const id= url.searchParams.get("id");
        const task_name = url.searchParams.get("task_name");
        const message = url.searchParams.get("message");

        if (!id || !task_name || !message) {
            res.statusCode = 400;
            res.end("Please provide id and task_name and message");
            return;
        }

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const query = `update task set task_name=?, message=? where id=?`;

        const [result] = await connection.execute(query,[task_name, message,id]);
          if(result.affectedRows===0){
              res.end("Task Not Found");
          }else{
              res.end("Task Updated Successfully");
          }
    } catch (error) {

        console.log("Update Error:", error);
        res.statusCode = 500;
        res.end("Update Failed: " + error.message);

    } finally {

        if (connection)
        {
            await connection.end();
        }

    }

}

    else if (path === "/delete-task") {

    let connection;

    try {

        const id= url.searchParams.get("id");
        
        if (!id) {
            res.statusCode = 400;
            res.end("Please provide id");
            return;
        }

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        const query = `delete from task where id=?`;

        const [result] = await connection.execute(query,[id]);
          if(result.affectedRows===0){
              res.end("Tast Is Not Delete");
          }else{
              res.end("Task Is Delete Successfully");
          }
    } catch (error) {

        console.log("Update Error:", error);
        res.statusCode = 500;
        res.end("Update Failed: " + error.message);

    } finally {

        if (connection)
        {
            await connection.end();
        }

    }

}


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
