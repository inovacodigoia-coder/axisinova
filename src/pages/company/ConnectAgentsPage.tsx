import { useMemo, useState } from 'react'
import {
  Bot, Copy, Check, ExternalLink, RefreshCw, Link2, ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'

const APP_NAME = 'Axis Inova'
const SERVER_SLUG = 'axis-inova'

function resolveMcpUrl(): string {
  const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseUrl = new URL(configuredSupabaseUrl)
  const authority = configuredSupabaseUrl.match(/^https?:\/\/([^/?#]*)/i)?.[1] ?? ''
  const loopbackAuthority = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(authority)
  if (
    !authority ||
    authority.includes('@') ||
    configuredSupabaseUrl.includes('?') ||
    configuredSupabaseUrl.includes('#') ||
    (supabaseUrl.protocol === 'http:' && !loopbackAuthority)
  ) {
    throw new Error('VITE_SUPABASE_URL inválida')
  }
  const legacyLovableCloud = supabaseUrl.hostname.endsWith('.lovable.cloud') && !supabaseUrl.hostname.startsWith('c--')
  const dataPlaneUrl = legacyLovableCloud
    ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
    : supabaseUrl.toString().replace(/\/+$/, '')
  return `${dataPlaneUrl}/functions/v1/mcp`
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} copiado`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-2 shrink-0">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  )
}

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
      {steps.map((s, i) => (
        <li key={i} className="leading-relaxed">{s}</li>
      ))}
    </ol>
  )
}

export default function ConnectAgentsPage() {
  const mcpUrl = useMemo(() => resolveMcpUrl(), [])
  const claudeAddUrl = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(APP_NAME)}&connectorUrl=${encodeURIComponent(mcpUrl)}`
  const claudeCodeCommand = `claude mcp add --scope user --transport http ${SERVER_SLUG} '${mcpUrl.replace(/'/g, `'\\''`)}'`

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          Conectar Agentes de IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte um assistente de IA (ChatGPT, Claude, Claude Code ou outro cliente MCP) ao {APP_NAME}.
          O assistente poderá buscar pacientes, listar atendimentos, consultar exames de um protocolo e
          o catálogo de exames — sempre com a sua conta e respeitando as permissões da sua empresa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Endereço do servidor
          </CardTitle>
          <CardDescription>
            Este é o endereço que você vai colar no assistente de IA para conectar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
            <code className="text-sm flex-1 break-all">{mcpUrl}</code>
            <CopyButton text={mcpUrl} label="Endereço" />
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            A conexão exige o seu login do {APP_NAME}. O assistente só acessa os dados que o seu usuário pode ver.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como conectar</CardTitle>
          <CardDescription>Escolha o assistente que você usa e siga os passos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="chatgpt">
            <AccordionItem value="chatgpt">
              <AccordionTrigger>ChatGPT</AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Abra <a className="text-primary underline" href="https://chatgpt.com/#settings/Connectors/Advanced" target="_blank" rel="noreferrer">as configurações de Conectores do ChatGPT</a> e ative o Modo de desenvolvedor (leia o aviso de risco exibido). Se não estiver disponível, peça a um administrador do ChatGPT para ativar.</>,
                    <>Clique <a className="text-primary underline" href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins" target="_blank" rel="noreferrer">aqui para abrir a janela de novo conector</a>.</>,
                    <>Preencha o nome com <strong>{APP_NAME}</strong> e cole o endereço do servidor acima no campo de URL.</>,
                    <>Revise os detalhes, marque “I understand and want to continue” (o ChatGPT mostra esse aviso para todo conector personalizado) e clique em “Create”.</>,
                    <>Ative o conector no compositor da conversa e peça ao ChatGPT para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="claude">
              <AccordionTrigger>Claude</AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Clique <a className="text-primary underline" href={claudeAddUrl} target="_blank" rel="noreferrer">aqui para abrir o Claude com o conector já preenchido</a>.</>,
                    <>Revise os detalhes e clique em “Add”.</>,
                    <>Se o formulário preenchido não abrir, abra a página de Conectores do Claude, escolha “Add custom connector”, informe o nome <strong>{APP_NAME}</strong> e cole o endereço do servidor acima.</>,
                    <>Ative o conector no compositor da conversa e peça ao Claude para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="claude-code">
              <AccordionTrigger>Claude Code</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">1. Execute este comando no terminal:</p>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <code className="text-xs flex-1 break-all">{claudeCodeCommand}</code>
                  <CopyButton text={claudeCodeCommand} label="Comando" />
                </div>
                <StepList
                  steps={[
                    <>Abra o Claude Code e execute <code className="bg-muted px-1 rounded">/mcp</code> para confirmar que o {APP_NAME} está conectado. Ele pedirá o seu login nesse menu, se necessário.</>,
                    <>Peça ao Claude Code para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="outros">
              <AccordionTrigger>Outros assistentes com suporte a MCP</AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Abra as configurações de servidores MCP ou conectores personalizados do cliente.</>,
                    <>Crie uma conexão de servidor MCP remoto.</>,
                    <>Dê um nome à conexão e cole o endereço do servidor acima.</>,
                    <>Conclua as telas de login ou autorização que aparecerem.</>,
                    <>Ative a conexão e peça ao assistente para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar a conexão depois de mudanças no app
          </CardTitle>
          <CardDescription>
            Quando o {APP_NAME} ganha novas funções, o assistente precisa ser atualizado para enxergá-las.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="r-chatgpt">
              <AccordionTrigger>ChatGPT <Badge variant="secondary" className="ml-2">atualizar</Badge></AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Abra a página de Plugins do ChatGPT e selecione o {APP_NAME}.</>,
                    <>Role até “Information” e clique em “Refresh”.</>,
                    <>O ChatGPT não atualiza o endereço de um conector existente — se ele mudou, remova o plugin e refaça os passos de conexão com o endereço acima.</>,
                    <>Inicie uma nova conversa e peça ao ChatGPT para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="r-claude">
              <AccordionTrigger>Claude <Badge variant="secondary" className="ml-2">atualizar</Badge></AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Abra a página de Conectores do Claude e selecione este conector.</>,
                    <>Atualize as ferramentas do conector.</>,
                    <>O Claude não atualiza o endereço de um conector existente — se ele mudou, remova o conector e refaça os passos de conexão com o endereço acima.</>,
                    <>Peça ao Claude para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="r-claude-code">
              <AccordionTrigger>Claude Code <Badge variant="secondary" className="ml-2">atualizar</Badge></AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Inicie uma nova sessão do Claude Code — ele carrega as ferramentas mais recentes ao conectar.</>,
                    <>Se o endereço mudou, execute <code className="bg-muted px-1 rounded">claude mcp remove {SERVER_SLUG}</code> e depois o comando de instalação acima com o endereço novo.</>,
                    <>Peça ao Claude Code para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="r-outros">
              <AccordionTrigger>Outros assistentes <Badge variant="secondary" className="ml-2">atualizar</Badge></AccordionTrigger>
              <AccordionContent>
                <StepList
                  steps={[
                    <>Abra as configurações de servidores MCP ou conectores do cliente.</>,
                    <>Selecione a conexão criada para o {APP_NAME}.</>,
                    <>Atualize a lista de ferramentas, recarregue o servidor ou reconecte.</>,
                    <>Se o endereço mudou, cole o endereço mais recente acima.</>,
                    <>Inicie uma nova conversa ou sessão e peça ao assistente para usar o {APP_NAME}.</>,
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
