import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { Badge } from '@/components/ui/badge'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: number
  clientName: string
}

export function DividaManualModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: Props) {
  const navigate = useNavigate()
  const { dividas } = useDividasManuaisStore()

  const clientDebts = dividas.filter(
    (d) => d.cliente_id === clientId && d.valor_parcela > d.valor_pago,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Dívidas Manuais Pendentes</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {clientId} - {clientName}
          </p>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {clientDebts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma dívida ativa encontrada.
            </p>
          ) : (
            clientDebts.map((d) => {
              const debito = d.valor_parcela - d.valor_pago
              return (
                <div
                  key={d.id}
                  className="p-4 border rounded-lg bg-card shadow-sm space-y-2 relative"
                >
                  <Badge
                    variant="outline"
                    className="absolute top-4 right-4 bg-muted/50"
                  >
                    C{d.cobranca_seq}
                  </Badge>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Valor da Dívida:
                      </span>
                      <p className="font-bold text-red-600">
                        R$ {formatCurrency(debito)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vencimento:</span>
                      <p className="font-medium">
                        {safeFormatDate(d.vencimento)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Valor Parcela:
                      </span>
                      <p>R$ {formatCurrency(d.valor_parcela)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor Pago:</span>
                      <p className="text-green-600">
                        R$ {formatCurrency(d.valor_pago)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false)
                navigate(`/dividas-manuais?cliente=${clientId}`)
              }}
            >
              Ir para Dívida
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
