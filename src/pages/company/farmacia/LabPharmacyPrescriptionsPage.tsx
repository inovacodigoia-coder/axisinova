import { useCallback, useEffect, useState } from 'react'
import { Search, Clock, CheckCircle2, AlertTriangle, Pill, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { rpc } from '@/hooks/useCollectionPosts'

const db = supabase as any

export default function LabPharmacyPrescriptionsPage() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState<any[]>([])

  const load = useCallback(async () => {
    if (!companyId) return
    let q = db.from('pharmacy_dispensations').select('*, prescriptions(patient_name, doctor_name, created_at, bed_id, beds(name), prescription_items(medication, dose, route))')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)
    if (status !== 'todos') q = q.eq('status', status)
    const { data } = await q
    setRows(data || [])
  }, [companyId, status])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!companyId) return
    const ch = supabase.channel('pharm-' + companyId).on('postgres_changes', { event: '*', schema: 'public', table: 'pharmacy_dispensations', filter: `company_id=eq.${companyId}` }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, load])

  const list = rows.filter(r => !searchTerm || r.prescriptions?.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()))

  const badge = (r: any) => {
    if (r.urgent && r.status === 'pending') return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> URGENTE</Badge>
    if (r.status === 'pending') return <Badge variant="outline" className="gap-1 text-warning border-warning"><Clock className="h-3 w-3" /> Pendente</Badge>
    if (r.status === 'dispensed') return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Dispensado</Badge>
    return <Badge variant="secondary">Cancelado</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prescrições</h1>
        <p className="text-muted-foreground">Fila de dispensação das prescrições dos postos de coleta</p>
      </div>
      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-3 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="search">Paciente</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="search" className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="dispensed">Dispensado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead><TableHead>Leito</TableHead><TableHead>Médico</TableHead>
              <TableHead>Data / Hora</TableHead><TableHead>Itens</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma solicitação.</TableCell></TableRow>}
            {list.map(r => {
              const p = r.prescriptions || {}
              return (
                <TableRow key={r.id}>
                  <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{p.patient_name}</span></div></TableCell>
                  <TableCell className="text-sm">{p.beds?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{p.doctor_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell className="text-sm">{(p.prescription_items || []).map((i: any) => `${i.medication} ${i.dose} (${i.route})`).join('; ')}</TableCell>
                  <TableCell>{badge(r)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && <Button size="sm" className="gap-1" onClick={() => rpc('pharmacy_dispense', { _dispensation_id: r.id }, 'Dispensado').then(load)}><Pill className="h-3.5 w-3.5" />Dispensar</Button>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
