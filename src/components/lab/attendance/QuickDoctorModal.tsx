import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRegisters } from '@/context/RegistersContext';
import { UserPlus } from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface Props {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  onCreated?: (doctor: any) => void;
}

export function QuickDoctorModal({ open, onClose, defaultName = '', onCreated }: Props) {
  const { addDoctor, specialties, addSpecialty } = useRegisters();
  const [fullName, setFullName] = useState(defaultName);
  const [council, setCouncil] = useState('CRM');
  const [crm, setCrm] = useState('');
  const [crmState, setCrmState] = useState('RN');
  const [specialtyId, setSpecialtyId] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [creatingSpec, setCreatingSpec] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setFullName(defaultName);
      setCrm(''); setSpecialtyId(''); setPhone(''); setEmail(''); setNewSpecialty('');
    }
  }, [open, defaultName]);

  const handleCreateSpecialty = async () => {
    const name = newSpecialty.trim();
    if (!name) return toast.error('Informe o nome da especialidade');
    const existing = specialties.find((s: any) => s.name?.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSpecialtyId(existing.id);
      setNewSpecialty('');
      return toast.info('Especialidade já cadastrada — selecionada');
    }
    setCreatingSpec(true);
    const id = crypto.randomUUID();
    try {
      await addSpecialty({ id, companyId: '', name, isActive: true } as any);
      setSpecialtyId(id);
      setNewSpecialty('');
      toast.success('Especialidade cadastrada');
    } finally {
      setCreatingSpec(false);
    }
  };


  const handleSave = async () => {
    if (!fullName.trim()) return toast.error('Informe o nome do médico');
    if (!crm.trim()) return toast.error('Informe o número de inscrição');
    setSaving(true);
    const doctor: any = {
      id: crypto.randomUUID(),
      companyId: '',
      fullName: fullName.trim(),
      crm: crm.trim(),
      crmState,
      specialtyIds: specialtyId ? [specialtyId] : [],
      enabledConvenioIds: [],
      phone: phone || undefined,
      email: email || undefined,
      isActive: true,
      isBlocked: false,
    };
    try {
      await addDoctor(doctor);
      toast.success('Médico cadastrado com sucesso');
      onCreated?.({ ...doctor, council });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Cadastrar Novo Médico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div>
            <Label className="text-[11px] uppercase text-muted-foreground">Nome Completo *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome do médico" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground">Conselho</Label>
              <select value={council} onChange={e => setCouncil(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option>CRM</option><option>CRO</option><option>RMS</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground">UF</Label>
              <select value={crmState} onChange={e => setCrmState(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                {UFS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground">Nº Inscrição *</Label>
              <Input value={crm} onChange={e => setCrm(e.target.value)} placeholder="000000" />
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase text-muted-foreground">Especialidade</Label>
            <select value={specialtyId} onChange={e => setSpecialtyId(e.target.value)}
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Selecione...</option>
              {specialties.filter((s: any) => s.isActive !== false).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__other__">Outros (digitar nova)...</option>
            </select>
            {specialtyId === '__other__' && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={newSpecialty}
                  onChange={e => setNewSpecialty(e.target.value)}
                  placeholder="Nome da nova especialidade"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSpecialty(); } }}
                />
                <Button type="button" variant="secondary" onClick={handleCreateSpecialty} disabled={creatingSpec}>
                  {creatingSpec ? 'Salvando...' : 'Adicionar'}
                </Button>
              </div>
            )}
          </div>


          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label className="text-[11px] uppercase text-muted-foreground">E-mail</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Médico'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
