import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'
import { Loader2 } from 'lucide-react'

interface PermissionGuardProps {
  module: string
  children?: React.ReactNode
}

export function PermissionGuard({ module, children }: PermissionGuardProps) {
  const { canAccess, loading: permissionsLoading } = usePermissions()
  const { employee } = useUserStore()

  if (permissionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If no employee, ProtectedRoute should handle it, but double check
  if (!employee) {
    return <Navigate to="/login" replace />
  }

  // Special case: Only Administrador has access to Permissões
  if (module === 'Permissões') {
    if (employee.setor !== 'Administrador') {
      return <Navigate to="/" replace />
    }
    return children ? <>{children}</> : <Outlet />
  }

  if (!canAccess(module)) {
    // Redirect to dashboard if access denied
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
