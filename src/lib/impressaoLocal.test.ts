import { afterEach, describe, expect, it, vi } from "vitest";
import { AISAXIUS_URL, imprimirEtiquetas, TIPOS_DOCUMENTO, type DadosEtiqueta } from "./impressaoLocal";

afterEach(() => vi.unstubAllGlobals());

describe("código alfanumérico por tubo no envio local", () => {
  it.each([
    TIPOS_DOCUMENTO.etiquetaCliente,
    TIPOS_DOCUMENTO.etiquetaLote,
    TIPOS_DOCUMENTO.etiquetaColhedor,
  ])("preserva códigos diferentes por tubo do mesmo pedido em %s", async (tipo) => {
    const etiquetas: DadosEtiqueta[] = [
      { codigoAmostra: "296-00-1-2", codigoExterno: "296-00", codigoAlfanumerico: "BWWFNO1L1" },
      { codigoAmostra: "296-00-2-2", codigoExterno: "296-00", codigoAlfanumerico: "BI89H0LC1" },
      { codigoAmostra: "296-00-3-2", codigoExterno: "296-00", codigoAlfanumerico: "KFWD6EDA3" },
    ];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, etiquetas: 3 }) });
    vi.stubGlobal("fetch", fetchMock);

    await imprimirEtiquetas(tipo, etiquetas);

    expect(fetchMock).toHaveBeenCalledWith(`${AISAXIUS_URL}/print`, expect.objectContaining({
      body: JSON.stringify({ tipo, etiquetas }),
    }));
    const enviados = JSON.parse(fetchMock.mock.calls[0][1].body).etiquetas;
    expect(enviados.map((e: DadosEtiqueta) => e.codigoAlfanumerico)).toEqual(["BWWFNO1L1", "BI89H0LC1", "KFWD6EDA3"]);
    expect(enviados.map((e: DadosEtiqueta) => e.codigoExterno)).toEqual(["296-00", "296-00", "296-00"]);
  });

  it("não adiciona código alfanumérico quando ausente, preservando o envio anterior", async () => {
    const etiquetas: DadosEtiqueta[] = [{ codigoAmostra: "296-00-3-2", codigoExterno: "296-00" }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, etiquetas: 1 }) });
    vi.stubGlobal("fetch", fetchMock);

    await imprimirEtiquetas(TIPOS_DOCUMENTO.etiquetaCliente, etiquetas);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ tipo: "etiqueta_cliente", etiquetas });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).etiquetas[0]).not.toHaveProperty("codigoAlfanumerico");
  });
});