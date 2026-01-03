import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { permissionsService, Permission } from '@/services/permissionsService'

interface PermissionsContextType {
  canAccess: (moduleName: string) => boolean
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined,
)

export const usePermissions = () => {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { employee } = useUserStore()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadPermissions = async () => {
      if (!employee?.setor) {
        setPermissions([])
        return
      }

      setLoading(true)
      try {
        const perms = await permissionsService.getPermissionsBySetor(
          employee.setor,
        )
        // If empty, try to init default
        if (perms.length === 0) {
          await permissionsService.initPermissionsForSetor(employee.setor)
          const newPerms = await permissionsService.getPermissionsBySetor(
            employee.setor,
          )
          setPermissions(newPerms)
        } else {
          setPermissions(perms)
        }
      } catch (error) {
        console.error('Failed to load permissions', error)
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [employee])

  const canAccess = (moduleName: string) => {
    // If no employee or no permissions loaded yet, default to false or safe logic
    // Admin bypass if needed, but per requirements we check setor
    if (!employee) return false
    // If permission record not found, default to TRUE or FALSE? Safe is False, but for UX maybe True if not configured?
    // User story implies explicit configuration. Let's assume default true if not found to avoid lockout on new modules.
    const perm = permissions.find((p) => p.modulo === moduleName)
    return perm ? perm.acesso : true
  }

  return (
    <PermissionsContext.Provider value={{ canAccess, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}
