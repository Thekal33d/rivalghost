import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@rivalghost/game-data": new URL("../../packages/game-data/src/index.ts", import.meta.url).pathname,
      "@rivalghost/sim": new URL("../../packages/sim/src/index.ts", import.meta.url).pathname,
    },
  },
});
