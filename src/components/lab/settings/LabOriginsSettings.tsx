import { Link } from "react-router-dom";
import { Globe, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** As origens (unidades) são editadas só em Configurações › Origens. */
export function LabOriginsSettings() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Origens de Atendimento</CardTitle>
            <CardDescription>As origens (unidades), seus papéis e o laboratório de destino ficam em Configurações › Origens.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/app/configuracoes/origens">Abrir Configurações › Origens <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}
