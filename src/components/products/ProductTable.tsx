import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
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
import { useState } from 'react'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'

interface ProductTableProps {
  products: ProductRow[]
  onUpdate: () => void
}

export function ProductTable({ products, onUpdate }: ProductTableProps) {
  const { toast } = useToast()
  const [productToDelete, setProductToDelete] = useState<number | null>(null)

  const handleDelete = async () => {
    if (productToDelete) {
      try {
        await productsService.delete(productToDelete)
        toast({
          title: 'Produto excluído',
          description: 'O produto foi removido com sucesso.',
        })
        onUpdate()
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o produto.',
          variant: 'destructive',
        })
      } finally {
        setProductToDelete(null)
      }
    }
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">Grupo</TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                Preço
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.CODIGO}
                className="group hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">{product.CODIGO}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{product.PRODUTOS}</span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {product['CÓDIGO BARRAS']}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {product.GRUPO || '-'}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right">
                  {product.PREÇO ? `R$ ${product.PREÇO}` : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={`/produtos/${product.CODIGO}`}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setProductToDelete(product.CODIGO)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
