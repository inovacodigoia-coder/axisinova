import { useMemo } from 'react'

// Check for links across mock data — only for demo company
export function useEntityLinks(entityType: 'doctor' | 'convenio' | 'exam' | 'procedure', entityId: string, isDemo: boolean) {
  return useMemo(() => {
    if (!isDemo) {
      return { hasLinks: false, links: { appointments: 0, medicalRecords: 0, guides: 0, futureAppointments: 0 }, canDelete: true }
    }

    // For demo data, simulate some links
    const links = { appointments: 0, medicalRecords: 0, guides: 0, futureAppointments: 0 }

    if (entityType === 'doctor') {
      // Simulate that demo doctors have records
      links.appointments = Math.floor(Math.random() * 30) + 5
      links.medicalRecords = Math.floor(Math.random() * 20) + 3
      links.guides = Math.floor(Math.random() * 15) + 1
      links.futureAppointments = Math.floor(Math.random() * 5)
    }

    if (entityType === 'convenio') {
      links.appointments = Math.floor(Math.random() * 50) + 10
      links.guides = Math.floor(Math.random() * 30) + 5
    }

    const hasLinks = Object.values(links).some(v => v > 0)
    return { hasLinks, links, canDelete: !hasLinks }
  }, [entityType, entityId, isDemo])
}
