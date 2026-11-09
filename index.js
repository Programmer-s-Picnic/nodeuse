"use strict";

const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// MySQL connection settings are provided through GoDaddy environment variables.
const dbConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectTimeout: 10000
};

async function dbConnect() {
    return mysql.createConnection(dbConfig);
}

// Keep the existing EJS home page unchanged.
app.get("/", (req, res) => {
    // res.send("<h1>Hello World Express</h1>");
      let name = ["Dhoni", "Virat", "Hardik"];
    res.render("hello.ejs",{username: name});
    
});

// Temporary MySQL connectivity test.
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
            try {
                await connection.end();
            } catch (error) {
                console.error("MySQL close error:", error.message);
            }
        }
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
