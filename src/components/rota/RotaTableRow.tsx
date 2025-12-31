import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { AlertCircle, Phone, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { memo } from 'react'

interface RotaTableRowProps {
  row: RotaRow
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
}

const getRowColorClass = (row: RotaRow) => {
  if (row.debito > 10) return 'bg-red-50 hover:bg-red-100'
  if (row.x_na_rota > 3) return 'bg-purple-50 hover:bg-purple-100'
  if (row.has_pendency) return 'bg-orange-50 hover:bg-orange-100'
  if (row.client['OBSERVAÇÃO FIXA']) return 'bg-yellow-50 hover:bg-yellow-100'
  if (row.is_completed) return 'bg-green-50 hover:bg-green-100'
  return 'hover:bg-muted/50'
}

export const RotaTableRow = memo(function RotaTableRow({
  row,
  sellers,
  onUpdateRow,
  disabled,
}: RotaTableRowProps) {
  return (
    <TableRow
      key={row.client.CODIGO}
      className={cn(
        'transition-colors data-[state=selected]:bg-muted border-b border-gray-100',
        getRowColorClass(row),
      )}
    >
      <TableCell className="text-center font-bold text-[10px] py-0.5 px-1 border-r">
        {row.rowNumber}
      </TableCell>

      {/* Projection Column - Highlighted */}
      <TableCell className="text-right font-mono font-bold text-blue-700 text-[11px] py-0.5 px-2 bg-blue-50/30 border-r">
        {row.projecao > 0 ? `R$ ${formatCurrency(row.projecao)}` : '-'}
      </TableCell>

      <TableCell className="py-0.5 px-1 border-r">
        <Select
          value={row.vendedor_id?.toString() || 'none'}
          disabled={disabled}
          onValueChange={(v) =>
            onUpdateRow(
              row.client.CODIGO,
              'vendedor_id',
              v === 'none' ? null : parseInt(v),
            )
          }
        >
          <SelectTrigger className="h-6 text-[10px] px-1 border-transparent hover:border-input bg-transparent">
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            {sellers.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.nome_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="text-right font-mono font-medium text-red-600 text-[10px] py-0.5 px-2 border-r">
        {row.debito > 0 ? `R$ ${formatCurrency(row.debito)}` : '-'}
      </TableCell>

      <TableCell className="text-center text-[10px] py-0.5 px-1 border-r">
        {row.quant_debito || '-'}
      </TableCell>

      <TableCell className="text-[10px] py-0.5 px-2 border-r whitespace-nowrap">
        {row.data_acerto ? format(parseISO(row.data_acerto), 'dd/MM/yy') : '-'}
      </TableCell>

      <TableCell className="font-mono text-[10px] py-0.5 px-2 border-r">
        {row.client.CODIGO}
      </TableCell>

      <TableCell className="font-medium relative group/name text-[10px] py-0.5 px-2 border-r">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate max-w-[180px]"
            title={row.client['NOME CLIENTE'] || ''}
          >
            {row.client['NOME CLIENTE']}
          </span>
          {row.has_pendency && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-orange-600 hover:text-orange-700"
              asChild
              title="Ver Pendências"
            >
              <Link to={`/pendencias?search=${row.client.CODIGO}`}>
                <AlertCircle className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </TableCell>

      {/* Stock Column - Now showing Monetary Value */}
      <TableCell className="text-right font-mono text-[10px] py-0.5 px-2 border-r">
        {row.estoque > 0 ? `R$ ${formatCurrency(row.estoque)}` : '-'}
      </TableCell>

      <TableCell
        className="text-[10px] truncate max-w-[180px] py-0.5 px-2 border-r"
        title={row.client.ENDEREÇO || ''}
      >
        {row.client.ENDEREÇO || '-'}
      </TableCell>
      <TableCell className="text-[10px] truncate max-w-[120px] py-0.5 px-2 border-r">
        {row.client.BAIRRO || '-'}
      </TableCell>
      <TableCell className="text-[10px] truncate max-w-[120px] py-0.5 px-2 border-r">
        {row.client.MUNICÍPIO || '-'}
      </TableCell>
      <TableCell className="text-[10px] truncate max-w-[100px] py-0.5 px-2 border-r">
        {row.client['CONTATO 1'] || '-'}
      </TableCell>
      <TableCell className="text-[10px] truncate max-w-[100px] py-0.5 px-2 border-r">
        {row.client['CONTATO 2'] || '-'}
      </TableCell>
      <TableCell className="text-[10px] py-0.5 px-2 border-r">
        {row.client['CEP OFICIO'] || '-'}
      </TableCell>
      <TableCell className="text-[10px] py-0.5 px-2 border-r truncate">
        {row.client['TIPO DE CLIENTE'] || '-'}
      </TableCell>

      <TableCell className="py-0.5 px-2 border-r">
        {row.client['FONE 1'] && (
          <a
            href={`https://wa.me/55${row.client['FONE 1'].replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-green-600 hover:underline text-[10px]"
          >
            <Phone className="h-2.5 w-2.5" />
            <span className="truncate max-w-[100px]">
              {row.client['FONE 1']}
            </span>
            <ArrowUpRight className="h-2.5 w-2.5 opacity-50" />
          </a>
        )}
      </TableCell>

      <TableCell className="py-0.5 px-2 border-r">
        {row.client['FONE 2'] && (
          <a
            href={`https://wa.me/55${row.client['FONE 2'].replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-green-600 hover:underline text-[10px]"
          >
            <Phone className="h-2.5 w-2.5" />
            <span className="truncate max-w-[100px]">
              {row.client['FONE 2']}
            </span>
            <ArrowUpRight className="h-2.5 w-2.5 opacity-50" />
          </a>
        )}
      </TableCell>

      {/* Moved Columns */}
      <TableCell className="text-center font-mono text-[10px] py-0.5 px-2 bg-blue-50/30 border-r text-muted-foreground">
        {row.numero_pedido ? `#${row.numero_pedido}` : '-'}
      </TableCell>

      <TableCell className="py-0.5 px-1 border-r">
        <Input
          type="number"
          className="h-6 w-full text-center text-[10px] px-0 bg-transparent border-transparent hover:border-input focus:border-input"
          value={row.x_na_rota}
          disabled={disabled}
          onChange={(e) =>
            onUpdateRow(
              row.client.CODIGO,
              'x_na_rota',
              parseInt(e.target.value) || 0,
            )
          }
        />
      </TableCell>

      <TableCell className="text-[10px] py-0.5 px-2 border-r truncate max-w-[90px]">
        {row.client['NOTA FISCAL'] || '-'}
      </TableCell>

      <TableCell className="text-center py-0.5 px-1 border-r">
        <Checkbox
          className="h-3.5 w-3.5"
          checked={row.boleto}
          disabled={disabled}
          onCheckedChange={(c) =>
            onUpdateRow(row.client.CODIGO, 'boleto', c as boolean)
          }
        />
      </TableCell>

      <TableCell className="text-center py-0.5 px-1 border-r">
        <Checkbox
          className="h-3.5 w-3.5"
          checked={row.agregado}
          disabled={disabled}
          onCheckedChange={(c) =>
            onUpdateRow(row.client.CODIGO, 'agregado', c as boolean)
          }
        />
      </TableCell>

      <TableCell className="text-[10px] py-0.5 px-2 border-r truncate">
        {row.client['GRUPO ROTA'] || '-'}
      </TableCell>
    </TableRow>
  )
})
