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
    <Card className="border-l-4 border-l-primary shadow-sm bg-muted/20">
      <CardContent className="p-3 flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold tracking-tight whitespace-nowrap">
            Controle de Rota
          </h2>
          {displayRota ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                ID {displayRota.id}
              </span>
              <span>
                {format(
                  parseISO(displayRota.data_inicio),
                  "dd/MM/yyyy 'às' HH:mm",
                  { locale: ptBR },
                )}
                {displayRota.data_fim ? (
                  <>
                    {' a '}
                    {format(
                      parseISO(displayRota.data_fim),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                  </>
                ) : (
                  <span className="text-green-600 font-semibold ml-1">
                    (Em andamento)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma rota ativa ou recente.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!activeRota ? (
            <Button
              onClick={onStart}
              disabled={loading}
              size="sm"
              className="bg-green-600 hover:bg-green-700 h-8"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-2 h-3 w-3" />
              )}
              Iniciar Rota
            </Button>
          ) : (
            <Button
              onClick={onEnd}
              disabled={loading}
              size="sm"
              variant="destructive"
              className="h-8"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Square className="mr-2 h-3 w-3" />
              )}
              Finalizar Rota
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
