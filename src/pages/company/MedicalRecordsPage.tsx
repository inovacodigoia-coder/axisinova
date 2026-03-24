import { useState } from 'react'
import { Search, Plus, FileText, User, Calendar, ChevronRight, Heart, Stethoscope } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { SearchInput } from '@/components/ui/SearchInput'

interface Patient {
  id: string; name: string; cpf: string; birthDate: string; phone: string
  lastVisit: string; totalVisits: number; bloodType: string; allergies: string[]
}

const mockPatients: Patient[] = [
  { id: '1', name: 'Maria Aparecida Silva', cpf: '123.456.789-00', birthDate: '15/03/1985', phone: '(11) 98765-4321', lastVisit: '22/03/2026', totalVisits: 12, bloodType: 'A+', allergies: ['Dipirona'] },
  { id: '2', name: 'João Carlos Santos', cpf: '987.654.321-00', birthDate: '08/07/1972', phone: '(11) 91234-5678', lastVisit: '20/03/2026', totalVisits: 8, bloodType: 'O-', allergies: [] },
  { id: '3', name: 'Ana Paula Oliveira', cpf: '456.789.123-00', birthDate: '22/11/1990', phone: '(21) 99876-5432', lastVisit: '18/03/2026', totalVisits: 5, bloodType: 'B+', allergies: ['Penicilina', 'Latex'] },
  { id: '4', name: 'Pedro Henrique Costa', cpf: '321.654.987-00', birthDate: '03/09/1968', phone: '(31) 98765-1234', lastVisit: '15/03/2026', totalVisits: 22, bloodType: 'AB+', allergies: ['AAS'] },
  { id: '5', name: 'Lucia Ferreira Lima', cpf: '654.321.987-00', birthDate: '17/01/1995', phone: '(41) 97654-3210', lastVisit: '10/03/2026', totalVisits: 3, bloodType: 'O+', allergies: [] },
]

interface MedicalRecord {
  date: string; doctor: string; type: string; diagnosis: string; notes: string
}

const mockRecords: Record<string, MedicalRecord[]> = {
  '1': [
    { date: '22/03/2026', doctor: 'Dr. Carlos Mendes', type: 'Consulta', diagnosis: 'Hipertensão arterial - acompanhamento', notes: 'PA 140/90. Ajuste de medicação.' },
    { date: '15/02/2026', doctor: 'Dr. Carlos Mendes', type: 'Retorno', diagnosis: 'Hipertensão arterial', notes: 'Exames laboratoriais dentro do esperado.' },
  ],
  '2': [
    { date: '20/03/2026', doctor: 'Dra. Ana Paula', type: 'Consulta', diagnosis: 'Lombalgia crônica', notes: 'Prescrição de fisioterapia. Retorno em 30 dias.' },
  ],
}

export default function MedicalRecordsPage() {
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const filtered = mockPatients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cpf.includes(search)
  )

  if (selectedPatient) {
    const records = mockRecords[selectedPatient.id] || []
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          ← Voltar para lista
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient info card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-bg text-white font-bold">
                {selectedPatient.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-foreground">{selectedPatient.name}</h2>
                <p className="text-xs text-muted-foreground">CPF: {selectedPatient.cpf}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Nascimento</span><span className="text-foreground">{selectedPatient.birthDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span className="text-foreground">{selectedPatient.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo Sanguíneo</span><span className="font-bold text-destructive">{selectedPatient.bloodType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total de Visitas</span><span className="text-foreground">{selectedPatient.totalVisits}</span></div>
              {selectedPatient.allergies.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Alergias:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPatient.allergies.map((a) => (
                      <span key={a} className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Records */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Histórico de Prontuário</h3>
              <GradientButton><Plus className="h-4 w-4 mr-2" /> Nova Entrada</GradientButton>
            </div>
            {records.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            ) : (
              records.map((r, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{r.type}</span>
                      <span className="text-xs text-muted-foreground">· {r.date}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.doctor}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{r.diagnosis}</p>
                  <p className="text-sm text-muted-foreground">{r.notes}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prontuário Eletrônico</h1>
          <p className="text-sm text-muted-foreground">Busque e gerencie prontuários de pacientes</p>
        </div>
        <GradientButton><Plus className="h-4 w-4 mr-2" /> Novo Paciente</GradientButton>
      </div>

      <div className="w-full sm:w-80">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou CPF..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPatient(p)}
            className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-left hover:shadow-lg hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-white text-sm font-bold">
                {p.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.cpf}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.lastVisit}</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {p.totalVisits} visitas</span>
              {p.allergies.length > 0 && (
                <span className="flex items-center gap-1 text-destructive"><Heart className="h-3 w-3" /> {p.allergies.length} alergia(s)</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
