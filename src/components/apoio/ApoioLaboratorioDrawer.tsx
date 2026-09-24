import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Plus, Trash2, Download, Upload, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { isValidCnpj, maskCnpj, onlyDigits } from '@/lib/cnpj'
import { useApoioEntitlement } from '@/hooks/useApoio'
import { LicencaBadge } from './ApoioLaboratoriosTab'
import { ReferenciaSection } from './ApoioReferencia'

export interface ApoioLab {
  id: string
  company_id: string
  nome: string
  cnpj: string | null
  conector: 'pardini' | 'manual'
  cod_lab: string | null
  senha_definida?: boolean
  senha_secret_id?: undefined
  endpoint_url: string | null
  ambiente: string | null
  modo_contingencia: boolean
  opcoes: { valorReferencia?: number; papelTimbrado?: boolean; grafico?: boolean; dadosConstantes?: boolean } | null
  dias_transporte: number
  prazo_contagem?: 'corridos' | 'uteis'
  guardar_pdf_sempre: boolean
  licenca_sanitaria: string | null
  licenca_validade: string | null
  licenca_arquivo_path?: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
}

interface Cert { id?: string; tipo: string; numero: string; validade: string; arquivo_path: string | null; _file?: File | null }

const ENDPOINT_PADRAO = 'https://www.hermespardini.com.br/b2b/HPWS.XMLServer.cls'

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome').max(150),
  cnpj: z.string().refine(v => !v || isValidCnpj(v), 'CNPJ inválido'),
  contato_email: z.string().trim().max(255).refine(v => !v || z.string().email().safeParse(v).success, 'E-mail inválido'),
  dias_transporte: z.number().int().min(0, 'Mínimo 0').max(60),
})

const maskFone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function Sec({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{n}. {t}</h3>
      {children}
    </section>
  )
}

