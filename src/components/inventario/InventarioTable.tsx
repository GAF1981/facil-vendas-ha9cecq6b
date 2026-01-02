import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventarioItem } from '@/types/inventario'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface InventarioTableProps {
  data: InventarioItem[]
}

export function InventarioTable({ data }: InventarioTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Cód. Barras</TableHead>
              <TableHead className="w-[80px]">Cód. Produto</TableHead>
              <TableHead className="min-w-[200px]">Mercadoria</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-center bg-blue-50/50 text-blue-700">
                Saldo Inicial
              </TableHead>
              <TableHead className="text-center bg-green-50/50 text-green-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Estoque &rarr; Carro)</span>
              </TableHead>
              <TableHead className="text-center bg-green-50/50 text-green-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Cliente &rarr; Carro)</span>
              </TableHead>
              <TableHead className="text-center bg-red-50/50 text-red-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Carro &rarr; Estoque)</span>
              </TableHead>
              <TableHead className="text-center bg-red-50/50 text-red-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Carro &rarr; Cliente)</span>
              </TableHead>
              <TableHead className="text-center font-bold bg-muted/50 min-w-[100px] border-x border-border/50">
                Saldo Final
              </TableHead>
              <TableHead className="text-center font-bold bg-yellow-50/50 text-yellow-700 min-w-[100px]">
                Contagem
              </TableHead>
              <TableHead className="text-center">Dif. (Qtd)</TableHead>
              <TableHead className="text-right">Dif. (Valor)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum item de inventário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">
                    {item.codigo_barras || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.codigo_produto}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {item.mercadoria}
                  </TableCell>
                  <TableCell className="text-xs">{item.tipo || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-xs">
                    R$ {formatCurrency(item.preco)}
                  </TableCell>
                  <TableCell className="text-center bg-blue-50/20">
                    {item.saldo_inicial}
                  </TableCell>
                  <TableCell className="text-center bg-green-50/20 text-green-700">
                    {item.entrada_estoque_carro}
                  </TableCell>
                  <TableCell className="text-center bg-green-50/20 text-green-700">
                    {item.entrada_cliente_carro}
                  </TableCell>
                  <TableCell className="text-center bg-red-50/20 text-red-700">
                    {item.saida_carro_estoque}
                  </TableCell>
                  <TableCell className="text-center bg-red-50/20 text-red-700">
                    {item.saida_carro_cliente}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-muted/20 border-x border-border/50">
                    {item.saldo_final}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-yellow-50/20 text-yellow-700">
                    {item.estoque_contagem_carro}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-center font-bold',
                      item.diferenca_quantidade !== 0
                        ? 'text-red-600'
                        : 'text-gray-400',
                    )}
                  >
                    {item.diferenca_quantidade}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold text-xs',
                      item.diferenca_valor !== 0
                        ? 'text-red-600'
                        : 'text-gray-400',
                    )}
                  >
                    R$ {formatCurrency(item.diferenca_valor)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
