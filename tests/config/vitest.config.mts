import * as path from 'node:path'
import * as fs from 'node:fs'
import * as dotenv from 'dotenv'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Load .env.test if present
const envTestPath = path.resolve(__dirname, '../../.env.test')
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: false })
}

export default defineConfig({
  plugins: [tsconfigPaths() as any, react() as any],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
  },
})
