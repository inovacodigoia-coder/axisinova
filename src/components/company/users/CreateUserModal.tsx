import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Administrador' },
  { value: 'doctor', label: 'Médico' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'billing', label: 'Faturista' },
  { value: 'telephonist', label: 'Telefonista' },
  { value: 'nurse', label: 'Enfermeiro(a)' },
  { value: 'pharmacist', label: 'Farmacêutico(a)' },
  { value: 'analyst', label: 'Analista' },
]

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateUserModal({ open, onOpenChange, onCreated }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setCpf('')
    setRole('')
    setPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim() || !email.trim() || !role || !password.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const res = await supabase.functions.invoke('create-user', {
        body: { email, password, full_name: fullName, cpf: cpf || null, role },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Erro ao criar usuário')
        return
      }

      toast.success('Usuário criado com sucesso!')
      resetForm()
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo *</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome do usuário" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
