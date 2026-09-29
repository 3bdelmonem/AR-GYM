import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    target: "es2020",
    assetsInlineLimit: 0,      // fonts stay as files so the service worker precaches them
    chunkSizeWarningLimit: 600,
    // copying ~360 MB of videos out of public/ is the only slow step; the timing notice isn't actionable
    rolldownOptions: { checks: { bundlerTimings: false } },
  },
  preview: { port: 4173, strictPort: true },
  plugins: [
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      injectRegister: false,   // registered from src/app.js via virtual:pwa-register
      includeManifestIcons: false, // already matched by globPatterns below
      manifestFilename: "manifest.webmanifest",
      manifest: {
        id: "/",
        name: "AR GYM",
        short_name: "AR GYM",
        description: "Your training plan, set log and the coach's demo videos — offline.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#14100E",
        background_color: "#14100E",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        rollupFormat: "iife",  // classic worker script: widest iOS support
        // app shell only — mp4 files are cached on demand in `videos-v1`
        globPatterns: ["**/*.{html,js,css,woff2,png,svg,ico}", "videos/posters/*.jpg"],
        globIgnores: ["**/*.mp4"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
});
