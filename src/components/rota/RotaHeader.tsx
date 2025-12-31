import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rota } from '@/types/rota'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Play, Square, Loader2 } from 'lucide-react'

interface RotaHeaderProps {
  activeRota: Rota | null
  lastRota: Rota | null
  onStart: () => void
  onEnd: () => void
  loading: boolean
}

export function RotaHeader({
  activeRota,
  lastRota,
  onStart,
  onEnd,
  loading,
}: RotaHeaderProps) {
  const displayRota = activeRota || lastRota

  return (
    <Card className="flex-1 border-l-4 border-l-primary shadow-sm bg-muted/20">
      <CardContent className="p-2 flex flex-row items-center justify-between gap-2 h-full">
        <div className="flex items-center gap-2 overflow-hidden">
          <h2 className="text-sm font-bold tracking-tight whitespace-nowrap">
            Controle de Rota
          </h2>
          {displayRota ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
                #{displayRota.id}
              </span>
              <span className="truncate">
                {format(parseISO(displayRota.data_inicio), 'dd/MM HH:mm', {
                  locale: ptBR,
                })}
                {displayRota.data_fim ? (
                  <>
                    {' -> '}
                    {format(parseISO(displayRota.data_fim), 'dd/MM HH:mm', {
                      locale: ptBR,
                    })}
                  </>
                ) : (
                  <span className="text-green-600 font-semibold ml-1">
                    (Em andamento)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sem rota.</p>
          )}
        </div>

        <div className="flex gap-1 shrink-0">
          {!activeRota ? (
            <Button
              onClick={onStart}
              disabled={loading}
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
            >
              {loading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-1 h-3 w-3" />
              )}
              Iniciar
            </Button>
          ) : (
            <Button
              onClick={onEnd}
              disabled={loading}
              size="sm"
              variant="destructive"
              className="h-7 px-2 text-xs"
            >
              {loading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Square className="mr-1 h-3 w-3" />
              )}
              Finalizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
