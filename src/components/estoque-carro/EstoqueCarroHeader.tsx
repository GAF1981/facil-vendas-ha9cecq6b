import { EstoqueCarroSession } from '@/types/estoque_carro'
import { Card, CardContent } from '@/components/ui/card'
import { safeFormatDate } from '@/lib/formatters'
import { Car, Calendar, User } from 'lucide-react'

interface Props {
  session: EstoqueCarroSession | null
  employeeName: string
}

export function EstoqueCarroHeader({ session, employeeName }: Props) {
  if (!session) return null

  return (
    <Card className="bg-blue-50/30 border-blue-200">
      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full text-blue-700">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">
              ID Estoque Carro
            </p>
            <p className="text-xl font-bold text-blue-900">#{session.id}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{employeeName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Início: {safeFormatDate(session.data_inicio)}
            </div>
            {session.data_fim && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fim: {safeFormatDate(session.data_fim)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
