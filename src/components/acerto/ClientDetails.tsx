import { ClientRow } from '@/types/client'
import { LastAcertoInfo } from '@/types/acerto'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { format, parseISO } from 'date-fns'

interface ClientDetailsProps {
  client: ClientRow
  lastAcerto?: LastAcertoInfo | null
}

export function ClientDetails({ client, lastAcerto }: ClientDetailsProps) {
  // Helper to format date string yyyy-MM-dd to dd/MM/yyyy safely
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      // If it matches yyyy-MM-dd, split and join to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      // Fallback for other formats (like ISO with time)
      return format(parseISO(dateString), 'dd/MM/yyyy')
    } catch (e) {
      console.error('Date formatting error:', e)
      return dateString
    }
  }

  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Código</Label>
            <p className="font-medium font-mono text-lg text-primary">
              {client.CODIGO}
            </p>
          </div>
          <div className="lg:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <p
              className="font-medium truncate text-lg"
              title={client['NOME CLIENTE'] || ''}
            >
              {client['NOME CLIENTE']}
            </p>
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
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground font-semibold block mb-1">
              Data do último Acerto:
            </Label>
            <span className="text-sm font-medium">
              {lastAcerto?.data ? formatDate(lastAcerto.data) : 'N/A'}
            </span>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground font-semibold block mb-1">
              Hora do último Acerto:
            </Label>
            <span className="text-sm font-medium">
              {lastAcerto?.hora || 'N/A'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
