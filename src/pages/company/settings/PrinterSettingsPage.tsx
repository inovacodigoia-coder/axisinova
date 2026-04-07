import { useState } from 'react'
import { Save, Printer } from 'lucide-react'
import { toast } from 'sonner'

export default function PrinterSettingsPage() {
  const [printerType, setPrinterType] = useState<'none' | 'thermal_usb' | 'thermal_network'>('none')
  const [ip, setIp] = useState('192.168.1.100')
  const [port, setPort] = useState('9100')
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>('80')
  const [showLogo, setShowLogo] = useState(true)
  const [showClinicName, setShowClinicName] = useState(true)
  const [showTime, setShowTime] = useState(true)
  const [footerText, setFooterText] = useState('Obrigado pela preferência!')
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null)

  const testConnection = () => {
    // Simulate test
    setTimeout(() => {
      setTestResult(Math.random() > 0.3 ? 'success' : 'fail')
    }, 1000)
    toast.info('Testando conexão...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de Impressora</h1>
        <p className="text-sm text-muted-foreground">Configure a impressora térmica para emissão de senhas</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Tipo de Impressora</h3>
          <div className="flex gap-3">
            {([['none', 'Nenhuma'], ['thermal_usb', 'Térmica USB'], ['thermal_network', 'Térmica Rede']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setPrinterType(val)}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all ${printerType === val ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:border-primary/30 text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>

          {printerType === 'thermal_network' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Endereço IP</label>
                  <input value={ip} onChange={e => setIp(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Porta</label>
                  <input value={port} onChange={e => setPort(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={testConnection} className="rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-muted flex items-center gap-1.5">
                  🔌 Testar conexão
                </button>
                {testResult === 'success' && <span className="text-xs text-[hsl(var(--success))] font-medium">✅ Impressora conectada</span>}
                {testResult === 'fail' && <span className="text-xs text-destructive font-medium">❌ Falha na conexão</span>}
              </div>
            </div>
          )}
        </div>

        {printerType !== 'none' && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Configurações de Impressão</h3>
            <div>
              <label className="text-sm font-medium">Largura do papel</label>
              <div className="flex gap-3 mt-2">
                {(['58', '80'] as const).map(w => (
                  <button key={w} onClick={() => setPaperWidth(w)}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-medium ${paperWidth === w ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground'}`}>
                    {w}mm
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Logo no cabeçalho', checked: showLogo, set: setShowLogo },
                { label: 'Nome da clínica', checked: showClinicName, set: setShowClinicName },
                { label: 'Horário de emissão', checked: showTime, set: setShowTime },
              ].map(item => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.checked} onChange={e => item.set(e.target.checked)} className="rounded border-input" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium">Texto do rodapé</label>
              <input value={footerText} onChange={e => setFooterText(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button onClick={() => toast.success('Senha teste impressa!')} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-2">
              <Printer className="h-4 w-4" /> Imprimir senha teste
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={() => toast.success('Configurações de impressora salvas')} className="gradient-bg rounded-xl px-6 py-2.5 text-sm font-semibold text-white flex items-center gap-2">
            <Save className="h-4 w-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
