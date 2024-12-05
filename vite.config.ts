import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cjsInterop } from "vite-plugin-cjs-interop";
import griffel from "@griffel/vite-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    reactRouter(),
    tsconfigPaths(), // Add CJS interop plugin for Fluent UI packages,
    // as they are CommonJS modules
    cjsInterop({
      dependencies: ["@fluentui/react-components"],
    }),
    // Add Griffel plugin for production optimization
    command === "build" && griffel(),
  ],
  // Required for Fluent UI icons in SSR
  ssr: {
    noExternal: ['@fluentui/react-icons'],
  },
}));
