import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, '.') },
      // Íconos de contenido como emojis de color en todo el sistema (src/utils/lucideEmoji.js)
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, 'src/utils/lucideEmoji.js') },
    ],
  },
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // Librerías grandes en archivos aparte: se descargan una vez y quedan en caché
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/recharts|d3-|victory-vendor|decimal\.js-light|eventemitter3/.test(id)) return "graficos";
          if (/react-dom|scheduler|\/react\//.test(id)) return "react";
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true, // también accesible desde otros equipos de la red / VPN (Tailscale)
    allowedHosts: [".ts.net", "localhost"],
    strictPort: true, // siempre en el 3000 (las copias viejas se cierran al iniciar)
    open: true,
    // Las llamadas a /api van a la API de Node (servidor/index.js)
    proxy: {
      // xfwd: la API ve la IP real de cada equipo (para limitar intentos por equipo)
      "/api": { target: "http://127.0.0.1:4000", xfwd: true },
      "/uploads": { target: "http://127.0.0.1:4000", xfwd: true },
    },
  },
});
