/* Shared UI for the task manager and the 0 → Infinity course.
   User tasks stay in this browser; the GoDaddy Hello World API is read-only. */
(function () {
  "use strict";
  const TASK_KEY = "pp-nodeuse-tasks-v1";
  const API_KEY = "pp-nodeuse-api-v1";
  const PROGRESS_KEY = "pp-node-godaddy-course-v2";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function read(key, fallback) {
    try { const val = localStorage.getItem(key); return val === null ? fallback : JSON.parse(val); }
    catch { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch { alert("Browser storage is unavailable. Tasks cannot be saved in this browser."); return false; }
  }
  function tasks() {
    const records = read(TASK_KEY, []);
    return Array.isArray(records) ? records.filter(t => t && typeof t.id === "string" && typeof t.name === "string") : [];
  }
  function newId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }
  function getStats() {
    const list = tasks();
    setText("[data-count-all]", String(list.length));
    setText("[data-count-active]", String(list.filter(t => t.status !== "Completed").length));
    setText("[data-count-done]", String(list.filter(t => t.status === "Completed").length));
  }
  function setText(selector, value) {
    $$(selector).forEach(el => { el.textContent = value; });
  }
  function dateText(value) {
    if (!value) return "No due date";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "No due date" :
      new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
  }
  function element(tag, className, textValue) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textValue !== undefined) el.textContent = textValue;
    return el;
  }
  function statusBadge(status) {
    const badge = element("span", "task-status " + (status === "Completed" ? "done" : status === "In Progress" ? "working" : "pending"), status);
    return badge;
  }
  function renderTasks() {
    getStats();
    const search = ($("#task-search")?.value || "").trim().toLowerCase();
    const filter = $("#status-filter")?.value || "all";
    const list = tasks()
      .filter(t => (!search || (t.name + " " + (t.details || "")).toLowerCase().includes(search)) && (filter === "all" || t.status === filter))
      .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
    $$("[data-task-list]").forEach(root => {
      root.replaceChildren();
      if (!list.length) {
        root.append(element("p", "empty-state", search || filter !== "all" ? "No tasks match your filters." : "No tasks yet. Create one to get started."));
        return;
      }
      for (const task of list) {
        const article = element("article", "task-item");
        article.dataset.id = task.id;
        const content = element("div", "task-copy");
        const h3 = element("h3", "", task.name);
        const desc = element("p", "task-details", task.details || "No notes added");
        const meta = element("div", "task-meta");
        meta.append(element("span", "", "Due: " + dateText(task.date)), statusBadge(task.status));
        content.append(h3, desc, meta);
        const actions = element("div", "task-actions");
        const toggle = element("button", "button small outline", task.status === "Completed" ? "Reopen" : "Complete");
        toggle.type = "button"; toggle.dataset.action = "toggle";
        toggle.setAttribute("aria-label", (task.status === "Completed" ? "Reopen " : "Complete ") + task.name);
        const edit = element("button", "button small outline", "Edit");
        edit.type = "button"; edit.dataset.action = "edit";
        const del = element("button", "button small danger", "Delete");
        del.type = "button"; del.dataset.action = "delete";
        actions.append(toggle, edit, del);
        article.append(content, actions);
        root.append(article);
      }
    });
  }
  function initTasks() {
    const form = $("[data-task-form]");
    if (form) {
      form.addEventListener("submit", ev => {
        ev.preventDefault();
        const name = $("#task-name", form)?.value.trim() || "";
        const details = $("#task-details", form)?.value.trim() || "";
        const date = $("#task-date", form)?.value || "";
        const status = $("#task-status", form)?.value || "Pending";
        if (!name || name.length > 160) { setText("[data-form-feedback]", "Enter a task name (maximum 160 characters)."); return; }
        if (details.length > 2000) { setText("[data-form-feedback]", "Keep notes under 2000 characters."); return; }
        const current = tasks();
        const editId = form.dataset.editId;
        if (editId && current.some(t => t.id === editId)) {
          current.forEach(t => { if (t.id === editId) Object.assign(t, { name, details, date, status }); });
        } else {
          current.push({ id: newId(), name, details, date, status, createdAt: new Date().toISOString() });
        }
        if (!save(TASK_KEY, current)) return;
        form.reset(); delete form.dataset.editId;
        setText("[data-submit-label]", "Add task");
        setText("[data-form-feedback]", editId ? "Task updated." : "Task saved in this browser.");
        renderTasks();
        if (form.dataset.redirect) window.location.href = form.dataset.redirect;
      });
      const cancel = $("[data-cancel-edit]", form);
      if (cancel) cancel.addEventListener("click", () => {
        form.reset(); delete form.dataset.editId;
        setText("[data-submit-label]", "Add task");
        setText("[data-form-feedback]", "Editing cancelled.");
      });
    }
    document.addEventListener("click", ev => {
      const button = ev.target.closest("[data-action]");
      if (!button) return;
      const row = button.closest("[data-id]");
      if (!row) return;
      const id = row.dataset.id;
      const current = tasks();
      const item = current.find(t => t.id === id);
      if (!item) return;
      if (button.dataset.action === "toggle") {
        item.status = item.status === "Completed" ? "Pending" : "Completed";
        save(TASK_KEY, current); renderTasks();
      }
      if (button.dataset.action === "delete" && confirm('Delete "' + item.name + '"?')) {
        save(TASK_KEY, current.filter(t => t.id !== id)); renderTasks();
      }
      if (button.dataset.action === "edit") {
        const target = $("[data-task-form]");
        if (!target) {
          window.location.href = (document.body.dataset.root || "./") + "task_entry/index.html?edit=" + encodeURIComponent(id);
          return;
        }
        fillEdit(target, item);
      }
    });
    const edit = new URLSearchParams(window.location.search).get("edit");
    if (form && edit) {
      const record = tasks().find(t => t.id === edit);
      if (record) fillEdit(form, record);
    }
    $("#task-search")?.addEventListener("input", renderTasks);
    $("#status-filter")?.addEventListener("change", renderTasks);
    window.addEventListener("storage", renderTasks);
    renderTasks();
  }
  function fillEdit(form, item) {
    $("#task-name", form).value = item.name;
    $("#task-details", form).value = item.details || "";
    $("#task-date", form).value = item.date || "";
    $("#task-status", form).value = item.status;
    form.dataset.editId = item.id;
    setText("[data-submit-label]", "Save changes");
    setText("[data-form-feedback]", "Editing: " + item.name);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#task-name", form).focus();
  }

  // The public GoDaddy endpoint is designed for website-to-API requests.
  // Preview endpoints are private and cannot reliably be fetched by GitHub Pages.
  const LIVE_API = "https://11vhaiejwu.c39.airoapp.ai";
  const PREVIEW_HOST = "11vhaiejwu.preview.c39.airoapp.ai";
  function baseUrl(raw) {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
      throw new Error("Use an HTTPS API address, or HTTP localhost for development.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash)
      throw new Error("Enter the server base URL without a query string, token or fragment.");
    if (parsed.hostname === PREVIEW_HOST)
      throw new Error("GoDaddy preview URLs are private. Use the published URL: " + LIVE_API);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path === "/api/hello" || path === "/health") parsed.pathname = "/";
    else if (path !== "") throw new Error("Enter only the server base URL (no /api/... path).");
    return parsed.origin;
  }
  function initConnection() {
    const input = $("#api-url");
    const submit = $("#connect-api");
    if (!input || !submit) return;
    const saved = read(API_KEY, "");
    // Migrate preview selections from the old course; protect any unrelated custom server.
    let defaultValue = LIVE_API;
    if (typeof saved === "string" && saved.trim()) {
      try {
        const parsed = new URL(saved);
        if (parsed.hostname !== PREVIEW_HOST) defaultValue = baseUrl(saved);
      } catch { defaultValue = LIVE_API; }
    }
    input.value = defaultValue;
    const status = $("#api-status");
    const response = $("#api-response");
    function show(state, line) {
      status.dataset.state = state;
      status.textContent = line;
    }
    submit.addEventListener("click", async () => {
      let base;
      try { base = baseUrl(input.value.trim()); input.value = base; }
      catch (error) {
        show("error", error.message || "Invalid API URL.");
        response.textContent = "Use the public GoDaddy app address: " + LIVE_API;
        return;
      }
      if (!save(API_KEY, base)) return;
      submit.disabled = true;
      show("checking", "Contacting the public GoDaddy API…");
      response.textContent = "GET " + base + "/api/hello";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const result = await fetch(base + "/api/hello", {
          signal: controller.signal, cache: "no-store", credentials: "omit", redirect: "follow"
        });
        if (!result.ok) {
          if (result.status === 401 || result.status === 403)
            throw new Error("HTTP " + result.status + ": access denied. Check GoDaddy's Published app, not Preview.");
          if (result.status === 404)
            throw new Error("HTTP 404: /api/hello not found. Update Preview, then Publish to Live in GoDaddy.");
          throw new Error("Server returned HTTP " + result.status + ".");
        }
        const type = result.headers.get("content-type") || "";
        if (!type.includes("application/json"))
          throw new Error("The server returned a webpage instead of JSON. Confirm the published app serves index.js.");
        const value = await result.json();
        if (!value || value.connected !== true ||
            typeof value.message !== "string" || !value.message.includes("Hello World"))
          throw new Error("The server returned JSON, but not the NodeUse Hello World API.");
        show("ok", "Verified published NodeUse API — HTTP " + result.status);
        response.textContent = JSON.stringify(value, null, 2);
      } catch (error) {
        const detail = error.name === "AbortError" ? "Request timed out." :
          error instanceof TypeError ? "Browser could not fetch the API. Check whether the published URL opens directly, and whether it sends Access-Control-Allow-Origin for this site." :
          String(error.message || error);
        show("error", "Public API not verified — " + detail);
        response.textContent =
          "Requested: " + base + "/api/hello\n" +
          "Direct browser test: " + base + "/api/hello\n" +
          "If the direct link also fails, update the GoDaddy Preview and Publish to Live.\n" +
          "If the direct link shows JSON but this page fails, check CORS for " + location.origin + ".";
      } finally {
        clearTimeout(timeout); submit.disabled = false;
      }
    });
    $("#api-reset")?.addEventListener("click", () => {
      input.value = LIVE_API;
      try { localStorage.removeItem(API_KEY); } catch {}
      show("idle", "Public GoDaddy app URL selected; click Connect & test.");
      response.textContent = "GET " + LIVE_API + "/api/hello";
    });
  }
  function initLessons() {
    const done = new Set(read(PROGRESS_KEY, []));
    if ($("[data-chapter]")) {
      $$("[data-chapter]").forEach(section => {
        const id = section.dataset.chapter;
        const button = $("[data-mark-complete]", section);
        if (!button) return;
        const draw = () => {
          const complete = done.has(id);
          button.textContent = complete ? "✓ Chapter completed" : "Mark chapter complete";
          button.setAttribute("aria-pressed", String(complete));
        };
        draw();
        button.addEventListener("click", () => {
          done.has(id) ? done.delete(id) : done.add(id);
          save(PROGRESS_KEY, [...done]);
          draw();
          updateProgress();
        });
      });
    }
    function updateProgress() {
      const count = $$("[data-chapter]").filter(s => done.has(s.dataset.chapter)).length;
      const total = $$("[data-chapter]").length;
      setText("[data-progress-count]", count + " / " + total + " chapters");
      const progress = $("#course-progress");
      if (progress) { progress.value = count; progress.max = Math.max(1, total); }
    }
    updateProgress();
    $$("[data-copy]").forEach(button => button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent);
        const old = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = old; }, 1300);
      } catch { button.textContent = "Select and copy manually"; }
    }));
    $$("[data-share]").forEach(button => button.addEventListener("click", async () => {
      const url = new URL(button.dataset.share || location.href, location.href).href;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch {}
      } else {
        try { await navigator.clipboard.writeText(url); button.textContent = "Link copied"; }
        catch { prompt("Copy this link:", url); }
      }
    }));
  }
  initTasks(); initConnection(); initLessons();
})();
