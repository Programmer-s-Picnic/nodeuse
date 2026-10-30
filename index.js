"use strict";

// NodeUse: small GoDaddy Node.js programs, from Hello World onwards.
// Built-in Node.js modules only. GET demos; tasks remain local to the browser.
const http = require("node:http");
const PORT = Number(process.env.PORT) || 3000;
// This tutorial exposes ONLY public, read-only GET examples — no cookies, users,
// or secrets. Wildcard CORS is appropriate here. Do not copy it to an
// authenticated or personal-data API without a proper access-control design.
const API_VERSION = "2026-10-30-jsonp-fallback";


 

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

  

 
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Hello Champak");
  
 
 
  
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => console.log("NodeUse API listening on port " + PORT));
}
module.exports = { server, exercise };
