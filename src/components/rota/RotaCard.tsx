import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  AlertCircle,
  MapPin,
  Phone,
  User,
  CheckSquare,
  FileText,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { memo } from 'react'

interface RotaCardProps {
  row: RotaRow
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
}

const getCardColorClass = (row: RotaRow) => {
  if (row.debito > 10) return 'border-red-300 bg-red-50/50'
  if (row.x_na_rota > 3) return 'border-purple-300 bg-purple-50/50'
  if (row.has_pendency) return 'border-orange-300 bg-orange-50/50'
  if (row.client['OBSERVAÇÃO FIXA']) return 'border-yellow-300 bg-yellow-50/50'
  if (row.is_completed) return 'border-green-300 bg-green-50/50'
  return 'hover:bg-muted/30 border-muted'
}

export const RotaCard = memo(function RotaCard({
  row,
  sellers,
  onUpdateRow,
  disabled,
}: RotaCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col h-full shadow-sm transition-all duration-200',
        getCardColorClass(row),
      )}
    >
      <CardHeader className="p-3 pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-xs bg-background/50"
              >
                #{row.client.CODIGO}
              </Badge>
              {row.is_completed && (
                <Badge className="bg-green-600 text-xs px-1.5 py-0 h-5">
                  Realizado
                </Badge>
              )}
            </div>
            <h3
              className="font-bold text-sm leading-tight truncate"
              title={row.client['NOME CLIENTE'] || ''}
            >
              {row.client['NOME CLIENTE']}
            </h3>
          </div>
          {row.has_pendency && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-600 hover:text-orange-700 shrink-0"
              asChild
              title="Ver Pendências"
            >
              <Link to={`/pendencias?search=${row.client.CODIGO}`}>
                <AlertCircle className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {row.client['TIPO DE CLIENTE'] && (
            <span className="bg-background/50 px-1.5 py-0.5 rounded border">
              {row.client['TIPO DE CLIENTE']}
            </span>
          )}
          {row.client['GRUPO ROTA'] && (
            <span className="bg-background/50 px-1.5 py-0.5 rounded border">
              Rota: {row.client['GRUPO ROTA']}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 py-2 flex-1 space-y-3">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50/80 p-2 rounded border border-blue-100 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-blue-800/70 mb-0.5">
              Projeção
            </span>
            <span className="font-bold text-blue-700 text-sm">
              R$ {formatCurrency(row.projecao)}
            </span>
          </div>

          <div className="bg-background/50 p-2 rounded border flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">
              Estoque
            </span>
            <span className="font-mono font-medium">
              R$ {formatCurrency(row.estoque)}
            </span>
          </div>

          <div className="bg-background/50 p-2 rounded border flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">
              Débito
            </span>
            <span
              className={cn(
                'font-mono font-medium',
                row.debito > 0 ? 'text-red-600' : '',
              )}
            >
              {row.debito > 0 ? `R$ ${formatCurrency(row.debito)}` : '-'}
            </span>
          </div>

          <div className="bg-background/50 p-2 rounded border flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">
              Últ. Acerto
            </span>
            <span className="font-medium">
              {row.data_acerto
                ? format(parseISO(row.data_acerto), 'dd/MM/yy')
                : '-'}
            </span>
          </div>
        </div>

        {/* Input Controls */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold w-16 shrink-0">
              x na Rota:
            </span>
            <div className="relative flex-1">
              <Input
                type="number"
                min={0}
                className="h-8 text-xs pr-2"
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
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold w-16 shrink-0">
              Vendedor:
            </span>
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
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Selecione" />
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
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 flex flex-col gap-2 bg-transparent">
        <div className="flex items-center justify-between w-full border-t pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" title="Boleto">
              <Checkbox
                id={`boleto-${row.client.CODIGO}`}
                className="h-3.5 w-3.5"
                checked={row.boleto}
                disabled={disabled}
                onCheckedChange={(c) =>
                  onUpdateRow(row.client.CODIGO, 'boleto', c as boolean)
                }
              />
              <label
                htmlFor={`boleto-${row.client.CODIGO}`}
                className="text-[10px] font-medium cursor-pointer flex items-center gap-1"
              >
                <FileText className="h-3 w-3 text-muted-foreground" /> Boleto
              </label>
            </div>
            <div className="flex items-center gap-1.5" title="Agregado">
              <Checkbox
                id={`agregado-${row.client.CODIGO}`}
                className="h-3.5 w-3.5"
                checked={row.agregado}
                disabled={disabled}
                onCheckedChange={(c) =>
                  onUpdateRow(row.client.CODIGO, 'agregado', c as boolean)
                }
              />
              <label
                htmlFor={`agregado-${row.client.CODIGO}`}
                className="text-[10px] font-medium cursor-pointer flex items-center gap-1"
              >
                <User className="h-3 w-3 text-muted-foreground" /> Agreg.
              </label>
            </div>
          </div>

          {row.numero_pedido && (
            <span className="text-[10px] font-mono text-muted-foreground">
              Pedido #{row.numero_pedido}
            </span>
          )}
        </div>

        {(row.client.MUNICÍPIO || row.client.BAIRRO) && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground w-full truncate border-t pt-1.5 mt-1 border-dashed">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {row.client.BAIRRO ? `${row.client.BAIRRO}, ` : ''}
              {row.client.MUNICÍPIO}
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
})
