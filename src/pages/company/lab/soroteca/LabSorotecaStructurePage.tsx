import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function LabSorotecaStructurePage() {
  const equipments = [
    { name: 'Geladeira 01', type: 'Geladeira', temp: '2-8°C', workbench: 'Bioquímica', capacity: '500 pos', occupancy: '73%', status: 'active' },
    { name: 'Freezer 01', type: 'Freezer', temp: '-20°C', workbench: 'Coagulação', capacity: '200 pos', occupancy: '45%', status: 'active' },
    { name: 'Estante Ambiente', type: 'Estante', temp: 'Ambiente', workbench: 'Uroanálise', capacity: '100 pos', occupancy: '20%', status: 'active' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estrutura de Armazenamento</h1>
          <p className="text-muted-foreground">Gestão de equipamentos, containers e posições</p>
        </div>
        <Button>+ Novo Equipamento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Bancada</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Ocupação</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipments.map((eq) => (
                <TableRow key={eq.name}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell>{eq.type}</TableCell>
                  <TableCell>{eq.temp}</TableCell>
                  <TableCell>{eq.workbench}</TableCell>
                  <TableCell>{eq.capacity}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: eq.occupancy }} 
                        />
                      </div>
                      <span className="text-xs">{eq.occupancy}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">✅ Ativo</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
