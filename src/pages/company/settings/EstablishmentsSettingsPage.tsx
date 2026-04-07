import { useState } from 'react'
import { MapPin } from 'lucide-react'

export default function EstablishmentsSettingsPage() {
  const [establishments] = useState([
    { id: '1', name: 'Unidade Centro', cnpj: '12.345.678/0001-95', city: 'São Paulo' },
    { id: '2', name: 'Unidade Alphaville', cnpj: '12.345.678/0002-76', city: 'Barueri' },
  ])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estabelecimentos e Unidades</h1>
          <p className="text-sm text-muted-foreground">Gerencie filiais e unidades de atendimento</p>
        </div>
        <button className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">+ Adicionar Unidade</button>
      </div>
      <div className="space-y-2">
        {establishments.map(e => (
          <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.cnpj} · {e.city}</p>
              </div>
            </div>
            <button className="text-xs text-primary hover:underline">Editar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
