import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "node_modules/**",
        "dist/**",
        "**/types.ts", // Type definitions only, no runtime code
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 87, // Adjusted: main entry point tested via e2e, not unit tests
        statements: 95,
        perFile: false,
      },
    },
  },
});
