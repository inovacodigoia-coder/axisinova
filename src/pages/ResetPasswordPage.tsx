import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { toast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleReset = async (password: string) => {
    await resetPassword('mock_token', password)
    toast({ title: 'Senha alterada com sucesso!', description: 'Faça login com sua nova senha.' })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <ResetPasswordForm onSubmit={handleReset} />
      </div>
    </div>
  )
}
