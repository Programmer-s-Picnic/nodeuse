
"use strict";

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

    const name = url.searchParams.get("name") || "Champak";
    const a=Number(url.searchParams.get("a"));
    const b=Number(url.searchParams.get("b"));
let result="equal";
    if(a>b){
        result "a>b";
    }
    else if(b>a){
        result="b>a";
    }
    
        
    
   

    // Return greeting
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

//    res.end("Hello " + name+" Ji");
res.end(result);
    

});

// Start server
if (require.main === module) {
    server.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = { server };
