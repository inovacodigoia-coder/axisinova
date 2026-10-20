import { defineConfig } from 'vitest/config'
import config from './vitest.config'

// PostgreSQL fixture tests run in Node without browser-only setup.
export default defineConfig({
  ...config,
  test: { ...config.test, environment: 'node', setupFiles: [], exclude: [], include: ['src/lib/whatsappCicloCategorias.test.ts', 'src/lib/whatsappRelacionamento11b.test.ts', 'src/lib/whatsappNpsRetencao.test.ts', 'src/lib/crm12a.test.ts', 'src/lib/crm12b.test.ts'] },
})