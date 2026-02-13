import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
} from 'lucide-react'
import { Kit } from '@/types/kit'
import { kitsService } from '@/services/kitsService'
import { KitFormDialog } from './KitFormDialog'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'

export function KitList() {
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingKit, setEditingKit] = useState<Kit | null>(null)
  const [kitToDelete, setKitToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  const fetchKits = async () => {
    setLoading(true)
    try {
      const data = await kitsService.getKits()
      setKits(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os kits.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKits()
  }, [])

  const handleEdit = (kit: Kit) => {
    setEditingKit(kit)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!kitToDelete) return
    try {
      await kitsService.deleteKit(kitToDelete)
      toast({ title: 'Kit excluído com sucesso.' })
      fetchKits()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir kit.',
        variant: 'destructive',
      })
    } finally {
      setKitToDelete(null)
    }
  }

  const handleCreate = () => {
    setEditingKit(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Kits Cadastrados</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie composições de produtos para inserção rápida.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Kit
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : kits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-md bg-muted/10 border-dashed">
          <Package className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum kit cadastrado.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Kit</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kits.map((kit) => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {kit.nome}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {kit.items?.slice(0, 3).map((item) => (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="font-normal"
                        >
                          {item.quantidade_padrao}x {item.product?.PRODUTO}
                        </Badge>
                      ))}
                      {(kit.items?.length || 0) > 3 && (
                        <Badge variant="outline">
                          +{kit.items!.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(kit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKitToDelete(kit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <KitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        kitToEdit={editingKit}
        onSuccess={fetchKits}
      />

      <AlertDialog
        open={!!kitToDelete}
        onOpenChange={(open) => !open && setKitToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O kit será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
