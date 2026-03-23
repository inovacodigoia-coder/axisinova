import { useAuth } from '@/context/AuthContext'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <ForgotPasswordForm onSubmit={forgotPassword} />
      </div>
    </div>
  )
}
