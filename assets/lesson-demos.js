/* NodeUse beginner course demos.
   "Run in browser" uses JavaScript in the learner's browser (not GoDaddy).
   "Test on GoDaddy" makes a genuine request to the configured API and reports failure honestly. */
(() => {
  "use strict";
  const DEFAULT_API = "https://11vhaiejwu.c39.airoapp.ai";
  const KEY = "pp-nodeuse-api-v1";
  const get = (object, key) => object[key];
  const numeric = (data, key) => {
    if (String(get(data, key) ?? "").trim() === "") throw Error("Enter " + key + ".");
    const n = Number(get(data, key));
    if (!Number.isFinite(n)) throw Error(key + " must be a number.");
    return n;
  };
  const integer = (data, key, min = -1e9, max = 1e9) => {
    const n = numeric(data, key);
    if (!Number.isInteger(n) || n < min || n > max) throw Error(key + " must be an integer between " + min + " and " + max + ".");
    return n;
  };
  const input = (data, key) => {
    const value = String(get(data, key) ?? "").trim();
    if (!value) throw Error("Enter " + key + ".");
    return value;
  };
  const routes = {
    1: "/api/hello", 2: "/api/hello-name", 3: "/api/add",
    4: "/api/subtract", 5: "/api/multiply", 6: "/api/divide",
    7: "/api/even-odd", 8: "/api/largest", 9: "/api/table",
    10: "/api/factorial", 11: "/api/fibonacci", 12: "/api/array-stats",
    13: "/api/palindrome", 14: "/api/grade"
  };
  function runLocal(id, data) {
    if (id === 1) return { message: "Hello World!" };
    if (id === 2) return { message: "Hello " + input(data, "name") + "!" };
    if ([3, 4, 5, 6].includes(id)) {
      const a = numeric(data, "a"), b = numeric(data, "b");
      if (id === 6 && b === 0) throw Error("Cannot divide by zero.");
      return { result: id === 3 ? a + b : id === 4 ? a - b : id === 5 ? a * b : a / b };
    }
    if (id === 7) return { result: integer(data, "n") % 2 === 0 ? "Even" : "Odd" };
    if (id === 8) return { largest: Math.max(numeric(data, "a"), numeric(data, "b"), numeric(data, "c")) };
    if (id === 9) {
      const n = integer(data, "n", -10000, 10000), upto = integer(data, "upto", 1, 30);
      return { table: Array.from({ length: upto }, (_, i) => (i + 1) * n) };
    }
    if (id === 10) {
      const n = integer(data, "n", 0, 170);
      let total = 1;
      for (let i = 2; i <= n; i++) total *= i;
      return { result: total };
    }
    if (id === 11) {
      const count = integer(data, "count", 1, 78), sequence = [];
      let a = 0, b = 1;
      for (let i = 0; i < count; i++) { sequence.push(a); [a, b] = [b, a + b]; }
      return { sequence };
    }
    if (id === 12) {
      const numbers = input(data, "numbers").split(",").map(v => v.trim());
      if (numbers.length > 50 || numbers.some(v => !v || !Number.isFinite(Number(v)) || Math.abs(Number(v)) > 1e9))
        throw Error("Enter 1 to 50 comma-separated numbers.");
      const nums = numbers.map(Number), sum = nums.reduce((a, b) => a + b, 0);
      return { count: nums.length, sum, average: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
    }
    if (id === 13) {
      const clean = input(data, "text").toLowerCase().replace(/[^a-z0-9]/g, "");
      return { palindrome: clean === [...clean].reverse().join("") };
    }
    if (id === 14) {
      const marks = numeric(data, "marks");
      if (marks < 0 || marks > 100) throw Error("Marks must be between 0 and 100.");
      return { grade: marks >= 90 ? "A" : marks >= 75 ? "B" : marks >= 60 ? "C" : marks >= 40 ? "D" : "F" };
    }
    throw Error("This lesson is a guided project. Use the code and links below.");
  }
  function getApiUrl() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (typeof saved === "string" && saved.trim()) {
        const url = new URL(saved);
        // GoDaddy previews are private and unusable from a public Pages site.
        if (url.hostname !== "11vhaiejwu.preview.c39.airoapp.ai" &&
            !url.search && !url.hash && (url.protocol === "https:" ||
            (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))))
          return url.origin;
      }
    } catch {}
    return DEFAULT_API;
  }
  function readForm(form) {
    const values = {};
    for (const element of form.querySelectorAll("[name]")) values[element.name] = element.value;
    return values;
  }
  document.querySelectorAll("[data-demo]").forEach(form => {
    const id = Number(form.dataset.demo);
    const out = form.querySelector("[data-demo-result]");
    const browser = form.querySelector("[data-demo-local]");
    const remote = form.querySelector("[data-demo-server]");
    const show = (heading, value) => {
      out.hidden = false;
      out.textContent = heading + "\n" + (typeof value === "string" ? value : JSON.stringify(value, null, 2));
    };
    browser?.addEventListener("click", () => {
      try { show("Browser practice (JavaScript, not GoDaddy):", runLocal(id, readForm(form))); }
      catch (error) { show("Input error:", error.message); }
    });
    remote?.addEventListener("click", async () => {
      try {
        const fields = readForm(form);
        runLocal(id, fields); // Check basic inputs before sending.
        const base = new URL(getApiUrl());
        if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
          throw Error("Use an HTTPS GoDaddy API URL.");
        if (base.search || base.hash || base.username || base.password)
          throw Error("Use an API base URL without query strings or sharing tokens.");
        remote.disabled = true;
        show("Connecting to the published GoDaddy API…", routes[id]);
        const url = new URL(routes[id], base.origin);
        Object.entries(fields).forEach(([key, value]) => url.searchParams.set(key, value));
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);
        try {
          try {
            const response = await fetch(url.href, { signal: controller.signal, cache: "no-store", credentials: "omit" });
            const type = response.headers.get("content-type") || "";
            if (!type.includes("application/json")) throw Error("The server returned a non-JSON page.");
            const body = await response.json();
            if (!response.ok) throw Error(body.error || "HTTP " + response.status);
            show("GoDaddy API using normal fetch (HTTP " + response.status + "):", body);
          } catch (fetchError) {
            if ((fetchError instanceof TypeError || fetchError.name === "AbortError") &&
                window.NodeUseJSONP) {
              show("Trying public-only JSONP fallback…", routes[id]);
              const data = await window.NodeUseJSONP.call(url.href);
              show("GoDaddy API via JSONP (browser CORS blocked; public examples only):", data);
            } else {
              throw fetchError;
            }
          }
        } finally { clearTimeout(timeout); }
      } catch (error) {
        show("Could not access the published GoDaddy API:", error.message + "\nOpen " + DEFAULT_API + "/api/diagnostics directly. If it fails, use the URL in the GoDaddy Published tab. If the version is old, Update Preview → Publish to Live. Browser practice still works offline.");
      } finally { remote.disabled = false; }
    });
  });
})();
