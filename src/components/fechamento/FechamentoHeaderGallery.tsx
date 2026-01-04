import { FechamentoCaixa } from '@/types/fechamento'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { User, CheckCircle2, Circle } from 'lucide-react'

interface FechamentoHeaderGalleryProps {
  items: FechamentoCaixa[]
}

export function FechamentoHeaderGallery({
  items,
}: FechamentoHeaderGalleryProps) {
  if (items.length === 0) return null

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-muted/20">
      <div className="flex w-max space-x-4 p-4">
        {items.map((item) => (
          <Card key={item.id} className="w-[200px] shrink-0">
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarImage src={item.funcionario?.foto_url || undefined} />
                  <AvatarFallback className="bg-muted">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 w-full">
                  <p
                    className="font-semibold text-sm truncate"
                    title={item.funcionario?.nome_completo}
                  >
                    {item.funcionario?.nome_completo || 'Desconhecido'}
                  </p>
                  <Badge
                    variant={item.status === 'Fechado' ? 'default' : 'outline'}
                    className={
                      item.status === 'Fechado'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'text-muted-foreground'
                    }
                  >
                    {item.status === 'Fechado' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fechado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Circle className="h-3 w-3" /> Aberto
                      </span>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
