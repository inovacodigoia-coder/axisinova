import { useState } from "react";
import { toast } from "sonner";
import { imprimirDireto, servidorImpressaoAtivo, TipoDocumento } from "@/lib/impressaoLocal";

export function useImpressaoLocal() {
  const [imprimindo, setImprimindo] = useState(false);

  async function imprimir(tipo: TipoDocumento | string, pdfBlob: Blob): Promise<boolean> {
    setImprimindo(true);
    try {
      const ativo = await servidorImpressaoAtivo();
      if (!ativo) {
        toast.error(
          "Servidor de Impressão AisAxius não está aberto. Abra o programa na bandeja do Windows e tente de novo."
        );
        return false;
      }

      const resultado = await imprimirDireto(tipo, pdfBlob);
      toast.success(resultado.mensagem);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao imprimir.");
      return false;
    } finally {
      setImprimindo(false);
    }
  }

  return { imprimir, imprimindo };
}
