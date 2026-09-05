import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^~\/server\/utils\/db$/, replacement: `${root}tests/stubs/db.ts` },
      { find: /^~\//, replacement: root },
      { find: /^@\//, replacement: root },
    ],
  },
  test: {
    name: 'unit',
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
    setupFiles: ['tests/setup/unit-env.ts'],
  },
})
