import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?_v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === "string" ? data.version : null;
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
    if (APP_VERSION === "dev") return; // ambiente de desenvolvimento
    let cancelled = false;

    const check = async () => {
      const deployed = await fetchDeployedVersion();
      if (!cancelled && deployed && deployed !== APP_VERSION) setUpdateAvailable(true);
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return updateAvailable;
}
