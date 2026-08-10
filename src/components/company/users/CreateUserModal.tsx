import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Administrador' },
  { value: 'doctor', label: 'Médico' },
  { value: 'receptionist', label: 'Recepcionista' },
  { value: 'billing', label: 'Faturista' },
  { value: 'telephonist', label: 'Telefonista' },
  { value: 'nurse', label: 'Enfermeiro(a)' },
  { value: 'pharmacist', label: 'Farmacêutico(a)' },
  { value: 'biochemist', label: 'Bioquímico' },
  { value: 'analyst', label: 'Analista' },
  { value: 'other', label: 'Outros' },
]

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateUserModal({ open, onOpenChange, onCreated }: CreateUserModalProps) {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [role, setRole] = useState('')
  const [password, setPassword] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [badgeCode, setBadgeCode] = useState('')
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setCpf('')
    setRole('')
    setPassword('')
    setCustomRole('')
    setBadgeCode('')
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
        body: {
          email,
          password,
          full_name: fullName,
          cpf: cpf || null,
          badge_code: badgeCode || null,
          role: role === 'other' ? customRole : role,
          company_id: user?.companyId || null,
        },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })

      if (res.error) {
        const errorMsg = typeof res.error === 'object' && 'message' in res.error
          ? (res.error as any).message
          : 'Erro ao criar usuário'
        toast.error(errorMsg)
        return
      }

      if (res.data?.error) {
        toast.error(res.data.error)
        return
      }

      toast.success('Usuário criado com sucesso!')
      resetForm()
      onOpenChange(false)
      setTimeout(() => onCreated(), 500)
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
          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Label htmlFor="badgeCode" className="text-primary font-bold text-xs uppercase">Código do Crachá</Label>
            <div className="flex gap-2">
              <Input 
                id="badgeCode" 
                value={badgeCode} 
                onChange={e => setBadgeCode(e.target.value.toUpperCase())} 
                placeholder="Bipe o código do crachá" 
                className="border-primary/30 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                title="Gerar código aleatório"
                onClick={() => {
                  const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
                  setBadgeCode(randomCode);
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Identificador único para login por bipe de crachá.</p>
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
          {role === 'other' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="customRole">Nova Função *</Label>
              <Input 
                id="customRole" 
                value={customRole} 
                onChange={e => setCustomRole(e.target.value)} 
                placeholder="Digite o nome da função" 
              />
            </div>
          )}
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
