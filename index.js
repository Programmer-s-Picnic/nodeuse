
"use strict";

const http = require("node:http");
const ejs = require("ejs");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    if (req.url === "/mysql-console") {
        try {
            const html = await ejs.renderFile(
                path.join(__dirname, "views", "sql-console.ejs"),
                {
                    query: "",
                    fields: [],
                    rows: [],
                    message: "",
                    error: ""
                }
            );

            res.end(html);
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end("Error loading SQL Console");
        }

    } else if (req.url === "/mysql-admin") {
        res.end("<h1>MySQL Admin</h1>");

    } else {
        res.end("<h1>Hello World!</h1>");
    }

});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
