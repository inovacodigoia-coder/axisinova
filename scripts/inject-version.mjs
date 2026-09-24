// Injeta a versão do build em src/lib/version.ts antes de `vite build`.
// A versão é o timestamp UTC do build (ex.: 20260924T115700Z), única por deploy.
import { writeFileSync } from "node:fs";

const version = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
const content = `// Gerado em tempo de build por scripts/inject-version.mjs (chamado no index.html).
// Não edite manualmente: o valor muda a cada deploy.
export const APP_VERSION: string = "${version}";
`;
writeFileSync(new URL("../src/lib/version.ts", import.meta.url), content);
console.log(`[inject-version] APP_VERSION=${version}`);
