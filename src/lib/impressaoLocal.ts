export const AISAXIUS_URL = "http://localhost:8089";

/**
 * Chaves de tipo de documento aceitas pelo Servidor de Impressão AisAxius.
 * Têm que bater exatamente com o que está configurado em
 * http://localhost:8089/Configuracao no computador do cliente.
 */
export const TIPOS_DOCUMENTO = {
  comprovanteCliente: "comprovante_cliente",
  controleInterno: "controle_interno",
  recibo: "recibo",
  termoConsentimento: "termo_consentimento",
  orcamentoFinanceiro: "orcamento_financeiro",
  demonstrativoFinanceiro: "demonstrativo_financeiro",
  ajudaExame: "ajuda_exame",
  guiaSaSpdt: "guia_sa_spdt",
  laudo: "laudo",
  etiquetaCliente: "etiqueta_cliente",
  etiquetaLote: "etiqueta_lote",
  fichaTrabalho: "ficha_trabalho",
  etiquetaColhedor: "etiqueta_colhedor",
} as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[keyof typeof TIPOS_DOCUMENTO];

/** Verifica se o app está aberto na bandeja do Windows, antes de tentar imprimir. */
export async function servidorImpressaoAtivo(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${AISAXIUS_URL}/api/ping`, { signal: controller.signal });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1]); // remove o prefixo "data:application/pdf;base64,"
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Envia um PDF (Blob) direto para a impressora configurada para `tipo`,
 * sem abrir nenhuma janela/diálogo de impressão no navegador.
 */
export async function imprimirDireto(
  tipo: TipoDocumento | string,
  pdfBlob: Blob
): Promise<{ ok: true; mensagem: string }> {
  const pdfBase64 = await blobParaBase64(pdfBlob);

  const resp = await fetch(`${AISAXIUS_URL}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, pdfBase64 }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.erro || "Falha ao imprimir.");
  }

  return { ok: true, mensagem: data.mensagem as string };
}
