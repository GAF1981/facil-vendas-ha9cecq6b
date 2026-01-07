import { InventoryGeneralSession } from '@/types/inventory_general'
import { Card, CardContent } from '@/components/ui/card'
import { safeFormatDate } from '@/lib/formatters'
import { Hash, CalendarClock } from 'lucide-react'

export function InventoryInfoCard({
  session,
}: {
  session: InventoryGeneralSession | null
}) {
  if (!session)
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum inventário ativo no momento.
        </CardContent>
      </Card>
    )

  return (
    <Card className="bg-blue-50/20 border-blue-200">
      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-full text-blue-700">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">
              ID Inventário
            </p>
            <p className="text-xl font-bold text-blue-900">#{session.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">
              Data Início
            </p>
            <p className="font-medium">{safeFormatDate(session.data_inicio)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">
              Data Final
            </p>
            <p className="font-medium">
              {session.data_fim
                ? safeFormatDate(session.data_fim)
                : 'Em andamento'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
