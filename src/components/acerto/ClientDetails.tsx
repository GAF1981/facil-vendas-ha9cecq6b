import { ClientRow } from '@/types/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ClientDetailsProps {
  client: ClientRow
  lastAcertoDate?: string | null
}

export function ClientDetails({ client, lastAcertoDate }: ClientDetailsProps) {
  const formattedDate = lastAcertoDate
    ? format(parseISO(lastAcertoDate), 'dd/MM/yyyy', { locale: ptBR })
    : 'Nenhum acerto encontrado'

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
          <div>
            <Label className="text-xs text-muted-foreground">
              Data do último Acerto:
            </Label>
            <p className="font-medium truncate text-base text-blue-600">
              {formattedDate}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
