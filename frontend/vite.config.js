import { createApp } from "vinxi";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.VITE_API_URL || "http://localhost:8000";

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
      plugins: () => [react()],
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
      },
    },
  ],
});