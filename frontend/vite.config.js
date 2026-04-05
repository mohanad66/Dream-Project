import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa'  // ✅ this line must exist

const API_TARGET = process.env.VITE_API_URL || "http://localhost:8000";

const handleMalformedURI = {
  name: 'handle-malformed-uri',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      try {
        decodeURI(req.url);
      } catch {
        req.url = '/';
      }
      next();
    });
  },
};

export default createApp({
  routers: [
    {
      name: "public",
      type: "static",
      dir: "./public",
    },
    {
      name: "client",
      type: "spa",
      handler: "./index.html",
      base: "/",
      plugins: () => [
        react(),
        handleMalformedURI,
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Dream Store',
            short_name: 'Dream',
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#000000',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })

      ],
      // Vite dev server options go under `vite`
      vite: {
        server: {
          proxy: {
            "/api": {
              target: API_TARGET,
              changeOrigin: true,
              secure: false,
              ws: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
        },
        // ✅ Build optimizations
        build: {
          minify: 'terser',
          rollupOptions: {
            output: {
              // Code splitting strategy for better caching
              manualChunks: {
                'vendor': ['react', 'react-dom', 'react-router-dom'],
                'stripe': ['@stripe/react-stripe-js', 'stripe'],
                'ui': ['lucide-react', 'react-icons', '@fancyapps/ui'],
              }
            }
          },
          chunkSizeWarningLimit: 1000, // Warn if chunks exceed 1MB
          sourcemap: false, // Disable source maps in production
          cssMinify: true,
        }
      },
    },
  ],
});