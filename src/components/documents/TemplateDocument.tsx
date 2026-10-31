import { LabReportHeader, type LabReportHeaderProps } from '@/components/lab/LabReportHeader'
import { renderDocument, type DocumentTemplate } from '@/lib/documentTemplates'
export function TemplateDocument({template,values,header,format}:{template:DocumentTemplate;values:Record<string,string>;header:LabReportHeaderProps;format:string}) {
  const modes=template.signature_mode.split('_').filter(m=>m !== '')
  return <article className={`template-paper template-paper-${format.toLowerCase()}`}>
    <LabReportHeader {...header}/>
    <div className="template-body" dangerouslySetInnerHTML={{__html:renderDocument(template.body_html,values)}}/>
    <footer className="template-signatures"><p className="text-center mb-12">{values.local_data_extenso || '______'}</p><div className="flex gap-10 justify-center">
      {modes.map(mode=><div key={mode} className="flex-1 text-center"><div className="border-t border-current pt-2">{(mode==='empresa' ? values.responsavel_tecnico_nome : mode==='responsavel' ? values.responsavel_nome : values.paciente_nome) || '______'}</div><p className="text-xs mt-1">{mode==='empresa' ? 'Responsável da empresa' : mode==='responsavel' ? 'Responsável legal' : 'Paciente'}</p>{mode==='empresa' && <p className="text-xs">{values.responsavel_tecnico_registro}</p>}</div>)}
    </div></footer>
  </article>
}