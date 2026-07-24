import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Origin {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export function LabOriginsSettings() {
  const { toast } = useToast();
  const [origins, setOrigins] = useState<Origin[]>([
    { id: "1", code: "00", name: "Sede Principal", isActive: true },
  ]);
  const [newOrigin, setNewOrigin] = useState({ code: "", name: "" });

  const handleAddOrigin = () => {
    if (!newOrigin.code || !newOrigin.name) {
      toast({
        title: "Erro",
        description: "Preencha o código e o nome da origem.",
        variant: "destructive",
      });
      return;
    }

    if (origins.some(o => o.code === newOrigin.code)) {
      toast({
        title: "Erro",
        description: "Este código de origem já existe.",
        variant: "destructive",
      });
      return;
    }

    const origin: Origin = {
      id: Math.random().toString(36).substr(2, 9),
      code: newOrigin.code.padStart(2, '0'),
      name: newOrigin.name,
      isActive: true,
    };

    setOrigins([...origins, origin]);
    setNewOrigin({ code: "", name: "" });
    toast({
      title: "Sucesso",
      description: "Origem cadastrada com sucesso.",
    });
  };

  const handleDeleteOrigin = (id: string) => {
    if (origins.find(o => o.id === id)?.code === "00") {
      toast({
        title: "Erro",
        description: "A origem padrão 00 não pode ser excluída.",
        variant: "destructive",
      });
      return;
    }
    setOrigins(origins.filter(o => o.id !== id));
    toast({
      title: "Sucesso",
      description: "Origem removida.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Origens de Atendimento</CardTitle>
            <CardDescription>
              Gerencie os locais de origem dos pedidos (Unidades, Postos de Coleta, etc.)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-muted/30 p-4 rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium">Código (2 dígitos)</label>
            <Input 
              placeholder="Ex: 01" 
              maxLength={2}
              value={newOrigin.code}
              onChange={(e) => setNewOrigin({ ...newOrigin, code: e.target.value.replace(/\D/g, '') })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Origem</label>
            <Input 
              placeholder="Ex: Unidade Centro" 
              value={newOrigin.name}
              onChange={(e) => setNewOrigin({ ...newOrigin, name: e.target.value })}
            />
          </div>
          <Button onClick={handleAddOrigin} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Origem
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {origins.map((origin) => (
              <TableRow key={origin.id}>
                <TableCell className="font-mono font-bold">{origin.code}</TableCell>
                <TableCell>{origin.name}</TableCell>
                <TableCell>
                  <Badge variant={origin.isActive ? "default" : "secondary"}>
                    {origin.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {origin.code !== "00" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Origem?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não poderá ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteOrigin(origin.id)} className="bg-destructive text-destructive-foreground">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {origin.code === "00" && (
                    <Badge variant="outline" className="text-muted-foreground">Padrão</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
