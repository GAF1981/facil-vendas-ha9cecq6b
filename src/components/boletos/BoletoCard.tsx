import { BoletoWithConferido } from '@/types/boleto'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Edit,
  Trash2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'

interface BoletoCardProps {
  boleto: BoletoWithConferido
  onEdit: (boleto: BoletoWithConferido) => void
  onDelete: (id: number) => void
}

export function BoletoCard({ boleto, onEdit, onDelete }: BoletoCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Visual left border for Conferido status */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          boleto.conferido === 'SIM' ? 'bg-green-500' : 'bg-red-500'
        }`}
      />

      <CardContent className="p-4 pt-5">
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-1 pr-8">
            <h3
              className="font-bold text-sm line-clamp-1"
              title={boleto.cliente_nome}
            >
              {boleto.cliente_nome}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-mono bg-muted px-1 rounded">
                Cod: {boleto.cliente_codigo}
              </span>
              {boleto.pedido_id && (
                <span className="font-mono text-blue-600 ml-1">
                  Ped: #{boleto.pedido_id}
                </span>
              )}
            </p>
          </div>

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(boleto)}
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDelete(boleto.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Calendar className="h-3 w-3" /> Vencimento
            </span>
            <span className="font-medium">
              {safeFormatDate(boleto.vencimento, 'dd/MM/yyyy')}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              Valor
            </span>
            <span className="font-bold text-base">
              R$ {formatCurrency(boleto.valor)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-0.5">Status</span>
            <Badge
              variant="outline"
              className="w-fit font-normal text-[10px] h-5 px-1.5"
            >
              {boleto.status}
            </Badge>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground mb-0.5">
              Boleto Conferido
            </span>
            {boleto.conferido === 'SIM' ? (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 hover:bg-green-200 border-transparent gap-1"
              >
                <CheckCircle className="h-3 w-3" /> SIM
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-800 hover:bg-red-200 border-transparent gap-1"
              >
                <XCircle className="h-3 w-3" /> NÃO
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
