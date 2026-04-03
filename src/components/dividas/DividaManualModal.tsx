import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

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
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && clientId) {
      fetchDebts()
    }
  }, [open, clientId])

  const fetchDebts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dividas_manuais')
      .select(
        '*, dividas_manuais_acoes (id, acao, data_acao, motivo, nova_data_combinada)',
      )
      .eq('cliente_id', clientId)

    if (data) {
      setDebts(data.filter((d: any) => d.valor_parcela > d.valor_pago))
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Dívidas Pendentes
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {clientId} - {clientName}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
            </div>
          ) : debts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma dívida ativa encontrada.
            </p>
          ) : (
            debts.map((d) => {
              const debito = d.valor_parcela - d.valor_pago
              return (
                <div
                  key={d.id}
                  className="p-4 border rounded-lg bg-card shadow-sm space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-muted/50">
                        C{d.cobranca_seq}
                      </Badge>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted text-blue-500"
                            title="Ver Motivo e Histórico"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" side="right">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-sm">
                                Motivo da Inclusão
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {d.motivo || 'Nenhum motivo registrado.'}
                              </p>
                            </div>
                            <Separator />
                            <div>
                              <h4 className="font-semibold text-sm">
                                Histórico de Ações (
                                {d.dividas_manuais_acoes?.length || 0})
                              </h4>
                              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                                {d.dividas_manuais_acoes?.map((a: any) => (
                                  <div
                                    key={a.id}
                                    className="text-xs border-b pb-2 last:border-0"
                                  >
                                    <span className="font-medium text-primary">
                                      {a.acao}
                                    </span>{' '}
                                    - {safeFormatDate(a.data_acao)}
                                    {a.motivo && (
                                      <p className="text-muted-foreground mt-0.5">
                                        {a.motivo}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">
                        Valor da Dívida
                      </span>
                      <p className="font-bold text-red-600">
                        R$ {formatCurrency(debito)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">
                        Vencimento
                      </span>
                      <p className="font-medium">
                        {safeFormatDate(d.vencimento)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">
                        Valor Parcela
                      </span>
                      <p>R$ {formatCurrency(d.valor_parcela)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">
                        Valor Pago
                      </span>
                      <p className="text-green-600">
                        R$ {formatCurrency(d.valor_pago)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
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
      </DialogContent>
    </Dialog>
  )
}
