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
import { Minus, Plus, Trash2 } from 'lucide-react'
import { AcertoItem } from '@/types/acerto'
import { cn } from '@/lib/utils'

interface AcertoTableProps {
  items: AcertoItem[]
  onUpdateSaldoFinal: (uid: string, newSaldo: number) => void
  onRemoveItem: (uid: string) => void
}

export function AcertoTable({
  items,
  onUpdateSaldoFinal,
  onRemoveItem,
}: AcertoTableProps) {
  // Helper for vertical headers styling
  const VerticalHeader = ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <TableHead
      className={cn(
        'h-32 align-bottom pb-4 text-center whitespace-nowrap',
        className,
      )}
    >
      <div
        className="writing-mode-vertical-rl rotate-180 flex items-center justify-center w-full mx-auto"
        style={{ writingMode: 'vertical-rl' }}
      >
        {children}
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <VerticalHeader className="w-[50px]">CÓDIGO</VerticalHeader>
            <VerticalHeader className="w-[300px] items-start justify-start">
              PRODUTO
            </VerticalHeader>
            <VerticalHeader>TIPO</VerticalHeader>
            <VerticalHeader>SALDO INICIAL</VerticalHeader>
            <VerticalHeader>QUANT. VENDIDA</VerticalHeader>
            <VerticalHeader>VALOR VENDIDO</VerticalHeader>
            <VerticalHeader className="bg-primary/5 font-bold text-primary">
              SALDO FINAL
            </VerticalHeader>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum produto adicionado. Clique em "Inserir Produto" para
                começar.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.uid} className="hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-center">
                  {item.produtoId}
                </TableCell>
                <TableCell className="font-medium">
                  {item.produtoNome}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {item.tipo || '-'}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {item.saldoInicial}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {item.quantVendida}
                </TableCell>
                <TableCell className="text-center font-mono text-green-600">
                  R$ {item.valorVendido.toFixed(2).replace('.', ',')}
                </TableCell>
                <TableCell className="p-2 bg-primary/5">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateSaldoFinal(
                          item.uid,
                          Math.max(0, item.saldoFinal - 1),
                        )
                      }
                      tabIndex={-1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      value={item.saldoFinal}
                      onChange={(e) =>
                        onUpdateSaldoFinal(
                          item.uid,
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                      className="h-8 w-16 text-center p-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        onUpdateSaldoFinal(item.uid, item.saldoFinal + 1)
                      }
                      tabIndex={-1}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveItem(item.uid)}
                    tabIndex={-1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
