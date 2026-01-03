import { useState, useEffect, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { AlertCircle, FileText, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'

interface RotaTableProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
}

const getRowColorClass = (row: RotaRow) => {
  if (row.debito > 10) return 'bg-red-50/50 hover:bg-red-50'
  if (row.x_na_rota > 3) return 'bg-purple-50/50 hover:bg-purple-50'
  if (row.has_pendency) return 'bg-orange-50/50 hover:bg-orange-50'
  if (row.client['OBSERVAÇÃO FIXA']) return 'bg-yellow-50/50 hover:bg-yellow-50'
  if (row.is_completed) return 'bg-green-50/50 hover:bg-green-50'
  return ''
}

export function RotaTable({
  rows,
  sellers,
  onUpdateRow,
  disabled,
}: RotaTableProps) {
  const [visibleCount, setVisibleCount] = useState(50)
  const loadMoreRef = useRef<HTMLTableRowElement>(null)

  // Reset visible count when rows change (e.g. filters applied)
  useEffect(() => {
    setVisibleCount(50)
  }, [rows])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, rows.length))
        }
      },
      { threshold: 0.1, rootMargin: '400px' },
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [rows.length])

  const visibleRows = rows.slice(0, visibleCount)

  return (
    <div className="relative w-full h-full overflow-auto bg-background">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
          <TableRow>
            <TableHead className="w-[80px]">Código</TableHead>
            <TableHead className="min-w-[200px]">Cliente</TableHead>
            <TableHead className="w-[100px] text-right">Projeção</TableHead>
            <TableHead className="w-[100px] text-right">Estoque</TableHead>
            <TableHead className="w-[80px] text-center">x Rota</TableHead>
            <TableHead className="w-[160px]">Vendedor</TableHead>
            <TableHead className="w-[80px] text-center">Boleto</TableHead>
            <TableHead className="w-[80px] text-center">Agreg.</TableHead>
            <TableHead className="w-[100px] text-right">Débito</TableHead>
            <TableHead className="w-[100px] text-center">Data Acerto</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center">
                Nenhum cliente encontrado.
              </TableCell>
            </TableRow>
          ) : (
            visibleRows.map((row) => (
              <TableRow
                key={row.client.CODIGO}
                className={cn('group', getRowColorClass(row))}
              >
                <TableCell className="font-mono text-xs font-medium">
                  {row.client.CODIGO}
                  {row.is_completed && (
                    <Badge className="ml-2 bg-green-600 h-4 px-1 py-0 text-[10px]">
                      OK
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span
                      className="font-medium text-xs truncate max-w-[250px] block"
                      title={row.client['NOME CLIENTE'] || ''}
                    >
                      {row.client['NOME CLIENTE']}
                    </span>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      {row.client.MUNICÍPIO && (
                        <span>{row.client.MUNICÍPIO}</span>
                      )}
                      {row.client['GRUPO ROTA'] && (
                        <span>| Rota: {row.client['GRUPO ROTA']}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs font-medium text-blue-700">
                  {formatCurrency(row.projecao)}
                </TableCell>
                <TableCell className="text-right text-xs font-mono">
                  {formatCurrency(row.estoque)}
                </TableCell>
                <TableCell className="p-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-16 mx-auto text-center text-xs px-1"
                    value={row.x_na_rota || 0}
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
                <TableCell className="p-2">
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
                    <SelectTrigger className="h-7 text-xs w-full">
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
                <TableCell className="text-center p-2">
                  <div className="flex justify-center" title="Boleto">
                    <Checkbox
                      id={`boleto-${row.client.CODIGO}`}
                      checked={row.boleto}
                      disabled={disabled}
                      onCheckedChange={(c) =>
                        onUpdateRow(row.client.CODIGO, 'boleto', c as boolean)
                      }
                      className="h-4 w-4"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center p-2">
                  <div className="flex justify-center" title="Agregado">
                    <Checkbox
                      id={`agregado-${row.client.CODIGO}`}
                      checked={row.agregado}
                      disabled={disabled}
                      onCheckedChange={(c) =>
                        onUpdateRow(row.client.CODIGO, 'agregado', c as boolean)
                      }
                      className="h-4 w-4"
                    />
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right text-xs font-mono',
                    row.debito > 0
                      ? 'text-red-600 font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {row.debito > 0 ? formatCurrency(row.debito) : '-'}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {row.data_acerto
                    ? format(parseISO(row.data_acerto), 'dd/MM/yy')
                    : '-'}
                </TableCell>
                <TableCell className="text-center p-2">
                  {row.has_pendency && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-orange-600 hover:text-orange-700"
                      asChild
                      title="Ver Pendências"
                    >
                      <Link to={`/pendencias?search=${row.client.CODIGO}`}>
                        <AlertCircle className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
          {/* Sentinel row for loading more */}
          {visibleCount < rows.length && (
            <TableRow ref={loadMoreRef}>
              <TableCell
                colSpan={11}
                className="h-12 text-center text-muted-foreground text-xs"
              >
                Carregando mais clientes...
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
