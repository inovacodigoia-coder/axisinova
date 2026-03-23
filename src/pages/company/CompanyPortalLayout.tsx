import { Outlet } from 'react-router-dom'

export default function CompanyPortalLayout() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="text-2xl">🏥</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Portal da Empresa</h1>
        <p className="text-muted-foreground max-w-sm">O portal completo da empresa será construído nos próximos passos. Aguarde!</p>
        <Outlet />
      </div>
    </div>
  )
}
