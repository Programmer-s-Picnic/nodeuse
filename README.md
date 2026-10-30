# NodeUse — Node.js on GoDaddy, from 0 to Infinity

**One repository for the whole project.**

- **GitHub Pages frontend (custom domain):** http://nodeuse.learnwithchampak.live/
- **Complete 20-lesson 0 → ∞ course:** http://nodeuse.learnwithchampak.live/learn/
- **GitHub source (frontend + backend):** https://github.com/Programmer-s-Picnic/nodeuse
- **GoDaddy preview URL (private; not for website fetch):** https://11vhaiejwu.preview.c39.airoapp.ai
- **GoDaddy published API default for this lesson:** https://11vhaiejwu.c39.airoapp.ai (live response still needs verification)
- **Private preview:** preview environment, accessed from GoDaddy dashboard. Do not commit or publish preview share tokens.

## Project structure

```text
nodeuse/
├── index.js                # GoDaddy Node.js HTTP server (backend)
├── package.json            # GoDaddy build and start scripts
├── index.test.js           # API tests
├── index.html              # GitHub Pages frontend home
├── assets/
│   ├── app.js              # Frontend task and connection logic
│   └── site.css            # Light-blue theme
├── task_entry/index.html   # Browser task form
├── all_task/index.html     # Task list / CRUD user interface
├── assets/lesson-demos.js   # Practice each example in the browser or on GoDaddy
└── learn/index.html        # Twenty programs from Hello World to full stack
```

## Step 1: Enable GitHub Pages

In this **nodeuse** repository open **Settings → Pages**. Under **Build and deployment → Source**, select **GitHub Actions**. The included `.github/workflows/publish-pages.yml` publishes the static site on pushes to `main`; you can also use **Actions → Publish NodeUse learning site → Run workflow**. If you prefer branch publishing, select **Deploy from a branch → main → /(root)** instead. Use one publishing method consistently.

The intended public address is http://nodeuse.learnwithchampak.live/ after the DNS mapping and GitHub Pages deployment succeed. The repository's `CNAME` file specifies `nodeuse.learnwithchampak.live`. Verify the site and consider enabling **Enforce HTTPS** in Pages settings once the certificate is ready; until verified, links use the supplied HTTP address.

GitHub Pages serves static HTML/CSS/JavaScript from the repository; it does **not** execute `index.js`.

## Step 2: Deploy backend on GoDaddy

1. In the GoDaddy hosting dashboard for `cserver.learnwithchampak.live`, find **Node.js Apps → Add App**.
2. Connect the **nodeuse** GitHub repository or upload a ZIP containing `index.js` and `package.json` at the ZIP root.
3. Build command: `npm run build`; start command: `npm start`. The server listens on `process.env.PORT`.
4. Preview, then publish. Use the **public HTTPS hostname** shown in the dashboard, not the private preview URL or its share token. The known published hostname is `https://11vhaiejwu.c39.airoapp.ai`.
5. Check endpoints: `/` (Hello World), `/api/hello` (JSON), `/health` (JSON health), `/api/hello-name?name=Champak` and `/api/add?a=2&b=3`.
6. Go to the GitHub Pages frontend. The connection tester uses the **published** API at `https://11vhaiejwu.c39.airoapp.ai`, not the private preview. Click **Connect & test**. If the direct `/api/hello` URL works but fetch fails, inspect CORS headers on the published deployment.

## Run and test locally (Node.js 22)

```bash
npm run build
npm test
npm start
```

Check http://localhost:3000/, http://localhost:3000/health, http://localhost:3000/api/hello, http://localhost:3000/api/hello-name?name=Champak, and http://localhost:3000/api/add?a=2\&b=3.

## Frontend behavior

The home, Task Entry and All Tasks pages provide local task management. **Tasks are currently stored in the browser's localStorage only**; the NodeUse backend is a read-only Hello World API. Tasks do not sync across computers. The full course explains next steps to build a protected, durable REST API.

## CORS and security

The backend permits the custom GitHub Pages **origins** `http://nodeuse.learnwithchampak.live` and `https://nodeuse.learnwithchampak.live`, the default `https://programmer-s-picnic.github.io` origin, and local development origins. An `ALLOWED_ORIGINS` environment variable can override this list. CORS is not authentication. Do not place private keys, SQL connection strings or secrets in GitHub Pages or public code.

Developed and maintained by Champak Roy.

## Small programs taught in the course

The course now starts with **1. Hello World → 2. Hello Name → 3. Add 2 Numbers**, followed by subtraction, multiplication, division, even/odd, largest of three, multiplication table, factorial, Fibonacci, arrays, palindromes, grades, JSON, fetch, HTML forms, GoDaddy/CORS, browser tasks, and REST/database design.

Lessons 1–14 have a local JavaScript practice runner and a separate GoDaddy **published API** runner. To update the API, use **Update Preview → Publish to Live** in GoDaddy. The published backend must allow this website’s origin in its CORS headers. The preview share token is never stored in source control. The Task Manager remains browser-local (not database-backed).
