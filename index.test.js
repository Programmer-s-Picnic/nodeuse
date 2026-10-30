"use strict";
// NodeUse beginner program and GoDaddy API tests. Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { server } = require("./index.js");

test("Hello World, Hello Name, arithmetic, conditions and loops", async (t) => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = "http://127.0.0.1:" + server.address().port;
  async function api(route, expected = 200, headers) {
    const result = await fetch(root + route, { headers });
    assert.equal(result.status, expected, route);
    return result.headers.get("content-type")?.includes("application/json") ? result.json() : result.text();
  }

  assert.match(await api("/"), /Hello World/);
  const hello = await api("/api/hello");
  assert.equal(hello.connected, true);
  assert.match(hello.message, /Hello World/);
  assert.equal((await api("/api/hello-name?name=Champak")).message, "Hello Champak!");
  assert.equal((await api("/api/hello-name?name=Riya%20Sharma")).message, "Hello Riya Sharma!");
  assert.equal((await api("/api/add?a=12&b=8")).result, 20);
  assert.equal((await api("/api/subtract?a=12&b=8")).result, 4);
  assert.equal((await api("/api/multiply?a=12&b=8")).result, 96);
  assert.equal((await api("/api/divide?a=12&b=3")).result, 4);
  assert.equal((await api("/api/even-odd?n=9")).result, "Odd");
  assert.equal((await api("/api/even-odd?n=0")).result, "Even");
  assert.equal((await api("/api/largest?a=7&b=25&c=19")).largest, 25);
  assert.deepEqual((await api("/api/table?n=3&upto=5")).table, [3, 6, 9, 12, 15]);
  assert.equal((await api("/api/factorial?n=0")).result, 1);
  assert.equal((await api("/api/factorial?n=5")).result, 120);
  assert.deepEqual((await api("/api/fibonacci?count=7")).sequence, [0, 1, 1, 2, 3, 5, 8]);
  const stats = await api("/api/array-stats?numbers=10%2C20%2C30");
  assert.equal(stats.sum, 60);
  assert.equal(stats.average, 20);
  assert.equal((await api("/api/palindrome?text=Madam")).palindrome, true);
  assert.equal((await api("/api/palindrome?text=Hello")).palindrome, false);
  assert.equal((await api("/api/grade?marks=80")).grade, "B");
  assert.equal((await api("/health")).status, "ok");

  // Every endpoint in this demo is public and read-only. Browsers from any
  // origin may read it without credentials; production user data is different.
  for (const origin of [
    "https://nodeuse.learnwithchampak.live",
    "http://nodeuse.learnwithchampak.live",
    "https://example.org"
  ]) {
    const result = await fetch(root + "/api/hello", { headers: { Origin: origin } });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("access-control-allow-origin"), "*");
    assert.equal(result.headers.get("x-nodeuse-api-version"), "2026-10-30-cors-fix");
    const preflight = await fetch(root + "/api/add?a=1&b=2", {
      method: "OPTIONS", headers: {
        Origin: origin,
        "Access-Control-Request-Method": "GET"
      }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
    assert.match(preflight.headers.get("access-control-allow-methods"), /GET/);
  }
  const diagnostics = await api("/api/diagnostics", 200, {
    Origin: "https://nodeuse.learnwithchampak.live"
  });
  assert.equal(diagnostics.cors, "public-read-only");
  assert.equal(diagnostics.allowOrigin, "*");
  assert.equal(diagnostics.apiVersion, "2026-10-30-cors-fix");

  for (const path of [
    "/api/hello-name", "/api/hello-name?name=",
    "/api/add?a=1", "/api/add?a=hello&b=2",
    "/api/divide?a=10&b=0", "/api/even-odd?n=2.2",
    "/api/factorial?n=-3", "/api/factorial?n=171",
    "/api/fibonacci?count=10000", "/api/table?n=4&upto=300",
    "/api/array-stats?numbers=1%2Cabc", "/api/grade?marks=120"
  ]) {
    const result = await api(path, 400);
    assert.ok(result.error, path);
  }
  assert.equal((await api("/no-such-route", 404)).error, "Not found");
});
