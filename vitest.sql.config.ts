import { defineConfig } from 'vitest/config'
import config from './vitest.config'

// PostgreSQL fixture tests run in Node without browser-only setup.
export default defineConfig({
  ...config,
  test: { ...config.test, environment: 'node', setupFiles: [], exclude: [], include: ['src/lib/materiaisSql.test.ts', 'src/lib/rolloutSql.test.ts', 'src/lib/labsaudeInventorySql.test.ts', 'src/lib/almoxarifadoSql.test.ts', 'src/lib/hospitalLabelsSql.test.ts', 'src/lib/documentTemplatesSql.test.ts', 'src/lib/portalOriginsSql.test.ts', 'src/lib/caixaSql.test.ts', 'src/lib/financeiroSql.test.ts', 'src/lib/chatInternoSql.test.ts', 'src/lib/pacoteWhatsappSql.test.ts', 'src/lib/registrationSql.test.ts', 'src/lib/whatsappCicloCategorias.test.ts', 'src/lib/whatsappRelacionamento11b.test.ts', 'src/lib/whatsappNpsRetencao.test.ts', 'src/lib/crm12a.test.ts', 'src/lib/crm12b.test.ts', 'src/lib/biHospitalarSql.test.ts', 'src/lib/farmaciaMedicamentosSql.test.ts'] },
})