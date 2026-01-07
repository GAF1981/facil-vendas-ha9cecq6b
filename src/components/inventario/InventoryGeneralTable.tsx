import { InventoryGeneralItem } from '@/types/inventory_general'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'

interface Props {
  items: InventoryGeneralItem[]
}

export function InventoryGeneralTable({ items }: Props) {
  return (
    <div className="rounded-md border bg-card overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[200px]">Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo Inicial</TableHead>
            <TableHead className="text-right text-green-600">
              Entradas (Compras)
            </TableHead>
            <TableHead className="text-right text-green-600">
              Entradas (Carro)
            </TableHead>
            <TableHead className="text-right text-red-600">
              Saídas (Perdas)
            </TableHead>
            <TableHead className="text-right text-red-600">
              Saídas (Carro)
            </TableHead>
            <TableHead className="text-right font-bold">
              Saldo Final (Teórico)
            </TableHead>
            <TableHead className="text-right bg-blue-50">Contagem</TableHead>
            <TableHead className="text-right">Dif (Qtd)</TableHead>
            <TableHead className="text-right">Dif (Val)</TableHead>
            <TableHead className="text-right bg-yellow-50">Ajustes</TableHead>
            <TableHead className="text-right font-bold bg-gray-50">
              Novo Saldo Final
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.produto_id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.produto}</span>
                  <span className="text-xs text-muted-foreground">
                    Code: {item.codigo}
                  </span>
                </div>
              </TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell className="text-right font-mono">
                {item.saldo_inicial}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {item.compras}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {item.carro_para_estoque}
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                {item.saidas_perdas}
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                {item.estoque_para_carro}
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {item.saldo_final}
              </TableCell>
              <TableCell className="text-right font-mono bg-blue-50/50">
                {item.contagem}
              </TableCell>
              <TableCell
                className={`text-right font-mono ${item.diferenca_qty < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {item.diferenca_qty}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(item.diferenca_val)}
              </TableCell>
              <TableCell className="text-right font-mono bg-yellow-50/50">
                {item.ajustes}
              </TableCell>
              <TableCell className="text-right font-mono font-bold bg-gray-50/50">
                {item.novo_saldo_final}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
