const normalizeHeader = (value: string) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

/** Shared by the editable catalog JSON and the relational reference ranges. */
export function importReferenceAge(row: Record<string, unknown>) {
  const fields = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  const read = (aliases: string[]) => aliases.map(key => fields.get(key))
    .find(value => value != null && String(value).trim() !== '');
  const number = (value: unknown, fallback: number) => {
    if (value == null) return fallback;
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Idade inválida na faixa de referência: ${value}`);
    return parsed;
  };
  const rawUnit = read(['unidade da idade', 'unidade de idade']);
  const units: Record<string, string> = {
    anos: 'anos', ano: 'anos', years: 'anos', year: 'anos',
    meses: 'meses', mes: 'meses', months: 'meses', month: 'meses',
    semanas: 'semanas', semana: 'semanas', weeks: 'semanas', week: 'semanas',
    dias: 'dias', dia: 'dias', days: 'dias', day: 'dias',
    valor: 'valor', value: 'valor', resultado: 'valor',
  };
  const ageUnit = rawUnit == null ? 'anos' : units[normalizeHeader(String(rawUnit))];
  if (!ageUnit) throw new Error(`Unidade da idade inválida: ${rawUnit}`);

  // Na unidade "Valor", a faixa é delimitada pelo resultado (texto), não pela idade.
  const text = (value: unknown) => {
    const s = value == null ? '' : String(value).trim();
    return s === '' ? null : s;
  };
  if (ageUnit === 'valor') {
    return {
      minAge: 0,
      maxAge: 0,
      ageUnit,
      valueMin: text(read(['valor min (resultado)', 'valor minimo (resultado)', 'valor min resultado', 'valor min'])),
      valueMax: text(read(['valor max (resultado)', 'valor maximo (resultado)', 'valor max resultado', 'valor max'])),
    };
  }

  const minAge = number(read(['idade minima', 'idade minima (anos)', 'idade min', 'idade min (anos)', 'idade mini']), 0);
  const maxAge = number(read(['idade maxima', 'idade maxima (anos)', 'idade max', 'idade max (anos)', 'idade maxi']), 150);
  return { minAge, maxAge, ageUnit, valueMin: null, valueMax: null };
}