import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { permissionsService, Permission } from '@/services/permissionsService'
import { Loader2, Shield, Save, CheckSquare, Square } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function PermissionsPage() {
  const [sectors, setSectors] = useState<string[]>([])
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const sectorsData = await permissionsService.getSectors()
        setSectors(sectorsData)

        if (sectorsData.length > 0) {
          // Default to 'Administrador' if present, otherwise first
          if (sectorsData.includes('Administrador')) {
            setSelectedSector('Administrador')
          } else {
            setSelectedSector(sectorsData[0])
          }
        }
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro',
          description: 'Falha ao carregar setores.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [toast])

  // Load permissions when sector changes
  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedSector) return
      setLoading(true)
      try {
        // Ensure permissions exist for this sector (init if needed)
        await permissionsService.initPermissionsForSetor(selectedSector)
        const data =
          await permissionsService.getPermissionsBySetor(selectedSector)
        setPermissions(data)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro',
          description: 'Falha ao carregar permissões do setor.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadPermissions()
  }, [selectedSector, toast])

  const handleToggle = async (permission: Permission) => {
    // Hardcoded Safety check
    if (
      permission.modulo === 'Permissões' &&
      selectedSector === 'Administrador' &&
      permission.acesso === true
    ) {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Não é possível remover o acesso ao módulo de Permissões para o Administrador.',
        variant: 'destructive',
      })
      return
    }

    // Optimistic Update
    const newAccess = !permission.acesso
    setPermissions((prev) =>
      prev.map((p) =>
        p.id === permission.id ? { ...p, acesso: newAccess } : p,
      ),
    )

    try {
      await permissionsService.updatePermission(permission.id, newAccess)
    } catch (error) {
      // Revert
      setPermissions((prev) =>
        prev.map((p) =>
          p.id === permission.id ? { ...p, acesso: !newAccess } : p,
        ),
      )
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar permissão.',
        variant: 'destructive',
      })
    }
  }

  const handleBulkAction = async (enable: boolean) => {
    if (!permissions.length) return

    setUpdating(true)
    try {
      // Filter out Permissões for Administrador if disabling
      let toUpdate = permissions
      if (!enable && selectedSector === 'Administrador') {
        toUpdate = permissions.filter((p) => p.modulo !== 'Permissões')
      }

      const ids = toUpdate.map((p) => p.id)
      await permissionsService.updatePermissionsBulk(ids, enable)

      // Refresh
      const data =
        await permissionsService.getPermissionsBySetor(selectedSector)
      setPermissions(data)

      toast({
        title: 'Atualizado',
        description: `Permissões ${enable ? 'habilitadas' : 'desabilitadas'} para todos os módulos.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha na atualização em massa.',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 text-slate-700 rounded-lg shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Permissões
          </h1>
          <p className="text-muted-foreground">
            Controle de acesso aos módulos por setor.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione o Setor</CardTitle>
          <CardDescription>
            Escolha o perfil de funcionário para configurar os acessos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedSector}
            onValueChange={setSelectedSector}
            disabled={loading || updating}
          >
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSector && (
        <Card className="animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Módulos do Sistema</CardTitle>
              <CardDescription>
                Habilite ou desabilite o acesso para:{' '}
                <strong>{selectedSector}</strong>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction(true)}
                disabled={updating || loading}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Marcar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction(false)}
                disabled={updating || loading}
              >
                <Square className="mr-2 h-4 w-4" />
                Desmarcar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{perm.modulo}</span>
                      <Badge
                        variant={perm.acesso ? 'default' : 'secondary'}
                        className={
                          perm.acesso
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 border-transparent w-fit'
                            : 'bg-red-100 text-red-800 hover:bg-red-200 border-transparent w-fit'
                        }
                      >
                        {perm.acesso ? 'Acesso Permitido' : 'Acesso Bloqueado'}
                      </Badge>
                    </div>
                    <Switch
                      checked={perm.acesso}
                      onCheckedChange={() => handleToggle(perm)}
                      disabled={
                        perm.modulo === 'Permissões' &&
                        selectedSector === 'Administrador'
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