export function ApoioLaboratorioDrawer({ open, lab, readOnly, podeCatalogo = false, moduloLiberado = true, onClose, onSaved }: {
  open: boolean; lab: ApoioLab | null; readOnly: boolean; podeCatalogo?: boolean; moduloLiberado?: boolean; onClose: () => void; onSaved: () => void
}) {
  const { companyId } = useApoioEntitlement()
  const [f, setF] = useState({
    nome: '', cnpj: '', contato_nome: '', contato_email: '', contato_telefone: '', dias_transporte: 1, prazo_contagem: 'uteis' as 'corridos' | 'uteis',
    conector: 'manual' as 'pardini' | 'manual', cod_lab: '', senha: '', endpoint_url: ENDPOINT_PADRAO, ambiente: 'homologacao',
    valorReferencia: 2, papelTimbrado: false, grafico: true, guardar_pdf_sempre: true,
    licenca_sanitaria: '', licenca_validade: '',
  })
  const [verSenha, setVerSenha] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [certs, setCerts] = useState<Cert[]>([])
  const [removidas, setRemovidas] = useState<Cert[]>([])
  const [editCert, setEditCert] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [licFile, setLicFile] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return
    setErros({}); setVerSenha(false); setRemovidas([]); setEditCert(null); setLicFile(null)
    if (lab) {
      setF({
        nome: lab.nome, cnpj: lab.cnpj ? maskCnpj(lab.cnpj) : '', contato_nome: lab.contato_nome || '', contato_email: lab.contato_email || '',
        contato_telefone: lab.contato_telefone || '', dias_transporte: lab.dias_transporte ?? 1, prazo_contagem: lab.prazo_contagem === 'corridos' ? 'corridos' : 'uteis', conector: lab.conector,
        cod_lab: lab.cod_lab || '', senha: '', endpoint_url: lab.endpoint_url || ENDPOINT_PADRAO, ambiente: lab.ambiente || 'homologacao',
        valorReferencia: lab.opcoes?.valorReferencia ?? 2, papelTimbrado: !!lab.opcoes?.papelTimbrado, grafico: lab.opcoes?.grafico ?? true,
        guardar_pdf_sempre: lab.guardar_pdf_sempre, licenca_sanitaria: lab.licenca_sanitaria || '', licenca_validade: lab.licenca_validade || '',
      })
      supabase.from('apoio_certificacao').select('id, tipo, numero, validade, arquivo_path').eq('apoio_id', lab.id).order('created_at')
        .then(({ data }) => setCerts(((data || []) as any[]).map(c => ({ ...c, tipo: c.tipo || '', numero: c.numero || '', validade: c.validade || '' }))))
    } else {
      setF(p => ({ ...p, nome: '', cnpj: '', contato_nome: '', contato_email: '', contato_telefone: '', dias_transporte: 1, prazo_contagem: 'uteis', conector: 'manual', cod_lab: '', senha: '', endpoint_url: ENDPOINT_PADRAO, ambiente: 'homologacao', valorReferencia: 2, papelTimbrado: false, grafico: true, guardar_pdf_sempre: true, licenca_sanitaria: '', licenca_validade: '' }))
      setCerts([])
    }
  }, [open, lab])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }))

  const salvar = async () => {
    const e: Record<string, string> = {}
    const r = schema.safeParse({ nome: f.nome, cnpj: f.cnpj, contato_email: f.contato_email, dias_transporte: Number(f.dias_transporte) })
    if (!r.success) r.error.issues.forEach(i => { e[String(i.path[0])] = i.message })
    if (f.conector === 'pardini') {
      if (!f.cod_lab.trim()) e.cod_lab = 'Informe o código do laboratório no apoio'
      if (!f.endpoint_url.trim() || !/^https:\/\//.test(f.endpoint_url.trim())) e.endpoint_url = 'Informe um endpoint https válido'
      if (!f.senha && !lab?.senha_definida) e.senha = 'Informe a senha'
    }
    certs.forEach((c, i) => { if (!c.tipo.trim()) e[`cert_${i}`] = 'Informe o tipo' })
    setErros(e)
    if (Object.keys(e).length) return toast.error('Corrija os campos destacados')
    if (!companyId) return

    setSaving(true)
    try {
      const row: Record<string, unknown> = {
        company_id: companyId, nome: f.nome.trim(), cnpj: onlyDigits(f.cnpj) || null,
        contato_nome: f.contato_nome.trim() || null, contato_email: f.contato_email.trim() || null, contato_telefone: onlyDigits(f.contato_telefone) || null,
        dias_transporte: Number(f.dias_transporte), prazo_contagem: f.prazo_contagem, conector: f.conector,
        cod_lab: f.conector === 'pardini' ? f.cod_lab.trim() : null,
        endpoint_url: f.conector === 'pardini' ? f.endpoint_url.trim() : null,
        ambiente: f.ambiente,
        opcoes: { ...(lab?.opcoes || {}), valorReferencia: Number(f.valorReferencia), papelTimbrado: f.papelTimbrado, grafico: f.grafico },
        guardar_pdf_sempre: f.guardar_pdf_sempre,
        licenca_sanitaria: f.licenca_sanitaria.trim() || null, licenca_validade: f.licenca_validade || null,
      }
      let id = lab?.id
      if (id) {
        const { error } = await supabase.from('apoio_laboratorio').update(row as never).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('apoio_laboratorio').insert(row as never).select('id').single()
        if (error) throw error
        id = (data as any).id
      }

      if (f.conector === 'pardini' && f.senha) {
        const { data, error } = await supabase.functions.invoke('apoio-salvar-senha', { body: { apoio_id: id, senha: f.senha } })
        if (error || !data?.ok) throw new Error(data?.error || 'Não foi possível guardar a senha')
      }

      if (licFile) {
        const ext = (licFile.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
        const path = `${companyId}/licenca/${id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('apoio-documentos').upload(path, licFile)
        if (upErr) throw new Error('Falha ao enviar a licença: ' + upErr.message)
        const { error: lErr } = await supabase.from('apoio_laboratorio').update({ licenca_arquivo_path: path } as never).eq('id', id!)
        if (lErr) throw lErr
        if (lab?.licenca_arquivo_path) await supabase.storage.from('apoio-documentos').remove([lab.licenca_arquivo_path])
      }

      for (const c of removidas) {
        if (c.arquivo_path) await supabase.storage.from('apoio-documentos').remove([c.arquivo_path])
        if (c.id) await supabase.from('apoio_certificacao').delete().eq('id', c.id)
      }
      for (const c of certs) {
        let path = c.arquivo_path
        if (c._file) {
          const ext = (c._file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '')
          path = `${companyId}/certificacoes/${id}/${crypto.randomUUID()}.${ext}`
          const { error: upErr } = await supabase.storage.from('apoio-documentos').upload(path, c._file)
          if (upErr) throw new Error('Falha ao enviar o certificado: ' + upErr.message)
          if (c.arquivo_path) await supabase.storage.from('apoio-documentos').remove([c.arquivo_path])
        }
        const payload = { company_id: companyId, apoio_id: id, tipo: c.tipo.trim(), numero: c.numero.trim() || null, validade: c.validade || null, arquivo_path: path }
        const { error } = c.id
          ? await supabase.from('apoio_certificacao').update(payload as never).eq('id', c.id)
          : await supabase.from('apoio_certificacao').insert(payload as never)
        if (error) throw error
      }
      toast.success(lab ? 'Laboratório de apoio atualizado' : 'Laboratório de apoio cadastrado')
      onSaved()
    } catch (err: any) {
      const msg = String(err?.message || '')
      toast.error('Não foi possível salvar', { description: msg.includes('row-level security') ? 'Você não tem permissão para esta ação.' : msg })
    } finally {
      setSaving(false)
    }
  }

  const baixar = async (path: string) => {
    const { data, error } = await supabase.storage.from('apoio-documentos').createSignedUrl(path, 60)
    if (error || !data) return toast.error('Não foi possível baixar o arquivo')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const input = 'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-70'
  const label = 'text-xs font-medium text-muted-foreground'
  const Err = ({ k }: { k: string }) => erros[k] ? <p className="mt-1 text-[11px] text-destructive">{erros[k]}</p> : null
  const ro = readOnly

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{lab ? (ro ? lab.nome : 'Editar laboratório de apoio') : 'Novo laboratório de apoio'}</SheetTitle>
        </SheetHeader>
        <fieldset disabled={ro || saving} className="mt-4 space-y-4">
          <Sec n={1} t="Dados">
            <div>
              <label className={label}>Nome *</label>
              <input className={input} value={f.nome} maxLength={150} onChange={e => set('nome', e.target.value)} />
              <Err k="nome" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>CNPJ</label>
                <input className={input} value={f.cnpj} placeholder="00.000.000/0000-00" onChange={e => set('cnpj', maskCnpj(e.target.value))} />
                <Err k="cnpj" />
              </div>
              <div>
                <label className={label}>Dias de transporte *</label>
                <input type="number" min={0} max={60} className={input} value={f.dias_transporte} onChange={e => set('dias_transporte', Number(e.target.value))} />
                <Err k="dias_transporte" />
              </div>
            </div>
            <div>
              <label className={label}>Contagem do prazo do apoio</label>
              <select className={input} value={f.prazo_contagem} onChange={e => set('prazo_contagem', e.target.value as any)}>
                <option value="uteis">Dias úteis</option>
                <option value="corridos">Dias corridos</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">Prazo do exame de apoio = prazo do apoio + dias de transporte, nesta contagem.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className={label}>Contato</label><input className={input} maxLength={120} value={f.contato_nome} onChange={e => set('contato_nome', e.target.value)} /></div>
              <div><label className={label}>E-mail</label><input className={input} maxLength={255} value={f.contato_email} onChange={e => set('contato_email', e.target.value)} /><Err k="contato_email" /></div>
              <div><label className={label}>Telefone</label><input className={input} value={maskFone(f.contato_telefone)} onChange={e => set('contato_telefone', e.target.value)} /></div>
            </div>
          </Sec>

          <Sec n={2} t="Integração">
            <div>
              <label className={label}>Conector *</label>
              <select className={input} value={f.conector} onChange={e => set('conector', e.target.value as any)}>
                <option value="manual">Manual</option>
                <option value="pardini">Pardini</option>
              </select>
            </div>
            {f.conector === 'pardini' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={label}>Código do laboratório no apoio *</label>
                    <input className={input} maxLength={50} value={f.cod_lab} onChange={e => set('cod_lab', e.target.value)} />
                    <Err k="cod_lab" />
                  </div>
                  <div>
                    <label className={label}>Senha *</label>
                    <div className="relative">
                      <input
                        type={verSenha ? 'text' : 'password'} autoComplete="new-password" maxLength={500}
                        className={input + ' pr-10'} value={f.senha}
                        placeholder={lab?.senha_definida ? '••••••• (definida)' : ''}
                        onChange={e => set('senha', e.target.value)}
                      />
                      <button type="button" onClick={() => setVerSenha(v => !v)} className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 p-1 text-muted-foreground" aria-label="Mostrar senha">
                        {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {lab?.senha_definida && <p className="mt-1 text-[11px] text-muted-foreground">Deixe em branco para manter a senha atual.</p>}
                    <Err k="senha" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={label}>Endpoint *</label>
                    <input className={input} value={f.endpoint_url} onChange={e => set('endpoint_url', e.target.value)} />
                    <Err k="endpoint_url" />
                  </div>
                  <div>
                    <label className={label}>Ambiente</label>
                    <select className={input} value={f.ambiente} onChange={e => set('ambiente', e.target.value)}>
                      <option value="homologacao">Homologação</option>
                      <option value="producao">Produção</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </Sec>

          {f.conector === 'pardini' && (
            <Sec n={3} t="Opções do resultado (Pardini)">
              <div>
                <label className={label}>Valor de referência</label>
                <select className={input} value={f.valorReferencia} onChange={e => set('valorReferencia', Number(e.target.value))}>
                  <option value={0}>0 — Estruturado</option>
                  <option value={1}>1 — Bloco de texto</option>
                  <option value={2}>2 — Bloco de texto por analito</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {f.valorReferencia === 0 ? 'Faixas separadas em campos; exige que todas as referências do apoio tenham formato padronizado.'
                    : f.valorReferencia === 1 ? 'Um único texto com todas as referências do exame.'
                    : 'Um texto de referência para cada analito (recomendado: fiel ao laudo do apoio).'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={f.papelTimbrado} onChange={e => set('papelTimbrado', e.target.checked)} /> Papel timbrado no PDF</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={f.grafico} onChange={e => set('grafico', e.target.checked)} /> Receber gráficos</label>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="accent-primary mt-1" checked={f.guardar_pdf_sempre} onChange={e => set('guardar_pdf_sempre', e.target.checked)} />
                <span>Guardar PDF de todo exame<span className="block text-[11px] text-muted-foreground">recomendado: o PDF identifica o laboratório executor</span></span>
              </label>
            </Sec>
          )}

          <Sec n={f.conector === 'pardini' ? 4 : 3} t="Qualificação">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className={label}>Licença sanitária</label><input className={input} maxLength={60} value={f.licenca_sanitaria} onChange={e => set('licenca_sanitaria', e.target.value)} /></div>
              <div>
                <label className={label}>Validade</label>
                <input type="date" className={input} value={f.licenca_validade} onChange={e => set('licenca_validade', e.target.value)} />
                {f.licenca_validade && <div className="mt-1 text-xs"><LicencaBadge validade={f.licenca_validade} /></div>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {lab?.licenca_arquivo_path && !licFile && (
                <a href="#" onClick={e => { e.preventDefault(); baixar(lab.licenca_arquivo_path!) }} className="flex items-center gap-1 font-medium text-primary hover:underline"><Download className="h-3.5 w-3.5" /> Visualizar / baixar licença</a>
              )}
              {!ro && (
                <label className="flex cursor-pointer items-center gap-1 text-primary">
                  <Upload className="h-3.5 w-3.5" /> {licFile ? licFile.name : lab?.licenca_arquivo_path ? 'Trocar arquivo da licença' : 'Enviar arquivo da licença (PDF/imagem)'}
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0] || null
                    if (file && file.size > 10 * 1024 * 1024) { toast.error('Arquivo acima de 10 MB'); return }
                    setLicFile(file)
                  }} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Certificações</p>
                {!ro && (
                  <button type="button" onClick={() => { setCerts(c => [...c, { tipo: '', numero: '', validade: '', arquivo_path: null }]); setEditCert(certs.length) }} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                )}
              </div>
              {certs.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma certificação cadastrada.</p>}
              {certs.map((c, i) => editCert === i ? (
                <div key={i} className="rounded-lg border border-primary/40 p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div><label className={label}>Tipo *</label><input className={input} placeholder="PALC, ONA, ISO 15189…" maxLength={60} value={c.tipo} onChange={e => setCerts(cs => cs.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))} /><Err k={`cert_${i}`} /></div>
                    <div><label className={label}>Número</label><input className={input} maxLength={60} value={c.numero} onChange={e => setCerts(cs => cs.map((x, j) => j === i ? { ...x, numero: e.target.value } : x))} /></div>
                    <div><label className={label}>Validade</label><input type="date" className={input} value={c.validade} onChange={e => setCerts(cs => cs.map((x, j) => j === i ? { ...x, validade: e.target.value } : x))} /></div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-primary">
                      <Upload className="h-3.5 w-3.5" /> {c._file ? c._file.name : c.arquivo_path ? 'Trocar certificado' : 'Enviar certificado (PDF/imagem)'}
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0] || null
                        if (file && file.size > 10 * 1024 * 1024) { toast.error('Arquivo acima de 10 MB'); return }
                        setCerts(cs => cs.map((x, j) => j === i ? { ...x, _file: file } : x))
                      }} />
                    </label>
                    <button type="button" onClick={() => setEditCert(null)} className="flex items-center gap-1 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" /> OK</button>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{c.tipo || '(sem tipo)'} {c.numero && <span className="text-muted-foreground">· {c.numero}</span>}</p>
                    <div className="text-xs"><LicencaBadge validade={c.validade || null} /></div>
                  </div>
                  {c.arquivo_path && !c._file && <a href="#" onClick={e => { e.preventDefault(); baixar(c.arquivo_path!) }} className="p-1 text-primary" title="Visualizar / baixar"><Download className="h-4 w-4" /></a>}
                  {c._file && <span className="text-[11px] text-muted-foreground">novo arquivo</span>}
                  {!ro && <button type="button" onClick={() => setEditCert(i)} className="p-1 text-muted-foreground" title="Editar"><Pencil className="h-4 w-4" /></button>}
                  {!ro && <button type="button" onClick={() => { setRemovidas(r => [...r, c]); setCerts(cs => cs.filter((_, j) => j !== i)) }} className="p-1 text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
              {removidas.length > 0 && <p className="text-[11px] text-muted-foreground">{removidas.length} certificação(ões) será(ão) excluída(s) ao salvar.</p>}
            </div>
          </Sec>
        </fieldset>

        {lab && (
          <div className="mt-4">
            <ReferenciaSection apoio={lab} podeGerenciar={podeCatalogo} moduloLiberado={moduloLiberado} />
          </div>
        )}

        <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-border bg-background py-3">
          <button onClick={onClose} className="flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm"><X className="h-4 w-4" /> {ro ? 'Fechar' : 'Cancelar'}</button>
          {!ro && (
            <button onClick={salvar} disabled={saving} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
