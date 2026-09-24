import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const VERSION_RE = /APP_VERSION:\s*string\s*=\s*"([^"]+)"/;

async function fetchDeployedVersion(): Promise<string | null> {
  try {
    // Busca o HTML publicado sem cache e extrai a versão embutida no bundle.
    const htmlRes = await fetch(`/index.html?_v=${Date.now()}`, { cache: "no-store" });
    if (!htmlRes.ok) return null;
    const html = await htmlRes.text();

    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
    for (const src of scripts) {
      const res = await fetch(`${src}?_v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      const match = text.match(VERSION_RE);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null; // offline ou erro de rede: tenta de novo no próximo ciclo
  }
}

/**
 * Verifica periodicamente se o deploy publicou uma versão mais nova que a
 * carregada no navegador. Retorna true quando há atualização disponível.
 */
export function useAppVersion(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (APP_VERSION === "__APP_VERSION__") return; // ambiente de desenvolvimento
    let cancelled = false;

    const check = async () => {
      const deployed = await fetchDeployedVersion();
      if (!cancelled && deployed && deployed !== APP_VERSION) setUpdateAvailable(true);
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return updateAvailable;
}
