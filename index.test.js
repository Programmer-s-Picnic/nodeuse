"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("./index.js");

test("Hello Name server: query parameters and CORS", async (t) => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = "http://127.0.0.1:" + server.address().port;
  const cases = [
    ["/", "Hello Champak"],
    ["/?name=Sunny", "Hello Sunny"],
    ["/?name=Priya", "Hello Priya"],
    ["/?name=Riya%20Sharma", "Hello Riya Sharma"],
    ["/?name=", "Hello Champak"]
  ];
  for (const [route, expected] of cases) {
    const response = await fetch(root + route, {headers: {Origin: "https://nodeuse.learnwithchampak.live"}});
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text.plain/);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(await response.text(), expected);
  }
  const preflight = await fetch(root + "/?name=Sunny", {method: "OPTIONS", headers: {Origin: "https://nodeuse.learnwithchampak.live", "Access-Control-Request-Method": "GET"}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
});
