import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

export default function OriginSelectorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOrigin, setSelectedOrigin] = useState('00');

  const handleConfirm = () => {
    sessionStorage.setItem('activeOrigin', JSON.stringify({
      originId: 'orig_00',
      originCode: 0,
      originName: 'Matriz'
    }));
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-[480px] p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Olá, {user?.name}!</h1>
            <p className="text-muted-foreground">Selecione a origem de atendimento</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem *</label>
              <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="00">Matriz (00)</SelectItem>
                  <SelectItem value="01">Filial Norte (01)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleConfirm} className="w-full gradient-bg text-white">
              Confirmar e Acessar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
