import { useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { ROUTE_LABELS } from '@/utils/constants'

export function BreadcrumbNav() {
  const location = useLocation()

  const crumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    const result: { label: string; path: string; isLast: boolean }[] = []

    let currentPath = ''
    for (let i = 0; i < parts.length; i++) {
      currentPath += `/${parts[i]}`
      const label = ROUTE_LABELS[currentPath]
      if (label) {
        result.push({ label, path: currentPath, isLast: i === parts.length - 1 })
      }
    }
    return result
  }, [location.pathname])

  if (crumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link to="/app/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
