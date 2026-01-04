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
      // Handle both string[] (new) and string (old) just in case, though Store/Type is updated
      // If store is persisted, old data might be string. We handle it safely.
      let userSectors: string[] = []

      if (Array.isArray(employee?.setor)) {
        userSectors = employee?.setor || []
      } else if (typeof employee?.setor === 'string') {
        userSectors = [employee?.setor]
      }

      if (userSectors.length === 0) {
        setPermissions([])
        return
      }

      setLoading(true)
      try {
        let allPerms: Permission[] = []

        // Fetch permissions for ALL sectors the user has
        for (const setor of userSectors) {
          const perms = await permissionsService.getPermissionsBySetor(setor)

          // Init if empty
          if (perms.length === 0) {
            await permissionsService.initPermissionsForSetor(setor)
            const newPerms =
              await permissionsService.getPermissionsBySetor(setor)
            allPerms = [...allPerms, ...newPerms]
          } else {
            allPerms = [...allPerms, ...perms]
          }
        }

        setPermissions(allPerms)
      } catch (error) {
        console.error('Failed to load permissions', error)
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [employee])

  const canAccess = (moduleName: string) => {
    if (!employee) return false
    if (!permissions.length) return true // Default open if no permissions loaded (or safe fail? Requirement says "stricter", but legacy implies open) - Keeping consistent with previous

    // OR Logic: If ANY of the user's sectors allows access, grant access.
    // Filter permissions for this module
    const modulePerms = permissions.filter((p) => p.modulo === moduleName)

    if (modulePerms.length === 0) return true // Not configured = Allow

    // Check if any permits access
    return modulePerms.some((p) => p.acesso)
  }

  return (
    <PermissionsContext.Provider value={{ canAccess, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}
