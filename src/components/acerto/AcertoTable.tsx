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
import { Minus, Plus, Trash2, Loader2, Lock } from 'lucide-react'
import { AcertoItem } from '@/types/acerto'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AcertoTableProps {
  items: AcertoItem[]
  onUpdateContagem?: (uid: string, newContagem: number) => void
  onUpdateSaldoFinal?: (uid: string, newSaldo: number) => void
  onRemoveItem?: (uid: string) => void
  mode?: 'ACERTO' | 'CAPTACAO'
  acertoTipo?: string
  loading?: boolean
}

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

const NumberInputControl = ({
  value,
  onChange,
  className,
  disabled,
}: {
  value: number
  onChange: (val: number) => void
  className?: string
  disabled?: boolean
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center w-14 mx-auto',
      className,
      disabled && 'opacity-60 pointer-events-none',
    )}
  >
    <Button
      variant="outline"
      size="icon"
      className="h-6 w-full rounded-b-none border-b-0 hover:bg-muted active:bg-muted/80 z-0 focus:z-10"
      onClick={() => onChange(value + 1)}
      tabIndex={-1}
      disabled={disabled}
    >
      <Plus className="h-3 w-3" />
    </Button>
    <Input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
      className="h-9 w-full text-center px-0 py-1 rounded-none z-10 focus-visible:ring-1 focus-visible:ring-inset border-input"
      disabled={disabled}
    />
    <Button
      variant="outline"
      size="icon"
      className="h-6 w-full rounded-t-none border-t-0 hover:bg-muted active:bg-muted/80 z-0 focus:z-10"
      onClick={() => onChange(Math.max(0, value - 1))}
      tabIndex={-1}
      disabled={disabled}
    >
      <Minus className="h-3 w-3" />
    </Button>
  </div>
)

export function AcertoTable({
  items,
  onUpdateContagem,
  onUpdateSaldoFinal,
  onRemoveItem,
  acertoTipo,
  loading = false,
}: AcertoTableProps) {
  // Determine if Contagem is editable based on acertoTipo
  const isContagemDisabled =
    acertoTipo === 'CAPTAÇÃO' || acertoTipo === 'COMPLEMENTO'

  // Safety wrappers for callbacks
  const safeUpdateContagem = (uid: string, val: number) => {
    if (typeof onUpdateContagem === 'function') {
      onUpdateContagem(uid, val)
    } else {
      console.warn('onUpdateContagem callback is not defined')
    }
  }

  const safeUpdateSaldoFinal = (uid: string, val: number) => {
    if (typeof onUpdateSaldoFinal === 'function') {
      onUpdateSaldoFinal(uid, val)
    } else {
      console.warn('onUpdateSaldoFinal callback is not defined')
    }
  }

  const safeRemoveItem = (uid: string) => {
    if (typeof onRemoveItem === 'function') {
      onRemoveItem(uid)
    } else {
      console.warn('onRemoveItem callback is not defined')
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border bg-card p-12 flex justify-center items-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Carregando itens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <VerticalHeader className="w-[50px]">ID VENDA ITENS</VerticalHeader>
            <VerticalHeader className="w-[50px]">CÓDIGO</VerticalHeader>
            <VerticalHeader>TIPO</VerticalHeader>
            <VerticalHeader className="w-[300px] items-start justify-start">
              PRODUTO
            </VerticalHeader>
            <VerticalHeader>SALDO INICIAL</VerticalHeader>
            <VerticalHeader className="bg-blue-50/50 font-bold text-blue-700">
              CONTAGEM
            </VerticalHeader>
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
                colSpan={10}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum produto adicionado. Clique em "Inserir Produto" para
                começar.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const isDeleteDisabled = (item.saldoInicial || 0) > 0

              return (
                <TableRow key={item.uid} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-center text-muted-foreground">
                    {item.idVendaItens || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-center p-0 align-middle">
                    <div className="flex justify-center items-center h-full py-2">
                      <span
                        className="writing-mode-vertical-rl rotate-180 block"
                        style={{ writingMode: 'vertical-rl' }}
                      >
                        {item.produtoCodigo || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {item.tipo || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.produtoNome}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.saldoInicial}
                  </TableCell>
                  <TableCell className="p-2 bg-blue-50/30">
                    <NumberInputControl
                      value={item.contagem}
                      onChange={(val) => safeUpdateContagem(item.uid, val)}
                      disabled={isContagemDisabled}
                    />
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {item.quantVendida}
                  </TableCell>
                  <TableCell className="text-center font-mono text-green-600">
                    R$ {item.valorVendido.toFixed(2).replace('.', ',')}
                  </TableCell>
                  <TableCell className="p-2 bg-primary/5">
                    <NumberInputControl
                      value={item.saldoFinal}
                      onChange={(val) => safeUpdateSaldoFinal(item.uid, val)}
                    />
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block" tabIndex={-1}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-8 w-8',
                                isDeleteDisabled
                                  ? 'text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent'
                                  : 'text-destructive hover:text-destructive hover:bg-destructive/10',
                              )}
                              onClick={() =>
                                !isDeleteDisabled && safeRemoveItem(item.uid)
                              }
                              tabIndex={-1}
                              disabled={isDeleteDisabled}
                            >
                              {isDeleteDisabled ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isDeleteDisabled && (
                          <TooltipContent side="left">
                            <p>
                              Não é possível remover produto com saldo inicial.
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
