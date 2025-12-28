import { ProductRow } from '@/types/product'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, Barcode } from 'lucide-react'

interface ProductSelectorTableProps {
  products: ProductRow[]
  loading: boolean
  searchTerm: string
  onSelect: (product: ProductRow) => void
}

export function ProductSelectorTable({
  products,
  loading,
  searchTerm,
  onSelect,
}: ProductSelectorTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchTerm ? 'Nenhum produto encontrado.' : 'Digite para buscar.'}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">ID</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead>Preço</TableHead>
          <TableHead className="w-[80px]">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.ID} className="hover:bg-muted/50">
            <TableCell className="font-mono text-xs">{product.ID}</TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">{product.PRODUTO}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {product['CÓDIGO BARRAS'] && (
                    <span className="flex items-center">
                      <Barcode className="h-3 w-3 mr-1" />
                      {product['CÓDIGO BARRAS']}
                    </span>
                  )}
                  {product.TIPO && <span>({product.TIPO})</span>}
                  {product.GRUPO && (
                    <span className="bg-muted px-1 rounded text-[10px]">
                      {product.GRUPO}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {product.PREÇO ? `R$ ${product.PREÇO.replace('.', ',')}` : '-'}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onSelect(product)}
              >
                Selecionar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
