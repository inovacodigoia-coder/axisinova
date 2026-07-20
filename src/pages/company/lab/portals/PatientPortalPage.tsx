import { useState } from 'react';
import { 
  User, Calendar, FileText, Download, Printer, 
  Search, Lock, CheckCircle2, ChevronRight, LogIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function PatientPortalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.length >= 11 && birthDate) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto h-12 w-12 rounded-xl gradient-bg flex items-center justify-center text-white text-2xl font-bold mb-2">
              A
            </div>
            <CardTitle className="text-2xl font-bold">Portal do Paciente</CardTitle>
            <CardDescription>
              Consulte seus resultados de forma rápida e segura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">Seu CPF</Label>
                <Input 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input 
                  id="birthDate" 
                  type="date" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Button type="submit" className="w-full gradient-bg h-12 text-lg font-medium">
                Acessar Meus Resultados
              </Button>
            </form>
            <div className="mt-8 pt-6 border-t text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Dificuldades no acesso? Entre em contato com o laboratório.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="link" className="text-xs h-auto p-0">Suporte</Button>
                <Button variant="link" className="text-xs h-auto p-0">LGPD</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Patient Portal Header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="font-bold text-sm">AxisInova</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)} className="gap-2">
            Sair <LogIn className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Olá, João da Silva!</h2>
          <p className="text-muted-foreground text-sm">Bem-vindo ao seu portal de resultados.</p>
        </div>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seus exames recentes</h3>
          
          <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-0">
              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> 16 de Julho de 2026
                  </div>
                  <h4 className="font-bold">Protocolo: 20260716-360-80</h4>
                  <p className="text-xs text-muted-foreground">Albumina · Glicose · Ácido Úrico</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Disponível
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="bg-muted/50 p-3 flex justify-around border-t">
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                  <Printer className="h-3 w-3" /> Imprimir
                </Button>
                <div className="w-px h-4 bg-border my-auto" />
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                  <Download className="h-3 w-3" /> Baixar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden hover:shadow-md transition-shadow opacity-75">
            <CardContent className="p-0">
              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> 22 de Junho de 2026
                  </div>
                  <h4 className="font-bold">Protocolo: 20260622-714-66</h4>
                  <p className="text-xs text-muted-foreground">Albumina</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Entregue
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
          <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-900">Segurança de Dados</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Seus dados estão protegidos conforme as diretrizes da LGPD. O acesso a este portal é restrito e monitorado para sua segurança.
            </p>
          </div>
        </section>
      </main>

      <footer className="mt-12 text-center text-[10px] text-muted-foreground px-4">
        Este portal exibe resultados apenas para fins informativos. <br />
        Sempre consulte seu médico para interpretar os resultados.
      </footer>
    </div>
  );
}