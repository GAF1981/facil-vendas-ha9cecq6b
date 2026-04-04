import { ClientRow } from '@/types/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, Calendar, MessageCircle, Info, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/formatters'

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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [pendencias, setPendencias] = useState<any[]>([])
  const [debitos, setDebitos] = useState<any[]>([])
  const [acoes, setAcoes] = useState<any[]>([])
  const [dividasManuais, setDividasManuais] = useState<any[]>([])
  const [dividasAcoes, setDividasAcoes] = useState<any[]>([])
  const [loadingInfo, setLoadingInfo] = useState(false)

  useEffect(() => {
    if (client?.CODIGO) {
      loadClientInfo(client.CODIGO)
    }
  }, [client?.CODIGO])

  const loadClientInfo = async (codigo: number) => {
    setLoadingInfo(true)
    try {
      // Fetch pendencias
      const { data: pendData } = await supabase
        .from('PENDENCIAS')
        .select('*')
        .eq('cliente_id', codigo)
        .eq('resolvida', false)

      setPendencias(pendData || [])

      // Fetch debitos
      const { data: debData } = await supabase
        .from('debitos_historico')
        .select('*')
        .eq('cliente_codigo', codigo)
        .gt('debito', 0)
        .order('data_acerto', { ascending: false })

      setDebitos(debData || [])

      if (debData && debData.length > 0) {
        const pedidoIds = debData.map((d) => d.pedido_id)
        const { data: acoesData } = await supabase
          .from('acoes_cobranca')
          .select('*')
          .in('pedido_id', pedidoIds)
          .order('data_acao', { ascending: false })
        setAcoes(acoesData || [])
      } else {
        setAcoes([])
      }

      // Fetch dividas manuais
      const { data: divData } = await supabase
        .from('dividas_manuais')
        .select('*')
        .eq('cliente_id', codigo)
        .order('vencimento', { ascending: false })

      const dividasAbertas = (divData || []).filter(
        (d: any) => d.valor_parcela > d.valor_pago,
      )
      setDividasManuais(dividasAbertas)

      if (dividasAbertas.length > 0) {
        const divIds = dividasAbertas.map((d: any) => d.id)
        const { data: divAcoesData } = await supabase
          .from('dividas_manuais_acoes')
          .select('*')
          .in('divida_id', divIds)
          .order('data_acao', { ascending: false })
        setDividasAcoes(divAcoesData || [])
      } else {
        setDividasAcoes([])
      }

      setInfoDialogOpen(true) // Auto-open when loaded
    } catch (error) {
      console.error('Error loading client info', error)
    } finally {
      setLoadingInfo(false)
    }
  }

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
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 rounded-full bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                onClick={() => setInfoDialogOpen(true)}
                title="Ver Informações e Débitos"
              >
                <Info className="h-4 w-4" />
              </Button>
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

      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Informações do Cliente
              {client['TIPO DE CLIENTE'] && (
                <Badge
                  variant={
                    client['TIPO DE CLIENTE'] === 'ATIVO'
                      ? 'default'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {client['TIPO DE CLIENTE']}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Observações Gerais */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-primary">
                <FileText className="h-4 w-4" /> Observações Gerais
              </h3>
              <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {client['OBSERVAÇÃO FIXA'] || 'Nenhuma observação registrada.'}
              </div>
            </div>

            {/* Pendências */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-orange-600">
                <Info className="h-4 w-4" /> Pendências ({pendencias.length})
              </h3>
              {pendencias.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma pendência ativa.
                </p>
              ) : (
                <div className="space-y-2">
                  {pendencias.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 border border-orange-200 bg-orange-50 rounded-md text-sm text-orange-900"
                    >
                      {p.descricao_pendencia}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dívidas Manuais e Histórico */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-purple-600">
                <FileText className="h-4 w-4" /> Dívidas (Inclusão Manual) (
                {dividasManuais.length})
              </h3>
              {dividasManuais.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma dívida manual em aberto.
                </p>
              ) : (
                <div className="space-y-4">
                  {dividasManuais.map((d) => {
                    const acoesDaDivida = dividasAcoes.filter(
                      (a) => a.divida_id === d.id,
                    )
                    const debitoRestante = Math.max(
                      0,
                      d.valor_parcela - d.valor_pago,
                    )
                    return (
                      <div
                        key={d.id}
                        className="p-3 border border-purple-200 bg-purple-50/50 rounded-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-purple-700">
                              Cobrança #C{d.cobranca_seq}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Vencimento:{' '}
                              {d.vencimento
                                ? format(parseISO(d.vencimento), 'dd/MM/yyyy')
                                : 'N/D'}
                            </p>
                            {d.motivo && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium text-black">
                                  Motivo:
                                </span>{' '}
                                {d.motivo}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-sm font-bold text-purple-700 border-purple-300 bg-white"
                          >
                            R$ {formatCurrency(debitoRestante)}
                          </Badge>
                        </div>

                        {acoesDaDivida.length > 0 ? (
                          <div className="mt-3 pl-3 border-l-2 border-purple-200 space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Histórico de Cobrança:
                            </p>
                            {acoesDaDivida.map((a) => (
                              <div
                                key={a.id}
                                className="text-xs bg-white/60 p-2 rounded border border-purple-100 shadow-sm"
                              >
                                <div className="font-semibold text-purple-800">
                                  {a.acao}
                                </div>
                                <div className="text-muted-foreground">
                                  {a.data_acao
                                    ? format(
                                        parseISO(a.data_acao),
                                        'dd/MM/yyyy HH:mm',
                                      )
                                    : ''}
                                </div>
                                {a.motivo && (
                                  <div className="mt-1">
                                    <span className="font-medium">Motivo:</span>{' '}
                                    {a.motivo}
                                  </div>
                                )}
                                {a.nova_data_combinada && (
                                  <div className="font-medium text-blue-600 mt-1">
                                    Reagendado:{' '}
                                    {format(
                                      parseISO(a.nova_data_combinada),
                                      'dd/MM/yyyy',
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Nenhuma ação de cobrança registrada para esta
                            dívida.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Débitos e Histórico */}
            <div>
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-red-600">
                <FileText className="h-4 w-4" /> Débitos em Aberto (Cobrança) (
                {debitos.length})
              </h3>
              {debitos.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum débito em aberto.
                </p>
              ) : (
                <div className="space-y-4">
                  {debitos.map((d) => {
                    const acoesDoPedido = acoes.filter(
                      (a) => a.pedido_id === d.pedido_id,
                    )
                    return (
                      <div
                        key={d.id}
                        className="p-3 border border-red-200 bg-red-50/50 rounded-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-red-700">
                              Pedido #{d.pedido_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Data:{' '}
                              {d.data_acerto
                                ? format(parseISO(d.data_acerto), 'dd/MM/yyyy')
                                : 'N/D'}
                            </p>
                          </div>
                          <Badge
                            variant="destructive"
                            className="text-sm font-bold"
                          >
                            R$ {formatCurrency(d.debito)}
                          </Badge>
                        </div>

                        {acoesDoPedido.length > 0 ? (
                          <div className="mt-3 pl-3 border-l-2 border-red-200 space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Histórico de Cobrança:
                            </p>
                            {acoesDoPedido.map((a) => (
                              <div
                                key={a.id}
                                className="text-xs bg-white/60 p-2 rounded border border-red-100"
                              >
                                <div className="font-semibold">{a.acao}</div>
                                <div className="text-muted-foreground">
                                  {a.data_acao
                                    ? format(
                                        parseISO(a.data_acao),
                                        'dd/MM/yyyy HH:mm',
                                      )
                                    : ''}
                                </div>
                                {a.motivo && <div>Motivo: {a.motivo}</div>}
                                {a.nova_data_combinada && (
                                  <div className="font-medium text-blue-600">
                                    Reagendado:{' '}
                                    {format(
                                      parseISO(a.nova_data_combinada),
                                      'dd/MM/yyyy',
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Nenhuma ação de cobrança registrada para este
                            débito.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
