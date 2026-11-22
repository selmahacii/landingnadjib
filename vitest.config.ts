import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: [],
    include: [
      "app/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "lib/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "components/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules", ".claude", ".superpowers", ".next"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
