import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/actions/**/*.ts"],
      exclude: ["lib/prisma.ts"],
    },
  },
  resolve: {
    alias: [
      // strip the `import "server-only"` guard so server modules import under node
      { find: /^server-only$/, replacement: fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) },
      { find: /^@\/(.*)$/, replacement: `${root}$1` },
    ],
  },
})
