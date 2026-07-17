import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function OriginsPage() {
  const [origins, setOrigins] = useState([
    { id: '00', name: 'Matriz', address: 'Rua X, 123', status: 'active', isDefault: true },
    { id: '01', name: 'Filial Norte', address: 'Av. Y, 456', status: 'active', isDefault: false },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Origens / Unidades</h1>
          <p className="text-muted-foreground">Gerencie as unidades e filiais da sua empresa</p>
        </div>
        <Button className="gradient-bg text-white gap-2">
          <Plus className="h-4 w-4" /> Nova Origem
        </Button>
      </div>

      <Card className="overflow-hidden border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Endereço</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Padrão</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {origins.map((origin) => (
              <tr key={origin.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-mono">{origin.id}</td>
                <td className="px-4 py-3 font-medium">{origin.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{origin.address}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Ativa</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {origin.isDefault ? (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 border-amber-200">
                      <Star className="h-3 w-3 fill-amber-500" /> Padrão
                    </Badge>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Definir</Button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                    {origin.id !== '00' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
