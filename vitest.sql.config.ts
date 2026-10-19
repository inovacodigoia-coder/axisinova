import { defineConfig } from 'vitest/config'
import config from './vitest.config'

// PostgreSQL fixture tests run in Node without browser-only setup.
export default defineConfig({
  ...config,
  test: { ...config.test, environment: 'node', setupFiles: [], include: ['src/lib/whatsappCicloCategorias.test.ts'] },
})