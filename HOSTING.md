# Hosting guide — Alen Studio

This is a **static site** built with Vite. Hosting = run the build, then serve the
`dist/` folder. The recommended host is **Render**; alternatives are listed at the end.

---

## 1. Prerequisites

- The code in a Git repository (GitHub / GitLab / Bitbucket). Render deploys from Git.
- Locally: Node.js 18+ and `npm`.
- Confirm the build works before deploying:

  ```bash
  npm ci
  npm run build      # produces dist/
  npm run preview    # open http://localhost:4173 to sanity-check
  ```

---

## 2. Deploy to Render (recommended)

The repo already contains [`render.yaml`](render.yaml), so you can deploy either as a
**Blueprint** (one click, config from the file) or as a **manual Static Site**.

### Option A — Blueprint (uses render.yaml)

1. Push the repo to GitHub/GitLab.
2. In the Render dashboard: **New ▸ Blueprint**.
3. Connect the repository. Render reads `render.yaml` and proposes a static site
   named **alen-studio** with:
   - Build command: `npm ci && npm run build`
   - Publish path: `./dist`
   - Cache headers for `/_assets/*`, `/assets/*`, `/draco/*`
4. Click **Apply**. First build takes ~1–2 min. You get a URL like
   `https://alen-studio.onrender.com`.

### Option B — Manual Static Site

1. In the Render dashboard: **New ▸ Static Site**.
2. Connect the repository.
3. Fill in:
   | Field | Value |
   |-------|-------|
   | **Build Command** | `npm ci && npm run build` |
   | **Publish Directory** | `dist` |
4. **Create Static Site**. Render builds and deploys.

> Render's static hosting is CDN-backed and supports **HTTP Range requests**, so the
> hero `<video>` scrubs correctly with no custom server.

### Auto-deploys

By default Render rebuilds on every push to the production branch. `render.yaml` also
enables **PR preview environments** (`pullRequestPreviewsEnabled: true`) — each pull
request gets its own temporary URL.

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

No manual upload step — the published files are whatever `npm run build` produces.

---

## 4. Alternative static hosts

Any static host works; just give it the same build command and publish directory.
None of these need the `render.yaml` file.

| Host | Build command | Publish dir | Notes |
|------|---------------|-------------|-------|
| **Netlify** | `npm run build` | `dist` | Range + CDN out of the box. Add settings in UI or `netlify.toml`. |
| **Vercel** | `npm run build` | `dist` | Detects Vite automatically; set framework = Vite. |
| **Cloudflare Pages** | `npm run build` | `dist` | Global CDN; Range supported. |
| **GitHub Pages** | `npm run build` | `dist` | Static only. Range support is limited — hero video may not scrub on some browsers. Set Vite `base` to `/<repo>/` if served from a subpath. |

### Self-hosting (Nginx) — if you ever need it

Serve the `dist/` directory; Nginx supports Range by default. Minimal cache rule:

```nginx
location /_assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
location /draco/   { expires 1y; add_header Cache-Control "public, immutable"; }
```

---

## 5. Troubleshooting

- **3D car doesn't appear** → check the browser console/network for `/assets/bmw-interior.glb`
  or `/draco/*` 404s. Both must be served from the site root. They are emitted by the
  build automatically from `public/`.
- **Hero video won't scrub** → the host isn't serving `206 Partial Content` for
  `/assets/hero-web.mp4`. Render/Netlify/Vercel/Cloudflare all do; GitHub Pages may not.
- **Fonts missing** → the page loads Oswald/Inter from Google Fonts; ensure outbound
  access to `fonts.googleapis.com` / `fonts.gstatic.com` isn't blocked.
