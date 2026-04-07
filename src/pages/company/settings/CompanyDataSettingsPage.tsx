import { useState } from 'react'
import { Building2, Save, Bell, MapPin } from 'lucide-react'
import { toast } from 'sonner'

export default function CompanyDataSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
        <p className="text-sm text-muted-foreground">Informações de cadastro da empresa</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Razão Social</label><input defaultValue="Clínica Vida & Saúde LTDA" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">Nome Fantasia</label><input defaultValue="Clínica Vida & Saúde" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">CNPJ</label><input defaultValue="12.345.678/0001-95" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">Telefone</label><input defaultValue="(11) 3456-7890" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">E-mail</label><input defaultValue="contato@vidaesaude.com.br" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">Website</label><input defaultValue="https://vidaesaude.com.br" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={() => toast.success('Dados salvos')} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white flex items-center gap-2"><Save className="h-4 w-4" /> Salvar</button>
        </div>
      </div>
    </div>
  )
}
