"use strict";

const express = require("express");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeout: 10000
};

const dbPool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 5 });
async function dbConnect() {
    return mysql.createConnection(dbConfig);
}

app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false, limit: "8kb" }));
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// Educational example: sessions are stored in server memory, not in taskusers.
// Restarting the server logs users out. Do not use this session store for a
// real, multi-instance production application.
const sessions = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000;
const loginAttempts = new Map();
function cookies(req) {
    return Object.fromEntries((req.headers.cookie || "").split(";").map(part => {
        const i = part.indexOf("=");
        return i < 0 ? ["", ""] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }).filter(([key]) => key));
}
function sessionFor(req, res) {
    const id = cookies(req).task_session;
    const found = id && sessions.get(id);
    if (found && found.expires > Date.now()) {
        found.expires = Date.now() + SESSION_MS;
        return found;
    }
    if (id) sessions.delete(id);
    const token = crypto.randomBytes(32).toString("hex");
    const record = { id: token, csrf: crypto.randomBytes(32).toString("hex"),
        username: null, name: null, expires: Date.now() + SESSION_MS };
    sessions.set(token, record);
    res.cookie("task_session", token, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MS, path: "/"
    });
    return record;
}
function csrfCheck(req, res, next) {
    const session = sessionFor(req, res);
    const submitted = req.body.csrf || "";
    const same = typeof submitted === "string" &&
        Buffer.byteLength(submitted) === Buffer.byteLength(session.csrf) &&
        crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(session.csrf));
    if (!same) return res.status(403).send("Invalid form token. Reload the page and try again.");
    next();
}
function requireLogin(req, res, next) {
    const session = sessionFor(req, res);
    if (!session.username) return res.redirect("/login");
    req.user = { username: session.username, name: session.name };
    next();
}
function credentials(req) {
    return {
        username: String(req.body.username || "").trim(),
        name: String(req.body.name || "").trim(),
        password: String(req.body.password || "")
    };
}
function dbError(res, err) {
    console.error("Task users database error:", err.code || err.message);
    return res.status(500).send("Database unavailable. Please try later.");
}

// Existing EJS home page is preserved, including the username array.
app.get("/", (req, res) => {
    // res.send("<h1>Hello World Express</h1>");
      let name = ["Dhoni", "Virat", "Hardik"];
    res.render("hello.ejs",{username: name});
});

app.get("/mysql-check", async (req, res) => {
    let connection;
    try {
        connection = await dbConnect();
        await connection.query("SELECT 1");
        res.type("text/plain").send("MySQL Connection Successful");
    } catch (error) {
        console.error("MySQL Error:", error.message);
        res.status(500).type("text/plain").send("MySQL Connection Failed");
    } finally {
        if (connection) {
            try { await connection.end(); }
            catch (error) { console.error("MySQL close error:", error.message); }
        }
    }
});

// SQL table: taskusers(username, name, password).
// WARNING: This explicitly stores passwords in clear text for a classroom
// demonstration only. Never reuse a real password or deploy as real auth.
app.get("/register", (req, res) => {
    const session = sessionFor(req, res);
    res.render("register", { csrf: session.csrf, error: null });
});
app.post("/register", csrfCheck, async (req, res) => {
    const { username, name, password } = credentials(req);
    if (!/^[A-Za-z0-9_]{3,40}$/.test(username) || name.length < 1 ||
        name.length > 100 || password.length < 6 || password.length > 100) {
        return res.status(400).render("register", {
            csrf: sessionFor(req, res).csrf,
            error: "Username: 3–40 letters, digits or underscores. Name: 1–100 characters. Password: 6–100 characters."
        });
    }
    try {
        await dbPool.execute(
            "INSERT INTO taskusers (username, name, password) VALUES (?, ?, ?)",
            [username, name, password]
        );
        return res.redirect("/login?registered=1");
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY")
            return res.status(409).render("register", {
                csrf: sessionFor(req, res).csrf, error: "That username is already taken."
            });
        return dbError(res, err);
    }
});

app.get("/login", (req, res) => {
    res.render("login", { csrf: sessionFor(req, res).csrf,
        error: null, registered: req.query.registered === "1" });
});
app.post("/login", csrfCheck, async (req, res) => {
    const { username, password } = credentials(req);
    const key = req.ip || "unknown";
    const attempts = loginAttempts.get(key) || { count: 0, until: Date.now() + 15 * 60 * 1000 };
    if (attempts.until < Date.now()) { attempts.count = 0; attempts.until = Date.now() + 15 * 60 * 1000; }
    if (attempts.count >= 10) return res.status(429).send("Too many attempts. Try again later.");
    if (!username || !password) return res.status(400).render("login", {
        csrf: sessionFor(req, res).csrf, error: "Enter username and password.", registered: false
    });
    try {
        const [rows] = await dbPool.execute(
            "SELECT username, name FROM taskusers WHERE username = ? AND password = ? LIMIT 1",
            [username, password]
        );
        if (!rows.length) {
            attempts.count++;
            loginAttempts.set(key, attempts);
            return res.status(401).render("login", {
                csrf: sessionFor(req, res).csrf, error: "Invalid username or password.", registered: false
            });
        }
        loginAttempts.delete(key);
        const old = sessionFor(req, res);
        sessions.delete(old.id);
        res.clearCookie("task_session", { path: "/" });
        const fresh = sessionFor({ headers: { cookie: "" } }, res);
        fresh.username = rows[0].username;
        fresh.name = rows[0].name;
        return res.redirect("/protected");
    } catch (err) { return dbError(res, err); }
});

app.get("/protected", requireLogin, (req, res) => {
    res.render("protected", { user: req.user, csrf: sessionFor(req, res).csrf });
});

app.get("/logout", (req, res) => {
    const session = sessionFor(req, res);
    res.render("logout", { csrf: session.csrf, username: session.username });
});
app.post("/logout", csrfCheck, (req, res) => {
    const session = sessionFor(req, res);
    sessions.delete(session.id);
    res.clearCookie("task_session", { path: "/" });
    return res.redirect("/login");
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
