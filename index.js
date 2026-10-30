"use strict";

// NodeUse: small GoDaddy Node.js programs, from Hello World onwards.
// Built-in Node.js modules only. GET demos; tasks remain local to the browser.
const http = require("node:http");
const PORT = Number(process.env.PORT) || 3000;
// This tutorial exposes ONLY public, read-only GET examples — no cookies, users,
// or secrets. Wildcard CORS is appropriate here. Do not copy it to an
// authenticated or personal-data API without a proper access-control design.
const API_VERSION = "2026-10-30-jsonp-fallback";

function sendJSON(res, status, payload) {
  // JSONP is enabled only for this public read-only teaching API. It lets the
  // GitHub Pages lesson work even if a hosting proxy strips CORS headers.
  // Never expose account data, credentials or private responses through JSONP.
  const callback = res.jsonpCallback;
  if (callback) {
    const safeJSON = JSON.stringify(payload).replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    res.writeHead(status, { "Content-Type": "application/javascript; charset=utf-8" });
    return res.end(callback + "(" + safeJSON + ");");
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
function bad(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
function requiredText(query, key, maxLength = 60) {
  const value = query.get(key);
  if (value === null || !value.trim()) bad("Parameter '" + key + "' is required.");
  if (value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value))
    bad("Parameter '" + key + "' must be at most " + maxLength + " printable characters.");
  return value.trim();
}
function numberParam(query, key, { integer = false, min = -1000000000, max = 1000000000 } = {}) {
  const raw = query.get(key);
  if (raw === null || !raw.trim()) bad("Parameter '" + key + "' is required.");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
    bad("Parameter '" + key + "' must be " + (integer ? "an integer" : "a number") + " from " + min + " to " + max + ".");
  return value;
}
function listParam(query) {
  const raw = requiredText(query, "numbers", 600);
  const values = raw.split(",").map(item => item.trim());
  if (values.length < 1 || values.length > 50 || values.some(item => item === "" || !Number.isFinite(Number(item)) || Math.abs(Number(item)) > 1e9))
    bad("Provide 1 to 50 comma-separated numbers, each between -1000000000 and 1000000000.");
  return values.map(Number);
}

function exercise(path, query) {
  // Every exercise is a tiny, standalone program represented by one GET route.
  if (path === "/api/hello-name") {
    const name = requiredText(query, "name");
    return { message: "Hello " + name + "!", name };
  }
  if (["/api/add", "/api/subtract", "/api/multiply", "/api/divide"].includes(path)) {
    const a = numberParam(query, "a"), b = numberParam(query, "b");
    const operations = {
      "/api/add": ["+", () => a + b],
      "/api/subtract": ["-", () => a - b],
      "/api/multiply": ["*", () => a * b],
      "/api/divide": ["/", () => a / b]
    };
    if (path === "/api/divide" && b === 0) bad("Cannot divide by zero.");
    const [operator, calculate] = operations[path];
    return { a, b, operator, result: calculate() };
  }
  if (path === "/api/even-odd") {
    const n = numberParam(query, "n", { integer: true });
    return { n, result: n % 2 === 0 ? "Even" : "Odd" };
  }
  if (path === "/api/largest") {
    const a = numberParam(query, "a"), b = numberParam(query, "b"), c = numberParam(query, "c");
    return { a, b, c, largest: Math.max(a, b, c) };
  }
  if (path === "/api/table") {
    const n = numberParam(query, "n", { integer: true, min: -10000, max: 10000 });
    const upto = query.has("upto") ? numberParam(query, "upto", { integer: true, min: 1, max: 30 }) : 10;
    return { n, upto, table: Array.from({ length: upto }, (_, i) => n * (i + 1)) };
  }
  if (path === "/api/factorial") {
    const n = numberParam(query, "n", { integer: true, min: 0, max: 170 });
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return { n, result };
  }
  if (path === "/api/fibonacci") {
    const count = numberParam(query, "count", { integer: true, min: 1, max: 78 });
    const sequence = [];
    let a = 0, b = 1;
    for (let i = 0; i < count; i++) { sequence.push(a); [a, b] = [b, a + b]; }
    return { count, sequence };
  }
  if (path === "/api/array-stats") {
    const numbers = listParam(query);
    const sum = numbers.reduce((a, b) => a + b, 0);
    return { numbers, count: numbers.length, sum, average: sum / numbers.length, min: Math.min(...numbers), max: Math.max(...numbers) };
  }
  if (path === "/api/palindrome") {
    const text = requiredText(query, "text", 100);
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
    return { text, palindrome: normalized === [...normalized].reverse().join("") };
  }
  if (path === "/api/grade") {
    const marks = numberParam(query, "marks", { min: 0, max: 100 });
    const grade = marks >= 90 ? "A" : marks >= 75 ? "B" : marks >= 60 ? "C" : marks >= 40 ? "D" : "F";
    return { marks, grade };
  }
  return null;
}

const server = http.createServer((req, res) => {
  // Allow requests from the NodeUse GitHub Pages custom domain and any other
  // frontend for these harmless public demonstrations. No credentials allowed.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.setHeader("X-NodeUse-API-Version", API_VERSION);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (req.method !== "GET") return sendJSON(res, 405, { error: "Method not allowed" });

  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch { return sendJSON(res, 400, { error: "Invalid URL" }); }

  const callback = url.searchParams.get("callback");
  if (callback !== null) {
    // Only predictable single global identifiers, never arbitrary JS text.
    if (!/^__nodeuse_jsonp_[A-Za-z0-9_]{10,45}$/.test(callback)) {
      return sendJSON(res, 400, { error: "Invalid JSONP callback." });
    }
    // JSONP only for explicitly public API examples (no file or task storage).
    if (!url.pathname.startsWith("/api/")) {
      return sendJSON(res, 404, { error: "JSONP is available only for public API routes." });
    }
    res.jsonpCallback = callback;
  }

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Hello World! Welcome to Programmer's Picnic.");
  }
  if (url.pathname === "/api/diagnostics") {
    return sendJSON(res, 200, {
      service: "nodeuse-hello-api",
      status: "ok",
      apiVersion: API_VERSION,
      cors: "public-read-only",
      allowOrigin: "*",
      receivedOrigin: req.headers.origin || null,
      note: "No credentials or private data in this teaching API"
    });
  }
  if (url.pathname === "/health") {
    return sendJSON(res, 200, { status: "ok", service: "nodeuse-hello-api", apiVersion: API_VERSION });
  }
  if (url.pathname === "/api/hello") {
    return sendJSON(res, 200, {
      connected: true, message: "Hello World! GitHub Pages is connected to Node.js on GoDaddy.",
      source: "GoDaddy Node.js", lesson: "0 to Infinity", apiVersion: API_VERSION, timestamp: new Date().toISOString()
    });
  }
  try {
    const result = exercise(url.pathname, url.searchParams);
    if (result !== null) return sendJSON(res, 200, result);
  } catch (error) {
    return sendJSON(res, error.status || 500, { error: error.status ? error.message : "Internal error" });
  }
  return sendJSON(res, 404, { error: "Not found", path: url.pathname });
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => console.log("NodeUse API listening on port " + PORT));
}
module.exports = { server, exercise };
