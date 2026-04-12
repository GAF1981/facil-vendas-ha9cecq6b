import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  MessageCircle,
  PlusCircle,
  MessageSquareText,
  Edit,
  Trash,
  ArrowUpDown,
  Search,
  Send,
  Info,
} from 'lucide-react'
import { DividaManual } from '@/types/divida-manual'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { useToast } from '@/hooks/use-toast'
import { DividaManualFormDialog } from './DividaManualFormDialog'
import { DividaManualAcoesSheet } from './DividaManualAcoesSheet'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { CollectionMessageDialog } from '@/components/cobranca/CollectionMessageDialog'

export function DividasManuaisTable({
  data,
  loading,
}: {
  data: DividaManual[]
  loading: boolean
}) {
  const { updateDivida, deleteDivida } = useDividasManuaisStore()
  const { toast } = useToast()
  const [editingDebt, setEditingDebt] = useState<DividaManual | null>(null)
  const [actionsDebt, setActionsDebt] = useState<DividaManual | null>(null)
  const [messageData, setMessageData] = useState<any | null>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [boletos, setBoletos] = useState<any[]>([])

  useEffect(() => {
    const fetchBoletos = async () => {
      const { data: b } = await supabase
        .from('boletos')
        .select('cliente_codigo, vencimento, conferido')
      if (b) setBoletos(b)
    }
    fetchBoletos()
  }, [data])

  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(0)

  const [sortCol, setSortCol] = useState<
    'vencimento' | 'data_combinada' | 'forma_cobranca'
  >('vencimento')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    if (!innerRef.current) return
    const observer = new ResizeObserver((entries) => {
      setTableWidth(entries[0].target.scrollWidth)
    })
    observer.observe(innerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bottomScrollRef.current)
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
  }
  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current)
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
  }

  const handleSort = (
    col: 'vencimento' | 'data_combinada' | 'forma_cobranca',
  ) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  const sortedData = [...data].sort((a: any, b: any) => {
    const valA = a[sortCol] || ''
    const valB = b[sortCol] || ''
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })

  useEffect(() => {
    const fetchCounts = async () => {
      const ids = data.map((d) => d.id)
      if (ids.length === 0) {
        setCounts({})
        return
      }
      const { data: actions } = await supabase
        .from('dividas_manuais_acoes')
        .select('divida_id')
        .in('divida_id', ids)
      const c: Record<number, number> = {}
      actions?.forEach((d: any) => {
        c[d.divida_id] = (c[d.divida_id] || 0) + 1
      })
      setCounts(c)
    }
    fetchCounts()
  }, [data.map((d) => d.id).join(',')])

  const handleUpdate = async (id: number, field: string, value: any) => {
    try {
      await updateDivida(id, { [field]: value })
      toast({
        title: 'Atualizado',
        description: 'Dados salvos com sucesso.',
        duration: 1500,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta dívida?')) return
    if (
      !confirm(
        'ATENÇÃO: A dívida será excluída de forma PERMANENTE. Tem certeza absoluta?',
      )
    )
      return
    try {
      await deleteDivida(id)
      toast({ title: 'Sucesso', description: 'Dívida excluída.' })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir.',
        variant: 'destructive',
      })
    }
  }

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) window.open(`https://wa.me/55${cleanPhone}`, '_blank')
  }

  return (
    <div className="border rounded-md bg-card flex flex-col relative">
      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden border-b custom-scrollbar"
        onScroll={handleTopScroll}
        style={{ height: '14px' }}
      >
        <div style={{ width: tableWidth, height: '1px' }}></div>
      </div>

      <div
        ref={bottomScrollRef}
        className="overflow-x-auto"
        onScroll={handleBottomScroll}
      >
        <div ref={innerRef} className="min-w-max">
          <Table>
            <TableHeader className="bg-muted/50 whitespace-nowrap">
              <TableRow>
                <TableHead className="text-xs">Cobrança</TableHead>
                <TableHead className="text-xs">Funcionário</TableHead>
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs min-w-[150px]">Cliente</TableHead>
                <TableHead className="text-xs min-w-[120px]">
                  Tipo Cliente
                </TableHead>
                <TableHead className="text-xs text-center">Contador</TableHead>
                <TableHead className="text-xs text-center">Rota</TableHead>
                <TableHead className="text-xs">Data Acerto</TableHead>
                <TableHead
                  className="text-xs cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('vencimento')}
                >
                  <div className="flex items-center gap-1">
                    Vencimento <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="text-xs">F. Pagamento</TableHead>
                <TableHead className="text-xs text-right">
                  Valor Parc.
                </TableHead>
                <TableHead className="text-xs text-right">Pago</TableHead>
                <TableHead className="text-xs text-right">Dívida</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead
                  className="text-xs min-w-[120px] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('forma_cobranca')}
                >
                  <div className="flex items-center gap-1">
                    Forma Cobrança{' '}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-xs min-w-[120px] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleSort('data_combinada')}
                >
                  <div className="flex items-center gap-1">
                    Data Combinada{' '}
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="text-xs min-w-[120px]">Motivo</TableHead>
                <TableHead className="text-xs min-w-[120px]">
                  Telefone Cobrança
                </TableHead>
                <TableHead className="text-xs text-center">
                  Ações em Dívidas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="h-24 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={19} className="h-24 text-center">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((row) => {
                  const debito = Math.max(0, row.valor_parcela - row.valor_pago)
                  const isPaid = row.valor_pago >= row.valor_parcela
                  const isOverdue =
                    !isPaid &&
                    new Date(row.vencimento) <
                      new Date(new Date().setHours(0, 0, 0, 0))
                  const status = isPaid
                    ? 'pago'
                    : isOverdue
                      ? 'vencido'
                      : 'a vencer'
                  const phone =
                    row.CLIENTES?.telefone_cobranca ||
                    row.CLIENTES?.['FONE 1'] ||
                    ''

                  const isBoleto = row.forma_pagamento
                    ?.toUpperCase()
                    .includes('BOLETO')
                  const matchingBoleto = isBoleto
                    ? boletos.find(
                        (b) =>
                          b.cliente_codigo === row.cliente_id &&
                          b.vencimento === row.vencimento,
                      )
                    : null
                  const boletoStatus = matchingBoleto
                    ? 'Boleto conferido'
                    : 'Boleto a conferir'

                  return (
                    <TableRow
                      key={row.id}
                      className="hover:bg-muted/30 whitespace-nowrap text-xs"
                    >
                      <TableCell className="font-mono font-bold">
                        C{row.cobranca_seq}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[100px]">
                        {row.FUNCIONARIOS?.nome_completo || '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {row.cliente_id}
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span title={row.CLIENTES?.['NOME CLIENTE']}>
                            {row.CLIENTES?.['NOME CLIENTE'] || '-'}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full hover:bg-muted"
                                title="Ver Motivo e Histórico"
                              >
                                <Info className="h-3 w-3 text-blue-500" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" side="right">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    Motivo da Inclusão
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {row.motivo || 'Nenhum motivo registrado.'}
                                  </p>
                                </div>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    Histórico
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Esta dívida possui {counts[row.id] || 0}{' '}
                                    ações de cobrança registradas.
                                  </p>
                                  <Button
                                    variant="link"
                                    className="px-0 py-1 h-auto text-xs text-primary"
                                    onClick={() => setActionsDebt(row)}
                                  >
                                    Ver histórico completo
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {row.CLIENTES?.['TIPO DE CLIENTE'] || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">
                        {counts[row.id] || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!row.rota_motoqueiro}
                          onCheckedChange={(c) =>
                            handleUpdate(row.id, 'rota_motoqueiro', !!c)
                          }
                          className="data-[state=checked]:bg-primary"
                        />
                      </TableCell>
                      <TableCell>{safeFormatDate(row.data_acerto)}</TableCell>
                      <TableCell>{safeFormatDate(row.vencimento)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{row.forma_pagamento}</span>
                          {isBoleto && (
                            <Badge
                              variant={
                                matchingBoleto ? 'default' : 'destructive'
                              }
                              className={cn(
                                'text-[9px] px-1 py-0 uppercase max-w-max border-transparent',
                                matchingBoleto
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-red-600 hover:bg-red-700 text-white',
                              )}
                            >
                              {boletoStatus}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.valor_parcela)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(row.valor_pago)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-red-600">
                        {formatCurrency(debito)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            status === 'vencido'
                              ? 'destructive'
                              : status === 'pago'
                                ? 'secondary'
                                : 'outline'
                          }
                          className={cn(
                            'text-[10px] px-2 py-0.5 h-6 capitalize',
                            status === 'pago' &&
                              'bg-green-100 text-green-700 hover:bg-green-200 border-transparent',
                            status === 'a vencer' &&
                              'bg-green-50 text-green-600 border-green-200',
                          )}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.forma_cobranca || ''}
                          onValueChange={(val) =>
                            handleUpdate(
                              row.id,
                              'forma_cobranca',
                              val === 'VAZIO' ? null : val,
                            )
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VAZIO">VAZIO</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="MOTOQUEIRO">
                              MOTOQUEIRO
                            </SelectItem>
                            <SelectItem value="BOLETO">BOLETO</SelectItem>
                            <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                            <SelectItem value="MENSAGEM">MENSAGEM</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-7 text-xs w-full px-1"
                          value={row.data_combinada || ''}
                          onChange={(e) =>
                            handleUpdate(
                              row.id,
                              'data_combinada',
                              e.target.value || null,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-full px-2"
                          value={row.motivo || ''}
                          onChange={(e) =>
                            handleUpdate(
                              row.id,
                              'motivo',
                              e.target.value || null,
                            )
                          }
                          placeholder="Motivo..."
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {phone ? (
                            <>
                              <span
                                className="truncate max-w-[90px]"
                                title={phone}
                              >
                                {phone}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-green-600 hover:bg-green-50 rounded-full"
                                onClick={() => handleWhatsApp(phone)}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground w-[90px]">
                              -
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                            onClick={() =>
                              setMessageData({
                                uniqueId: row.id.toString(),
                                clientId: row.cliente_id,
                                clientName:
                                  row.CLIENTES?.['NOME CLIENTE'] || '',
                                telefoneCobranca: phone,
                                debito: debito,
                                vencimento: row.vencimento,
                                orderId: row.id,
                              })
                            }
                            title="Mensagem de Cobrança"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                            onClick={() => setActionsDebt(row)}
                            title="Incluir Ações"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:bg-green-50"
                            onClick={() => setEditingDebt(row)}
                            title="Editar Dívida"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => setActionsDebt(row)}
                            title="Ver Histórico"
                          >
                            <MessageSquareText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(row.id)}
                            title="Excluir"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DividaManualFormDialog
        open={!!editingDebt}
        onOpenChange={(op) => !op && setEditingDebt(null)}
        debt={editingDebt}
      />
      {actionsDebt && (
        <DividaManualAcoesSheet
          open={!!actionsDebt}
          onOpenChange={(op) => !op && setActionsDebt(null)}
          debt={actionsDebt}
        />
      )}

      <CollectionMessageDialog
        isOpen={!!messageData}
        onClose={() => setMessageData(null)}
        data={messageData}
      />
    </div>
  )
}
