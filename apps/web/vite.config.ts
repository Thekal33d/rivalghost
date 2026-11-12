import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {proxy: {"/api/guest": {target:"http://127.0.0.1:8788"}}},
  resolve: {
    alias: {
      "@rivalghost/game-data": new URL("../../packages/game-data/src/index.ts", import.meta.url).pathname,
      "@rivalghost/sim": new URL("../../packages/sim/src/index.ts", import.meta.url).pathname,
    },
  },
});
