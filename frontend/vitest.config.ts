import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Route handlers (src/app/api/**) require NextRequest/integration setup — excluded from
      // unit coverage. Track lib/server only; raise thresholds as test suite grows.
      include: ['src/lib/server/**'],
      exclude: ['src/tests/**'],
      // Current baselines (June 2026) — raise as aiService/auth/pipelineEngine get test coverage
      thresholds: {
        lines: 35,
        functions: 45,
        branches: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
