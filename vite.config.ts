import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Versão única por build: embutida no app e publicada em /version.json
const BUILD_VERSION = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
const versionPlugin = () => ({
  name: "axis-app-version",
  apply: "build" as const,
  generateBundle(this: any) {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: BUILD_VERSION }) });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  define: { __APP_VERSION__: JSON.stringify(mode === 'production' ? BUILD_VERSION : 'dev') },
  plugins: [react(), mcpPlugin(), versionPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Cache busting: nome de cada arquivo gerado leva o hash do conteúdo
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          'chart-vendor': ['recharts'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  // Minificação agressiva
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [], // remove logs em produção
  }
}));