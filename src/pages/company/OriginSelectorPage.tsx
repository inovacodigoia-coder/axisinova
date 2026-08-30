import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Search, Heart, Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLandingRoute } from '@/utils/landingRoute';

export default function OriginSelectorPage() {
  const { user } = useAuth();
  const { availableOrigins, selectOrigin, refreshOrigins, canAccess, activeSector } = useCompanyContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [defaultOriginId, setDefaultOriginId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
      refreshOrigins();
    }
  }, [user, refreshOrigins]);

  const loadPreferences = async () => {
    const { data, error } = await (supabase as any)
      .from('user_origin_preferences')
      .select('origin_id, is_favorite, is_default')
      .eq('user_id', user?.id);
    
    if (error) {
      console.error('Error loading preferences:', error);
      return;
    }

    setFavorites(data.filter((p: any) => p.is_favorite).map((p: any) => p.origin_id));
    setDefaultOriginId(data.find((p: any) => p.is_default)?.origin_id || null);
  };

  const handleConfirm = (origin: any) => {
    selectOrigin(origin);
    navigate(getLandingRoute(canAccess, activeSector));
  };

  const filteredOrigins = availableOrigins.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.internal_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-[520px] p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Olá, {user?.name || 'Bem-vindo'}!</h1>
            <p className="text-muted-foreground text-base">Selecione a unidade de atendimento para iniciar</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Busque a origem ou código..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredOrigins.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground italic text-sm">
                  Nenhuma origem encontrada.
                </div>
              ) : (
                filteredOrigins.map((origin) => (
                  <button
                    key={origin.id}
                    onClick={() => handleConfirm(origin)}
                    className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground uppercase tracking-tight">{origin.name}</p>
                        {origin.internal_code && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Código: {origin.internal_code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {favorites.includes(origin.id) && <Heart className="h-4 w-4 text-rose-500 fill-current" />}
                      {defaultOriginId === origin.id && <Star className="h-4 w-4 text-amber-500 fill-current" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

