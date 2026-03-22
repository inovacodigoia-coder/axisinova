import { useState, useCallback } from 'react';

interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento: string;
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CepData | null>(null);

  const lookup = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const json = await res.json();
      if (json.erro) {
        setError('CEP não encontrado');
        setData(null);
        return null;
      }
      const result: CepData = {
        logradouro: json.logradouro || '',
        bairro: json.bairro || '',
        localidade: json.localidade || '',
        uf: json.uf || '',
        complemento: json.complemento || '',
      };
      setData(result);
      return result;
    } catch {
      setError('Erro ao buscar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error, data };
}
