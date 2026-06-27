# Alen Studio

Production landing page for **Alen Studio** — professional car interior detailing (Kyiv).
Single-page site with an interactive 3D x-ray configurator that drives the price calculator.

## Stack

- Static site built with **Vite 5**.
- **Three.js 0.160.0** (version-pinned npm dependency, bundled at build time — no runtime CDN).
- **DRACO** decoder vendored locally under `public/draco/` (no runtime CDN).
- Google Fonts (Oswald + Inter) loaded via `<link>`.

## Develop

```bash
npm install
npm run dev        # Vite dev server (HMR)
```

## Build & preview

```bash
npm run build      # -> dist/  (minified, fingerprinted)
npm run preview    # serve dist/ locally (HTTP Range enabled, port 4173)
```

## Project layout

```
index.html                  entry (inline CSS + UI script; loads the 3D module)
src/three-configurator.js   3D x-ray configurator (bundled by Vite)
public/assets/              shipped media (images, webp, mp4, glb) — copied verbatim to dist/assets/
public/draco/               vendored DRACO decoder — served at /draco/
source-assets/              original PNG/GLB source files — NOT deployed
dist/                       build output (gitignored)
render.yaml                 Render Blueprint (static site + cache headers)
```

Build output is split so it never collides with the hand-referenced media:
- fingerprinted JS/CSS → `dist/_assets/`
- pristine media (referenced by stable name from inline CSS/JS) → `dist/assets/`

## Deploy

Render Static Site — build `npm ci && npm run build`, publish `dist`.
Full step-by-step (and alternative hosts) in **[HOSTING.md](HOSTING.md)**.
