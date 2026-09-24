import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppVersion } from "@/hooks/useAppVersion";

/**
 * Banner fixo exibido quando existe uma versão mais nova publicada.
 * Ao clicar em "Atualizar", força um hard reload limpando o cache.
 */
export function UpdateBanner() {
  const updateAvailable = useAppVersion();

  if (!updateAvailable) return null;

  const handleUpdate = () => {
    // Hard reload: ignora o cache do navegador e baixa a versão mais recente.
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-lg border border-primary/30 bg-card px-4 py-3 shadow-lg"
    >
      <RefreshCw className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">Nova versão disponível</span>
      <Button size="sm" onClick={handleUpdate}>
        Atualizar
      </Button>
    </div>
  );
}
