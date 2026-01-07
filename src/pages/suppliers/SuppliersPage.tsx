import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  MessageCircle,
} from 'lucide-react'
import { suppliersService } from '@/services/suppliersService'
import { Supplier } from '@/types/supplier'
import { useToast } from '@/hooks/use-toast'
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog'
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<
    Supplier | undefined
  >(undefined)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { toast } = useToast()

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const data = await suppliersService.getAll()
      setSuppliers(data)
      setFilteredSuppliers(data)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar fornecedores.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    const lower = search.toLowerCase()
    setFilteredSuppliers(
      suppliers.filter((s) => s.nome_fornecedor.toLowerCase().includes(lower)),
    )
  }, [search, suppliers])

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await suppliersService.delete(deleteId)
      toast({ title: 'Sucesso', description: 'Fornecedor excluído.' })
      fetchSuppliers()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir fornecedor.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSupplier(undefined)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.nome_fornecedor}
                    </TableCell>
                    <TableCell>{s.cnpj || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{s.telefone || '-'}</span>
                        {s.telefone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleWhatsApp(s.telefone)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(s)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        supplier={selectedSupplier}
        onSuccess={fetchSuppliers}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor?
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
