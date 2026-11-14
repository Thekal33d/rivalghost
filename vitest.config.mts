import { configDefaults, defineConfig } from "vitest/config";

import {nearSdkResolution} from "./tools/near-sdk-resolution.mts";

export default defineConfig({
  plugins:[nearSdkResolution()],
  test: {
    // Builds emit declaration-adjacent test files. Only source tests should run.
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
