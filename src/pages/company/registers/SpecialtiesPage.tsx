import { Navigate } from 'react-router-dom'

export default function SpecialtiesPage() {
  // Especialidades are managed via modal from DoctorsPage
  // Redirect to doctors page
  return <Navigate to="/app/cadastros/medicos" replace />
}
