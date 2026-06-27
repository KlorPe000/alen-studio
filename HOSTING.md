# Hosting guide — Alen Studio

The site is built with **Vite 5** and served in production by a small **Node.js (Express)**
server (`server.js`). The server:

- serves the built `dist/` folder (static assets + `index.html`);
- proxies booking and visitor notifications to Telegram via `/api/booking` and
  `/api/visitor` — bot credentials stay on the server only.

The recommended host is **Render** (Web Service). Alternatives are listed at the end.

---

## 1. Prerequisites

- The code in a Git repository (GitHub / GitLab / Bitbucket). Render deploys from Git.
- Locally: Node.js 18+ and `npm`.
- A Telegram bot token ([@BotFather](https://t.me/BotFather)) and the target chat ID.
- Confirm the build works before deploying:

  ```bash
  npm ci
  npm run build      # produces dist/
  npm run preview    # build + serve on http://localhost:3000
  ```

For local development with hot reload:

```bash
npm run dev          # Express on :3000 + Vite on :5173 (API proxied)
```

Set Telegram credentials locally (PowerShell example):

```powershell
$env:TELEGRAM_BOT_TOKEN = "123456789:AAH..."
$env:TELEGRAM_CHAT_ID   = "8416929056"
npm run dev
```

---

## 2. Deploy to Render (recommended)

The repo contains [`render.yaml`](render.yaml) for a **Web Service** (Node), not a Static Site.

### Option A — Blueprint (uses render.yaml)

1. Push the repo to GitHub/GitLab.
2. In the Render dashboard: **New ▸ Blueprint**.
3. Connect the repository. Render reads `render.yaml` and proposes a web service
   named **alen-studio** with:
   - Runtime: **Node**
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `node server.js`
   - Environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (you enter values
     during setup — they are marked `sync: false` in the blueprint)
4. Enter the Telegram credentials when prompted, then click **Apply**.
5. First build takes ~1–2 min. You get a URL like `https://alen-studio.onrender.com`.

### Option B — Manual Web Service

1. In the Render dashboard: **New ▸ Web Service**.
2. Connect the repository.
3. Fill in:

   | Field | Value |
   |-------|-------|
   | **Runtime** | Node |
   | **Build Command** | `npm ci --include=dev && npm run build` |
   | **Start Command** | `node server.js` |

4. Open **Environment** and add:

   | Key | Value |
   |-----|-------|
   | `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather (`123456789:AAH...`) |
   | `TELEGRAM_CHAT_ID` | Chat or group ID where notifications are sent |
   | `NODE_ENV` | `production` (optional; set automatically by blueprint) |

5. **Create Web Service**. Render builds and deploys.

> **Migrating from an old Static Site:** a Render Static Site cannot run `server.js`.
> Create a new Web Service (or redeploy via Blueprint), add the environment variables,
> point your custom domain to the new service, then delete the old Static Site.

### Environment variables — where to change them later

1. Open your service in the Render dashboard.
2. Go to **Environment** in the left sidebar.
3. Edit `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID`, then **Save Changes**.
4. Render redeploys the service automatically.

If either variable is missing, the site still loads but form submissions and visitor
notifications return an error and a warning is logged on the server.

### Auto-deploys

By default Render rebuilds on every push to the production branch. `render.yaml` also
enables **PR preview environments** (`pullRequestPreviewsEnabled: true`) — each pull
request gets its own temporary URL. Preview instances need their own Telegram env vars
(or will fail silently on `/api/*` calls if unset).

### Custom domain

1. Open the service ▸ **Settings ▸ Custom Domains ▸ Add Custom Domain**.
2. Enter your domain (e.g. `alenstudio.com.ua`).
3. At your DNS provider add the records Render shows:
   - apex/root → an **ALIAS/ANAME** (or A record) to Render's target, **or**
   - `www` → a **CNAME** to `<your-app>.onrender.com`.
4. Render issues and renews a free TLS certificate automatically once DNS resolves.

---

## 3. Updating the site

```bash
# edit content/code, then:
git add -A
git commit -m "update"
git push            # Render rebuilds & redeploys automatically
```

No manual upload step — production runs `npm run build` then `node server.js`.

---

## 4. Alternative hosts

Because booking forms call `/api/*` on the same origin, a **static-only** host (GitHub
Pages, Cloudflare Pages without Workers, etc.) will not send Telegram notifications unless
you add a separate backend or serverless functions.

| Host | Build | Run / notes |
|------|-------|-------------|
| **Render Web Service** | `npm ci --include=dev && npm run build` | `node server.js` — recommended; see above |
| **Railway / Fly.io / VPS** | `npm run build` | `node server.js`; set `PORT` and Telegram env vars |
| **Netlify** | `npm run build` | Needs Netlify Functions reimplementing `/api/*`, or deploy Express elsewhere |
| **Vercel** | `npm run build` | Needs Vercel Serverless Functions for `/api/*`, or deploy Express elsewhere |

### Self-hosting (Nginx + Node) — if you ever need it

Run Node behind a reverse proxy; Nginx serves Range requests for video if configured.
Minimal setup:

```bash
npm ci --include=dev && npm run build
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... PORT=3000 node server.js
```

Proxy to the Node process and optionally cache static paths:

```nginx
location /_assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
location /draco/   { expires 1y; add_header Cache-Control "public, immutable"; }
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## 5. Troubleshooting

- **Build fails with `vite: not found`** → Render sets `NODE_ENV=production`, so `npm ci`
  skips devDependencies. Use build command `npm ci --include=dev && npm run build`
  (already set in `render.yaml`; update manually in the dashboard if the service was
  created without the blueprint).
- **Form shows "Помилка відправки"** → check Render **Logs** for the web service.
  Usually `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing or invalid. Confirm
  both env vars in **Environment** and redeploy.
- **Visitor notifications missing** → same env vars; also note the 10-minute cooldown
  per browser (localStorage) and per IP (server).
- **3D car doesn't appear** → check the browser console/network for `/assets/bmw-interior.glb`
  or `/draco/*` 404s. Both must be served from the site root. They are emitted by the
  build automatically from `public/`.
- **Hero video won't scrub** → the server must support **HTTP Range** (`206 Partial Content`)
  for `/assets/hero-web.mp4`. Express static middleware handles this; if using Nginx in
  front, ensure it forwards Range headers.
- **Fonts missing** → the page loads Manrope/Saira Condensed from Google Fonts; ensure
  outbound access to `fonts.googleapis.com` / `fonts.gstatic.com` isn't blocked.
- **Local dev: API 404 on :5173** → run `npm run dev` (not `npm run dev:vite` alone).
  Vite proxies `/api` to Express on port 3000.

---

## 6. Security note

Never put `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` in client-side code or commit them
to Git. If a token was ever exposed, revoke it in @BotFather (`/revoke`), generate a new
one, and update the Render environment variables.
