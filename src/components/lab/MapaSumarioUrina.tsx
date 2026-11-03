import type { ReactNode } from 'react'

const Linha = ({ w = 'flex-1' }: { w?: string }) => <span className={`${w} border-b border-black`} />
const Campo = ({ label }: { label: string }) => (
  <div className="flex items-end gap-1 font-bold"><span>{label}:</span><Linha /></div>
)
const Caixa = ({ children }: { children?: ReactNode }) => (
  <span className="flex items-center gap-1 border border-black px-1 py-0.5"><span className="inline-block h-3 w-3 border border-black" />{children}</span>
)
const Titulo = ({ children }: { children: ReactNode }) => (
  <p className="my-2 text-center font-bold underline">{children}</p>
)

export const URINA_FITA = [
  'COR', 'PROTEÍNA', 'ASPECTO', 'GLICOSE', 'DEPÓSITO', 'CETONA', 'DENSIDADE',
  'BILIRRUBINA', 'REAÇÃO', 'E.LEUCOCITÁRIA', 'NITRITO', 'HEMOGLOBINA', 'UROBILINOGÊNIO',
]
export const URINA_SEDIMENTO = ['CÉLULAS', 'LEUCÓCITOS', 'HEMÁCIAS', 'BACTÉRIAS']
export const URINA_CRISTAIS = [
  'Oxalato de cálcio', 'Ácido úrico', 'Fosfato triplo', 'Fosfato de cálcio',
  'Bilirrubina', 'Tirosina', 'Biurato de amônia',
]
export const URINA_SAIS = ['Fosfatos amorfos', 'Uratos amorfos']
export const URINA_CILINDROS = ['Hialino', 'Granuloso', 'Leucocitário', 'Hemático', 'Céreo']

export function MapaSumarioUrina({ paciente, codigo }: { paciente: string; codigo?: string }) {
  return (
    <div className="mx-auto max-w-[180mm] py-6 text-[12px] leading-6 break-after-page print:break-after-page" style={{ breakAfter: 'page' }}>
      <div className="flex items-end gap-1 font-bold"><span>NOME:</span><span className="flex-1 border-b border-black px-1 font-normal">{paciente} {codigo ? `— ${codigo}` : ''}</span></div>
      <Titulo>SUMÁRIO DE URINA</Titulo>
      <div className="inline-flex"><Caixa>Leitura da fita química impossibilitada pela coloração da amostra.</Caixa></div>
      <div className="mt-3 grid grid-cols-2 gap-x-10">
        {URINA_FITA.map(l => <Campo key={l} label={l} />)}
      </div>
      <Titulo>SEDIMENTO URINÁRIO</Titulo>
      <div className="flex flex-col items-start gap-1">
        <Caixa>Leucocitúria maciça impossibilitando a visualização de demais estruturas</Caixa>
        <Caixa>Hematúria maciça impossibilitando a visualização de demais estruturas</Caixa>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-x-3">
        {URINA_SEDIMENTO.map(l => <Campo key={l} label={l} />)}
      </div>
      <div className="mt-4 flex items-start gap-2"><span className="w-20 font-bold">CRISTAIS:</span>
        <div className="flex flex-wrap gap-1">
          {URINA_CRISTAIS.map(c => <Caixa key={c}>{c}</Caixa>)}
          <Caixa>Outros: <span className="inline-block w-24 border-b border-black" /></Caixa>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2"><span className="w-20 font-bold">SAIS:</span>
        <div className="flex flex-wrap gap-1">{URINA_SAIS.map(c => <Caixa key={c}>{c}</Caixa>)}</div>
      </div>
      <div className="mt-3 flex items-start gap-2"><span className="w-20 font-bold">CILINDROS:</span>
        <div className="flex flex-wrap gap-1">{URINA_CILINDROS.map(c => <Caixa key={c}>{c}</Caixa>)}</div>
      </div>
      <p className="mt-4 font-bold">OBSERVAÇÃO:</p>
      {[0, 1, 2].map(i => <div key={i} className="h-6 border-b border-black" />)}
      <p className="mt-6 font-bold">FLUXO VAGINAL:</p>
      {[0, 1, 2].map(i => <div key={i} className="h-6 border-b border-black" />)}
    </div>
  )
}
