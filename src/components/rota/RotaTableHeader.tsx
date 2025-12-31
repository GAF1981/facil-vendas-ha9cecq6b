import { TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortConfig } from '@/types/rota'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RotaTableHeaderProps {
  sortConfig: SortConfig
  onSort: (key: string) => void
}

export function RotaTableHeader({ sortConfig, onSort }: RotaTableHeaderProps) {
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return (
        <ArrowUpDown className="ml-1 h-2.5 w-2.5 text-muted-foreground/30" />
      )
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-2.5 w-2.5 text-foreground" />
    ) : (
      <ArrowDown className="ml-1 h-2.5 w-2.5 text-foreground" />
    )
  }

  const renderHead = (label: string, key: string, className?: string) => (
    <TableHead
      className={cn(
        'bg-muted/80 cursor-pointer hover:bg-muted transition-colors select-none group h-8 px-2 text-[10px] uppercase font-bold text-muted-foreground tracking-tight border-b border-r last:border-r-0',
        className,
      )}
      onClick={() => onSort(key)}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">{label}</span>
        {renderSortIcon(key)}
      </div>
    </TableHead>
  )

  return (
    <TableHeader className="sticky top-0 z-20 shadow-sm bg-muted/80 backdrop-blur-sm">
      <TableRow className="hover:bg-transparent">
        {renderHead('#', 'rowNumber', 'w-[40px] text-center')}
        {renderHead(
          'PROJEÇÃO',
          'projecao',
          'w-[90px] text-right text-blue-700 bg-blue-50/50',
        )}
        {renderHead(
          'N. Pedido',
          'numero_pedido',
          'w-[80px] text-center bg-blue-50/50',
        )}
        {renderHead('xRota', 'x_na_rota', 'w-[60px] text-center')}
        {renderHead('N. Fiscal', 'nota_fiscal', 'w-[90px]')}
        {renderHead('Bol.', 'boleto', 'w-[50px] text-center')}
        {renderHead('Agreg.', 'agregado', 'w-[50px] text-center')}
        {renderHead('Vendedor', 'vendedor', 'w-[120px]')}
        {renderHead('Débito', 'debito', 'w-[90px] text-right')}
        {renderHead('Qtd.D.', 'quant_debito', 'w-[60px] text-center')}
        {renderHead('Dt. Acerto', 'data_acerto', 'w-[90px]')}
        {renderHead('CÓD.', 'codigo', 'w-[70px]')}
        {renderHead('NOME CLIENTE', 'nome', 'min-w-[180px]')}
        {renderHead('Rota', 'rota', 'w-[100px]')}
        {renderHead('Estoque', 'estoque', 'w-[70px] text-right')}
        {renderHead('ENDEREÇO', 'endereco', 'min-w-[180px]')}
        {renderHead('BAIRRO', 'bairro', 'min-w-[120px]')}
        {renderHead('MUNICÍPIO', 'municipio', 'min-w-[120px]')}
        {renderHead('CONTATO 1', 'contato1', 'w-[100px]')}
        {renderHead('CONTATO 2', 'contato2', 'w-[100px]')}
        {renderHead('CEP', 'cep', 'w-[80px]')}
        {renderHead('TIPO', 'tipo', 'w-[100px]')}
        {renderHead('FONE 1', 'fone1', 'w-[120px]')}
        {renderHead('FONE 2', 'fone2', 'w-[120px]')}
      </TableRow>
    </TableHeader>
  )
}
