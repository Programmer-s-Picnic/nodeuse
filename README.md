# NodeUse — Hello World Node.js server for GoDaddy

This is the **server-side** half of Programmer's Picnic's [Node.js from 0 to Infinity course](https://programmer-s-picnic.github.io/taskmanager/learn/) and its [Task Manager frontend](https://programmer-s-picnic.github.io/taskmanager/).

The intended hosting account is `cserver.learnwithchampak.live`. Its actual app URL must be mapped and published through GoDaddy before it can be treated as live.

## Files

- `index.js`: HTTP server using only Node built-ins (no Express)
- `package.json`: required `build` and `start` scripts
- `index.test.js`: Node built-in test runner checks

## Run locally (Node 22)

```bash
npm run build
npm test
npm start
```

Open http://localhost:3000/

## Public endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/` | GET | Plain text Hello World |
| `/api/hello` | GET | JSON greeting including `connected:true` |
| `/health` | GET | Basic JSON status |

Unknown paths return JSON `404`. Non-GET requests return `405`.

## Deploy to GoDaddy

1. In GoDaddy's hosting dashboard, open **Node.js Apps → Add App**.
2. Connect GitHub to **Programmer-s-Picnic/nodeuse**, if that is available, or upload a ZIP containing the files at its root. Do not include an extra containing folder.
3. Confirm that the `build` and `start` scripts run; GoDaddy sets `process.env.PORT`.
4. Verify all endpoints in the private preview.
5. Publish to a public HTTPS app address. The frontend uses the actual published base URL and does not assume that your hosting account hostname is the app URL.

## CORS

Allowed origins default to:
- `https://programmer-s-picnic.github.io`
- `http://localhost:5500`
- `http://127.0.0.1:5500`

Override with the `ALLOWED_ORIGINS` environment variable (comma-separated origin values). Do not include URL paths. CORS does not provide user authentication.

## Security and next lessons

This starter API is read-only. It does **not** save tasks and should not be described as a multi-device task database. Future task APIs should add server-side validation, authentication, authorization and a durable SQL database before allowing public mutations.

Developed and maintained by Champak Roy.
