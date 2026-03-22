import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  BellRing,
  ClipboardList,
  AlertTriangle,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import {
  notificationService,
  LoginNotificationData,
} from '@/services/notificationService'
import { configService } from '@/services/configService'
import { formatCurrency } from '@/lib/formatters'

export function LoginNotificationBox() {
  const { employee, showLoginNotification, setShowLoginNotification } =
    useUserStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LoginNotificationData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (showLoginNotification && employee) {
      loadData()
    }
  }, [showLoginNotification, employee])

  const loadData = async () => {
    if (!employee) return
    setLoading(true)
    try {
      const diasPendStr = await configService.getConfig(
        'dias_notificacao_pendencia',
      )
      const diasPend = parseInt(diasPendStr || '5', 10)

      const notifData = await notificationService.getLoginNotifications(
        employee.id,
        diasPend,
      )
      setData(notifData)
    } catch (error) {
      console.error('Failed to load notifications', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowLoginNotification(false)
  }

  if (!employee) return null

  const hasNotifications =
    data && (data.pendencias.length > 0 || data.debitos.length > 0)

  return (
    <Dialog
      open={showLoginNotification}
      onOpenChange={(open) => !open && handleClose()}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <BellRing className="h-6 w-6" />
            Caixa de Notificações
          </DialogTitle>
          <DialogDescription>
            Resumo de atividades pendentes atribuídas a você.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 bg-muted/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Analisando pendências e cobranças...</p>
            </div>
          ) : !hasNotifications ? (
            <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Tudo em dia!
              </h3>
              <p className="text-sm text-muted-foreground">
                Você não possui notificações pendentes no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.pendencias.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-amber-700 uppercase tracking-wider mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    Pendências Atrasadas ({data.pendencias.length})
                  </h3>
                  <div className="space-y-3">
                    {data.pendencias.map((p) => (
                      <div
                        key={`p-${p.id}`}
                        className="bg-white border rounded-lg p-4 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground">
                            {p.cliente_nome}
                          </h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Há {p.dias} dias
                          </span>
                        </div>
                        <p
                          className="text-sm text-muted-foreground line-clamp-2"
                          title={p.descricao}
                        >
                          {p.descricao}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              handleClose()
                              navigate(
                                '/pendencias?search=' +
                                  encodeURIComponent(p.cliente_nome),
                              )
                            }}
                          >
                            Ver Pendência
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.debitos.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold flex items-center gap-2 text-blue-700 uppercase tracking-wider mb-3 mt-6">
                    <CreditCard className="h-4 w-4" />
                    Clientes com Débito - Sem Ação ({data.debitos.length})
                  </h3>
                  <div className="space-y-3">
                    {data.debitos.map((d) => (
                      <div
                        key={`d-${d.cliente_id}`}
                        className="bg-white border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <h4 className="font-medium text-foreground">
                            {d.cliente_nome}
                          </h4>
                          <p className="text-sm font-semibold text-red-600 mt-1">
                            Débito: R$ {formatCurrency(d.debito)}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            handleClose()
                            navigate(
                              '/cobranca?search=' +
                                encodeURIComponent(d.cliente_nome),
                            )
                          }}
                          className="shrink-0 w-full sm:w-auto"
                        >
                          Inserir ação e cobrança
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/50 flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
