export const PROCEDURE_TYPES = [
    { value: 'clinical', label: 'Clínico', color: 'bg-blue-100 text-blue-700' },
    { value: 'surgical', label: 'Cirúrgico', color: 'bg-red-100 text-red-700' },
    { value: 'diagnostic', label: 'Diagnóstico', color: 'bg-green-100 text-green-700' },
    { value: 'therapeutic', label: 'Terapêutico', color: 'bg-purple-100 text-purple-700' },
    { value: 'other', label: 'Outro', color: 'bg-muted text-muted-foreground' },
];
export const ANESTHESIA_TYPES = ['Local', 'Sedação', 'Geral', 'Raqui', 'Peridural'];
export const CONVENIO_TYPE_LABELS = {
    health_plan: 'Plano de Saúde',
    private: 'Particular',
    sus: 'SUS',
    other: 'Outro',
};
export const CONVENIO_TYPE_COLORS = {
    health_plan: 'bg-blue-100 text-blue-700',
    private: 'bg-green-100 text-green-700',
    sus: 'bg-orange-100 text-orange-700',
    other: 'bg-muted text-muted-foreground',
};
export const UF_LIST = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];
export const BLOCK_REASONS = [
    'Saiu da empresa',
    'Afastamento médico',
    'Férias',
    'Licença',
    'Outro',
];
