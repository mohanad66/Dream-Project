import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "DreamStore — Curated Marketplace",
        short_name: "DreamStore",
        description: "Curated marketplace for premium local brands, artisans and independent creators.",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0f17",
        theme_color: "#c9a24b",
        orientation: "portrait-primary",
        categories: ["shopping", "business"],
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
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
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 5173,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom")) return "react-vendor";
          if (id.includes("node_modules/react") && !id.includes("node_modules/react-")) return "react-vendor";
          if (id.includes("node_modules/react-router")) return "react-vendor";
          if (id.includes("node_modules/recharts")) return "recharts";
          if (id.includes("node_modules/react-icons") || id.includes("node_modules/lucide-react")) return "ui-vendor";
          if (id.includes("node_modules/@fortawesome") || id.includes("node_modules/fancyapps")) return "ui-vendor";
          if (id.includes("node_modules/axios")) return "axios";
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
