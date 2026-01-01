import { ClientRow } from '@/types/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Calendar, MessageCircle } from 'lucide-react'

interface ClientDetailsProps {
  client: ClientRow
  lastAcerto?: { date: string; time: string } | null
  loading?: boolean
}

export function ClientDetails({
  client,
  lastAcerto,
  loading = false,
}: ClientDetailsProps) {
  let formattedDate: string | null = null
  let formattedTime: string | null = null
  const hasAcerto = !!lastAcerto && (!!lastAcerto.date || !!lastAcerto.time)

  if (hasAcerto && lastAcerto?.date) {
    try {
      // Attempt to parse ISO string (YYYY-MM-DD) which is the standard format
      // If fails (e.g. DD/MM/YYYY string in legacy data), fallback to raw
      const dateObj = parseISO(lastAcerto.date)
      if (!isNaN(dateObj.getTime())) {
        formattedDate = format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
      } else {
        formattedDate = lastAcerto.date
      }
    } catch (e) {
      formattedDate = lastAcerto.date
    }
  }

  if (hasAcerto && lastAcerto?.time) {
    // Format time to HH:mm, removing seconds if present
    const timeParts = lastAcerto.time.split(':')
    if (timeParts.length >= 2) {
      formattedTime = `${timeParts[0]}:${timeParts[1]}`
    } else {
      formattedTime = lastAcerto.time
    }
  }

  const handleWhatsAppClick = () => {
    if (!client['FONE 1']) return
    const phone = client['FONE 1'].replace(/\D/g, '')
    if (phone) {
      window.open(`https://wa.me/${phone}`, '_blank')
    }
  }

  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Código</Label>
            <p className="font-medium font-mono text-lg text-primary">
              {client.CODIGO}
            </p>
          </div>
          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <div className="flex items-center gap-2">
              <p
                className="font-medium truncate text-lg"
                title={client['NOME CLIENTE'] || ''}
              >
                {client['NOME CLIENTE']}
              </p>
              {client['FONE 1'] && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 rounded-full bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700"
                  onClick={handleWhatsAppClick}
                  title={`WhatsApp: ${client['FONE 1']}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <p className="font-medium truncate" title={client.ENDEREÇO || ''}>
              {client.ENDEREÇO || '-'}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Localização</Label>
            <div className="flex flex-col">
              <span className="font-medium truncate">
                {client.MUNICÍPIO || '-'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {client.BAIRRO || '-'}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Data do Último Acerto
            </Label>
            {loading ? (
              <div className="pt-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ) : hasAcerto ? (
              <div className="flex flex-col animate-fade-in">
                <div className="flex items-center gap-1.5 font-medium truncate text-base text-blue-600">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate || 'Data N/D'}</span>
                </div>
                {formattedTime && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formattedTime}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pt-1 animate-fade-in">
                Nenhum acerto encontrado
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
