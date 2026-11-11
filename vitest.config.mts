import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Builds emit declaration-adjacent test files. Only source tests should run.
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
