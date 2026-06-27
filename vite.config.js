import { defineConfig } from "vite";

// Static multi-asset site. The bundled JS/CSS produced by Vite is fingerprinted
// and emitted into `_assets/` so it never collides with the pristine media in
// `public/assets/` (whose filenames are referenced verbatim from inline CSS/JS).
export default defineConfig({
  base: "/",
  build: {
    target: "es2020",
    outDir: "dist",
    assetsDir: "_assets",
    emptyOutDir: true,
    sourcemap: false,
  },
});
