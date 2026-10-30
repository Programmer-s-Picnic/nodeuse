"use strict";

// Node.js on GoDaddy — Level 0 → 2: Hello World, routing, JSON and CORS.
// Runs with built-in Node modules only. No database or authentication yet.
const http = require("node:http");

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://programmer-s-picnic.github.io,http://localhost:5500,http://127.0.0.1:5500")
  .split(",").map(s => s.trim()).filter(Boolean);

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(origin && ALLOWED_ORIGINS.includes(origin) ? 204 : 403);
    return res.end();
  }
  if (req.method !== "GET") return sendJSON(res, 405, { error: "Method not allowed" });

  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Hello World! Welcome to Programmer's Picnic.");
  }
  if (path === "/api/hello") {
    return sendJSON(res, 200, {
      connected: true,
      message: "Hello World! GitHub Pages is connected to Node.js on GoDaddy.",
      source: "GoDaddy Node.js",
      lesson: "0 to Infinity",
      timestamp: new Date().toISOString()
    });
  }
  if (path === "/health") {
    return sendJSON(res, 200, { status: "ok", service: "nodeuse-hello-api" });
  }
  return sendJSON(res, 404, { error: "Not found", path });
});

function sendJSON(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("Hello World API listening on port " + PORT);
});
