import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { permissionsService, Permission } from '@/services/permissionsService'
import { Loader2, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const data = await permissionsService.getAll()
      setPermissions(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const handleToggle = async (id: number, current: boolean) => {
    // Optimistic update
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, acesso: !current } : p)),
    )

    try {
      await permissionsService.updatePermission(id, !current)
    } catch (error) {
      // Revert on error
      setPermissions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, acesso: current } : p)),
      )
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar a permissão.',
        variant: 'destructive',
      })
    }
  }

  // Group by Setor
  const grouped = permissions.reduce(
    (acc, curr) => {
      if (!acc[curr.setor]) acc[curr.setor] = []
      acc[curr.setor].push(curr)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const orderedSetores = Object.keys(grouped).sort()

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 text-slate-700 rounded-lg shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
          <p className="text-muted-foreground">
            Gerencie o acesso aos módulos por setor.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orderedSetores.map((setor) => (
            <Card key={setor}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{setor}</CardTitle>
                <CardDescription>Acessos do perfil {setor}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-right">Acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[setor].map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="py-2">{perm.modulo}</TableCell>
                        <TableCell className="text-right py-2">
                          <Switch
                            checked={perm.acesso}
                            onCheckedChange={() =>
                              handleToggle(perm.id, perm.acesso)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
