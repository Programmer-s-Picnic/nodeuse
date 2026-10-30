// Run in the nodeuse repository root: npm test. Uses built-in Node test runner and no dependencies.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");

test("serves Hello World and CORS-enabled JSON", async () => {
  const port = 18000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ["index.js"], {
    cwd: __dirname, env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    await Promise.race([once(child.stdout, "data"), once(child, "exit").then(() => { throw Error("Server exited"); })]);
    const base = "http://127.0.0.1:" + port;
    const hello = await fetch(base + "/");
    assert.equal(hello.status, 200);
    assert.match(await hello.text(), /Hello World/);
    const json = await fetch(base + "/api/hello", { headers: { Origin: "http://nodeuse.learnwithchampak.live" } });
    assert.equal(json.status, 200);
    assert.equal(json.headers.get("access-control-allow-origin"), "http://nodeuse.learnwithchampak.live");
    const secureCustomOrigin = await fetch(base + "/api/hello", { headers: { Origin: "https://nodeuse.learnwithchampak.live" } });
    assert.equal(secureCustomOrigin.headers.get("access-control-allow-origin"), "https://nodeuse.learnwithchampak.live");
    assert.equal((await json.json()).connected, true);
    const health = await fetch(base + "/health");
    assert.equal((await health.json()).status, "ok");
    const badOrigin = await fetch(base + "/api/hello", { headers: { Origin: "https://example.org" } });
    assert.equal(badOrigin.headers.get("access-control-allow-origin"), null);
    const missing = await fetch(base + "/missing");
    assert.equal(missing.status, 404);
  } finally { child.kill(); }
});
