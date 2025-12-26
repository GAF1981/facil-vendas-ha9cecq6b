import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScanBarcode, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Product, formatPrice } from '@/types/product'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
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
import { productsService } from '@/services/productsService'
import { useToast } from '@/hooks/use-toast'

interface ProductCardItemProps {
  product: Product
  onUpdate?: () => void
}

export function ProductCardItem({ product, onUpdate }: ProductCardItemProps) {
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
        onUpdate?.()
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
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="flex gap-2 items-center">
              <Badge variant="outline">#{product.CODIGO}</Badge>
              <span className="font-bold text-green-700">
                {formatPrice(product.PREÇO)}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 -mr-2">
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
          </div>
          <CardTitle className="text-base line-clamp-2 mt-1">
            {product.PRODUTOS}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 text-sm text-muted-foreground space-y-2">
          {product['CÓDIGO BARRAS'] && (
            <div className="flex items-center gap-1">
              <ScanBarcode className="h-3 w-3" />
              <span>{product['CÓDIGO BARRAS']}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {product.GRUPO && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground/80">Grupo:</span>
                <span>{product.GRUPO}</span>
              </div>
            )}
            {product.TIPO && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground/80">Tipo:</span>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {product.TIPO}
                </Badge>
              </div>
            )}
          </div>
          {product['DESCRIÇÃO RESUMIDA'] && (
            <div className="bg-muted p-2 rounded text-xs mt-2">
              {product['DESCRIÇÃO RESUMIDA']}
            </div>
          )}
        </CardContent>
      </Card>

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
