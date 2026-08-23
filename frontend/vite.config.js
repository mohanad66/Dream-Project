import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Dream Store",
        short_name: "Dream",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#4CAF50",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "lucide-react",
      "react-icons",
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    // host: '0.0.0.0',  // ✅ ADD THIS - for production preview
    port: 5173,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["react-icons", "lucide-react"],
          },
      },
    },
  },
});
