import { agruparPorBancada, ordenarPacientes, type MapaBancada } from '@/lib/mapaPersonalizado'

export interface MapaPersonalizadoExameView {
  sigla: string
  nome: string
  material?: string
  workbenchId?: string | null
  bancadaNome?: string | null
  coletaEm?: string | null
  prazo?: string | null
  params: { name: string; unit?: string }[]
}

export interface MapaPersonalizadoPaciente {
  id: string
  codigo: string
  paciente: string
  convenio: string
  dataNascimento?: string | null
  idade: string
  sexo: string
  atendimento?: string | null
  origemCodigo?: string | number | null
  origemNome?: string | null
  medico?: string | null
  jejum?: boolean | null
  peso?: string | null
  altura?: string | null
  febre?: boolean | null
  urgente?: boolean | null
  setorLeito?: string | null
  observacoes?: string | null
  exames: MapaPersonalizadoExameView[]
}

function dataHora(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function dataCurta(v?: string | null) {
  if (!v) return ''
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1].slice(2)}`
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`
}

function dataNasc(v?: string | null) {
  if (!v) return '—'
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v)
}

const Campo = ({ label, valor, className = '' }: { label: string; valor?: string | null; className?: string }) => (
  <span className={`whitespace-nowrap ${className}`}>
    <span className="text-[10px] text-gray-600">{label}:</span>{' '}
    <span className="font-semibold">{valor || '—'}</span>
  </span>
)

export function MapaPersonalizado({ pacientes, bancadas }: { pacientes: MapaPersonalizadoPaciente[]; bancadas: MapaBancada[] }) {
  const lista = ordenarPacientes(pacientes)
  return (
    <div className="mp-root">
      {lista.map((p, idx) => {
        const grupos = agruparPorBancada(p.exames, bancadas)
        const origem = [p.origemCodigo != null && p.origemCodigo !== '' ? String(p.origemCodigo).padStart(2, '0') : '', p.origemNome || '']
          .filter(Boolean)
          .join(' ')
        return (
          <section key={p.id} className={`mp-patient pb-4 ${idx > 0 ? 'mt-4 border-t-2 border-black pt-3' : ''}`}>
            {/* Cabeçalho do paciente */}
            <header className="mp-header rounded border border-black px-3 py-2 text-[11px] leading-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-[13px] font-bold uppercase">{p.paciente}</span>
                <span className="text-[12px] font-bold">Pedido: <span className="font-mono">{p.codigo}</span></span>
              </div>
              <div className="flex flex-wrap gap-x-5">
                <Campo label="Convênio" valor={p.convenio} />
                <Campo label="Data Nasc." valor={dataNasc(p.dataNascimento)} />
                <Campo label="Idade" valor={p.idade !== '—' ? `${p.idade} anos` : '—'} />
                <Campo label="Sexo" valor={p.sexo} />
                <Campo label="Atendimento" valor={dataHora(p.atendimento)} />
                <Campo label="Origem" valor={origem} />
              </div>
              <div className="flex flex-wrap gap-x-5">
                {p.medico && <Campo label="Médico" valor={p.medico} />}
                <Campo label="Jejum" valor={p.jejum == null ? '' : p.jejum ? 'Sim' : 'Não'} />
                <Campo label="Peso" valor={p.peso} />
                <Campo label="Altura" valor={p.altura} />
                {p.febre && <Campo label="Febre" valor="Sim" />}
                {p.urgente && <Campo label="Prioridade" valor="Urgente" />}
                {p.setorLeito && <Campo label="Setor/Leito" valor={p.setorLeito} />}
              </div>
              <div className="whitespace-pre-line">
                <span className="text-[10px] text-gray-600">Observações:</span>{' '}
                <span className="font-semibold">{p.observacoes || ''}</span>
              </div>
            </header>

            {/* Exames por bancada */}
            {grupos.map(g => (
              <div key={g.bancadaId} className="mt-2">
                <p className="mp-bancada border-b border-dashed border-black pb-0.5 text-[12px] font-bold uppercase">
                  {g.numero && <span className="mr-3">{g.numero}</span>}
                  {g.bancadaNome}
                </p>
                {g.exames.map((e, i) => (
                  <div key={i} className="mp-exam border-b border-dotted border-black/60 py-1">
                    <div className="flex items-baseline gap-3 text-[12px]">
                      <span className="w-14 shrink-0 font-semibold uppercase">{e.sigla}</span>
                      <span className="flex-1 uppercase">{e.nome}{e.material ? <span className="text-[10px] text-gray-600"> — {e.material}</span> : null}</span>
                      <span className="shrink-0 whitespace-nowrap text-[11px]">
                        {dataHora(e.coletaEm)}{e.prazo ? ` / ${dataCurta(e.prazo)}` : ''}
                      </span>
                    </div>
                    {e.params.length > 1 && (
                      <div className="mp-params ml-14 mt-1 grid grid-cols-3 gap-x-4 gap-y-1 text-[10.5px]">
                        {e.params.map((pr, pi) => (
                          <span key={pi} className="flex items-end gap-1">
                            <span className="max-w-[60%] truncate">{pr.name}</span>
                            <span className="flex-1 border-b border-black/70" />
                            {pr.unit && <span className="text-[9px] text-gray-500">{pr.unit}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
