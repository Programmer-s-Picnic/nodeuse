
"use strict";
const { ename } = require('ejs');
const express = require('express');
const app = express();






const config = {
  server: "SG2NWPLS19SQL-v09.mssql.shr.prod.sin2.secureserver.net",
  port: 1433,
  database: "testwhatsapp",
  user: "testwhatsapp",
  password: "M%E4Zn3li3oxjkp_",

  options: {
    encrypt: true,
    trustServerCertificate: true
  },

  connectionTimeout: 30000,
  requestTimeout: 30000
};










const http = require("node:http");

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {

    // Allow requests from GitHub Pages
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // Read name from URL
    const url = new URL(req.url, "http://localhost");
    const path=url.pathname;

    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });
  
if(path=="/sql"){
  let pool="Connection";
//  pool =  new sql.ConnectionPool(config).connect();
    res.end(`SQL` + path + pool);
}
  else
if(path=="/add"){
    res.end(`Jodo` + path);
}
    else
    if(path=="/sub"){
    res.end(`Ghatao` + path);
}
    else
     res.end(`Party karo` + path);
    
     
    

});

// Start server
if (require.main === module) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = { server };
