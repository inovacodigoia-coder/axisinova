import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Printer, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLabSettings } from '@/hooks/useLabSettings'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { documentValues, type DocumentTemplate } from '@/lib/documentTemplates'
import { TemplateDocument } from './TemplateDocument'
import { generateDocumentPdf } from '@/lib/documentPdf'
import { imprimirDireto, servidorImpressaoAtivo, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
export function DocumentPrintDialog({templates,attendanceId,onDone,onCancel}:{templates:DocumentTemplate[];attendanceId:string;onDone:()=>void;onCancel:()=>void}) {
  const {user}=useAuth(); const {settings,isLoading:settingsLoading}=useLabSettings()
  const [selected,setSelected]=useState<string[]>(templates.length===1?[templates[0].id]:[])
  const [formats,setFormats]=useState<Record<string,string>>(Object.fromEntries(templates.map(t=>[t.id,t.default_format])))
  const [values,setValues]=useState<Record<string,string>|null>(null);const [busy,setBusy]=useState(false); const [current,setCurrent]=useState<DocumentTemplate|null>(null);const [failed,setFailed]=useState(false);const started=useRef(false);const root=useRef<HTMLDivElement>(null)
  useEffect(()=>{let live=true;void(async()=>{try{
    const {data:order,error}=await supabase.from('attendance_orders').select('*').eq('id',attendanceId).eq('company_id',user?.companyId || '').single();if(error||!order)throw new Error('Atendimento indisponível')
    const [patient,company]=await Promise.all([supabase.from('patients').select('*').eq('id',order.patient_id || '').eq('company_id',order.company_id).single(),supabase.from('companies').select('*').eq('id',order.company_id).single()])
    if(patient.error||company.error)throw new Error('Não foi possível carregar os dados do documento')
    if(live)setValues(documentValues(order,patient.data || {},company.data || {},settings || {}))
  }catch(e){if(live){setFailed(true);toast.error(e instanceof Error?e.message:'Falha ao carregar documento')}}})();return()=>{live=false}},[attendanceId,user?.companyId,settings])
  const record=async(t:DocumentTemplate)=>{const {error}=await supabase.rpc('documento_impressao_registrar',{_modelo:t.id,_atendimento:attendanceId,_formato:formats[t.id]});if(error)throw new Error(`Impressão solicitada, mas o registro falhou: ${error.message}`)}
  const run=async()=>{
    if(busy||!values||!selected.length)return
    setBusy(true)
    try{
      const {data:allowed,error:permissionError}=await supabase.rpc('documento_pode_imprimir');
      if(permissionError || !allowed) throw new Error('Sem permissão para imprimir documentos deste atendimento');
      const active=await servidorImpressaoAtivo()
      for(const t of templates.filter(t=>selected.includes(t.id))){
        setCurrent(t);await new Promise(resolve=>setTimeout(resolve,120))
        const node=root.current?.querySelector<HTMLElement>('article');if(!node)throw new Error('Documento não disponível')
        await Promise.all(Array.from(node.querySelectorAll('img')).map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve()})))
        await document.fonts.ready
        if(active){const pdf=await generateDocumentPdf(node,formats[t.id]);await imprimirDireto(TIPOS_DOCUMENTO.termoConsentimento,pdf);await record(t)}
        else{
          const frame=document.createElement('iframe');frame.className='document-print-frame';document.body.appendChild(frame);
          const win=frame.contentWindow;if(!win){frame.remove();throw new Error('Não foi possível abrir a impressão no navegador')}
          win.document.write('<!doctype html><html><head><title>Documento do atendimento</title></head><body></body></html>');win.document.close()
          document.querySelectorAll('style,link[rel="stylesheet"]').forEach(el=>win.document.head.appendChild(el.cloneNode(true)))
          const style=win.document.createElement('style');style.textContent=`@page {size:${formats[t.id]} portrait;margin:10mm} body{margin:0;background:var(--document-paper)} .template-paper{width:100%;min-height:0;padding:0;margin:0;box-shadow:none}`;win.document.head.appendChild(style)
          win.document.body.appendChild(node.cloneNode(true))
          await new Promise<void>(resolve=>{let ended=false;const done=()=>{if(ended)return;ended=true;frame.remove();resolve()};win.addEventListener('afterprint',done,{once:true});win.setTimeout(()=>win.print(),350)})
          await record(t)
        }
      }
      toast.success('Documentos enviados para impressão');onDone()
    }catch(e){toast.error(e instanceof Error?e.message:'Não foi possível imprimir');started.current=false}finally{setBusy(false)}
  }
  useEffect(()=>{if(templates.length===1&&values&&!settingsLoading&&!started.current){started.current=true;void run()}},[values,settingsLoading])
  const header={companyLogo:settings?.report_logo_primary_url || undefined,secondaryLogo:settings?.report_logo_secondary_url || undefined,laboratoryName:settings?.report_header_title || values?.empresa_nome,laboratorySubtitle:settings?.report_header_subtitle || undefined}
  return <Dialog open onOpenChange={o=>!o&&!busy&&onCancel()}><DialogContent className="max-w-[940px] w-[95vw] max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{templates.length>1?'Escolha o documento':'Impressão do documento'}</DialogTitle></DialogHeader>
    {templates.map(t=><div key={t.id} className="flex items-center gap-3 border-b border-border py-2"><Checkbox aria-label={t.name} checked={selected.includes(t.id)} disabled={busy} onCheckedChange={v=>setSelected(prev=>v===true?[...prev,t.id]:prev.filter(id=>id!==t.id))}/><span className="flex-1 text-sm">{t.name}</span><select aria-label={`Formato de ${t.name}`} disabled={busy} value={formats[t.id]} className="border border-input rounded bg-background px-2 py-1" onChange={e=>setFormats({...formats,[t.id]:e.target.value})}><option>A4</option><option>A5</option></select></div>)}
    {!values&&!failed&&<Loader2 className="animate-spin"/>}{failed&&<p role="alert" className="text-destructive">Não foi possível carregar os dados do documento.</p>}
    {values&&<div className="overflow-x-auto bg-muted p-3" ref={root}>{(current||templates.find(t=>selected.includes(t.id)))&&<TemplateDocument template={current||templates.find(t=>selected.includes(t.id))||templates[0]} values={values} header={header} format={formats[(current||templates.find(t=>selected.includes(t.id))||templates[0]).id]}/>}</div>}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onCancel}>Cancelar</Button><Button disabled={busy||!values||!selected.length||settingsLoading} onClick={run}>{busy?<Loader2 className="h-4 w-4 animate-spin mr-2"/>:<Printer className="h-4 w-4 mr-2"/>}{busy?'Imprimindo…':'Imprimir'}</Button></div>
  </DialogContent></Dialog>
}