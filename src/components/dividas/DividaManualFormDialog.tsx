import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { DividaManual } from '@/types/divida-manual'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  debt?: DividaManual | null
}

const PAYMENT_METHODS = [
  'DINHEIRO',
  'PIX',
  'BOLETO',
  'CARTÃO',
  'CHEQUE',
  'PRAZO',
]

type Detail = {
  number: number
  value: number
  paidValue: number
  dueDate: string
}
type Entry = {
  method: string
  value: number
  paidValue: number
  installments: number
  dueDate: string
  isParcelado: boolean
  details: Detail[]
}

export function DividaManualFormDialog({ open, onOpenChange, debt }: Props) {
  const { addDivida, updateDivida } = useDividasManuaisStore()
  const { employee } = useUserStore()
  const { toast } = useToast()

  const [cliente_id, setClienteId] = useState('')
  const [cliente_nome, setClienteNome] = useState('')
  const [data_acerto, setDataAcerto] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [forma_cobranca, setFormaCobranca] = useState('VAZIO')
  const [data_combinada, setDataCombinada] = useState('')
  const [motivo, setMotivo] = useState('VAZIO')
  const [payments, setPayments] = useState<Entry[]>([])

  useEffect(() => {
    if (open) {
      if (debt) {
        setClienteId(debt.cliente_id.toString())
        setClienteNome(debt.CLIENTES?.['NOME CLIENTE'] || '')
        setDataAcerto(debt.data_acerto)
        setFormaCobranca(debt.forma_cobranca || 'VAZIO')
        setDataCombinada(debt.data_combinada || '')
        setMotivo(debt.motivo || 'VAZIO')
        setPayments([
          {
            method: debt.forma_pagamento,
            value: debt.valor_parcela,
            paidValue: debt.valor_pago,
            installments: 1,
            dueDate: debt.vencimento,
            isParcelado: false,
            details: [],
          },
        ])
      } else {
        setClienteId('')
        setClienteNome('')
        setDataAcerto(new Date().toISOString().split('T')[0])
        setFormaCobranca('VAZIO')
        setDataCombinada('')
        setMotivo('VAZIO')
        setPayments([])
      }
    }
  }, [debt, open])

  useEffect(() => {
    if (!cliente_id) {
      setClienteNome('')
      return
    }
    const fetchNome = async () => {
      const { data } = await supabase
        .from('CLIENTES')
        .select('"NOME CLIENTE"')
        .eq('CODIGO', parseInt(cliente_id))
        .single()
      if (data) {
        setClienteNome(data['NOME CLIENTE'] || '')
      } else {
        setClienteNome('Cliente não encontrado')
      }
    }
    const timer = setTimeout(fetchNome, 500)
    return () => clearTimeout(timer)
  }, [cliente_id])

  const toggleMethod = (m: string) => {
    if (payments.some((p) => p.method === m))
      setPayments(payments.filter((p) => p.method !== m))
    else
      setPayments([
        ...payments,
        {
          method: m,
          value: 0,
          paidValue: 0,
          installments: 2,
          dueDate: data_acerto,
          isParcelado: false,
          details: [],
        },
      ])
  }

  const removePayment = (idx: number) => {
    const newP = [...payments]
    newP.splice(idx, 1)
    setPayments(newP)
  }

  const updatePayment = (idx: number, field: keyof Entry, val: any) => {
    const newP = [...payments]
    const p = newP[idx]
    p[field] = val as never
    if (
      ['value', 'paidValue', 'installments', 'dueDate', 'isParcelado'].includes(
        field,
      ) &&
      p.isParcelado
    ) {
      const count = p.installments || 1
      const vPer = p.value / count
      p.details = Array.from({ length: count }).map((_, i) => {
        const ext = p.details[i]
        const d = new Date(p.dueDate || new Date().toISOString().split('T')[0])
        d.setMonth(d.getMonth() + i)
        return {
          number: i + 1,
          value: ext?.value ?? vPer,
          paidValue: ext?.paidValue ?? (i === 0 ? p.paidValue : 0),
          dueDate: ext?.dueDate ?? d.toISOString().split('T')[0],
        }
      })
    } else if (!p.isParcelado) p.details = []
    setPayments(newP)
  }

  const updateDetail = (
    pIdx: number,
    dIdx: number,
    field: keyof Detail,
    val: any,
  ) => {
    const newP = [...payments]
    newP[pIdx].details[dIdx][field] = val as never
    setPayments(newP)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    for (const p of payments) {
      if (p.isParcelado) {
        const sum = p.details.reduce((acc, d) => acc + (d.value || 0), 0)
        if (Math.abs(sum - (p.value || 0)) > 0.01) {
          return toast({
            title: 'Atenção',
            description: `O valor parcelado em ${p.method} não bate com o valor registrado.`,
            variant: 'destructive',
          })
        }
      }
    }

    try {
      const payloads: any[] = []
      const base = {
        cliente_id: parseInt(cliente_id),
        data_acerto,
        forma_cobranca: forma_cobranca === 'VAZIO' ? null : forma_cobranca,
        data_combinada: data_combinada || null,
        motivo: motivo === 'VAZIO' ? null : motivo,
        funcionario_id: employee?.id,
      }

      for (const p of payments) {
        if (p.isParcelado && p.details.length > 0) {
          p.details.forEach((d) =>
            payloads.push({
              ...base,
              vencimento: d.dueDate,
              forma_pagamento: p.method,
              valor_parcela: d.value,
              valor_pago: d.paidValue || 0,
            }),
          )
        } else {
          payloads.push({
            ...base,
            vencimento: p.dueDate,
            forma_pagamento: p.method,
            valor_parcela: p.value,
            valor_pago: p.paidValue || 0,
          })
        }
      }

      if (!payloads.length)
        return toast({
          title: 'Erro',
          description: 'Adicione uma forma de pagamento.',
          variant: 'destructive',
        })

      if (debt) await updateDivida(debt.id, payloads[0])
      else await addDivida(payloads)

      toast({ title: 'Sucesso', description: 'Dívida salva.' })
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{debt ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cód. Cliente *</Label>
              <Input
                required
                type="number"
                value={cliente_id}
                onChange={(e) => setClienteId(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Nome do Cliente</Label>
              <Input
                readOnly
                disabled
                value={cliente_nome}
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Acerto *</Label>
              <Input
                required
                type="date"
                value={data_acerto}
                onChange={(e) => setDataAcerto(e.target.value)}
              />
            </div>
          </div>

          {!debt && (
            <div className="space-y-2">
              <Label>Formas de Pagamento</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={
                      payments.some((p) => p.method === m)
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => toggleMethod(m)}
                    className="flex-1"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {payments.map((p, i) => {
            const sumParcels = p.isParcelado
              ? p.details.reduce((acc, d) => acc + (d.value || 0), 0)
              : 0
            const remaining = (p.value || 0) - sumParcels
            const hasError = p.isParcelado && Math.abs(remaining) > 0.01

            return (
              <Card key={`${p.method}-${i}`} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{p.method}</h4>
                  {!debt && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(i)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Registrado</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      value={p.value || ''}
                      onChange={(e) =>
                        updatePayment(
                          i,
                          'value',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Pago (Hoje)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={p.paidValue || ''}
                      onChange={(e) =>
                        updatePayment(
                          i,
                          'paidValue',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      required
                      type="date"
                      value={p.dueDate}
                      onChange={(e) =>
                        updatePayment(i, 'dueDate', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-end pb-2 space-x-2">
                    <Checkbox
                      id={`parc-${i}`}
                      checked={p.isParcelado}
                      onCheckedChange={(c) =>
                        updatePayment(i, 'isParcelado', !!c)
                      }
                    />
                    <Label htmlFor={`parc-${i}`}>Parcelar</Label>
                  </div>
                </div>
                {p.isParcelado && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Label>Parcelas:</Label>
                        <Select
                          value={p.installments.toString()}
                          onValueChange={(v) =>
                            updatePayment(i, 'installments', parseInt(v))
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div
                        className={cn(
                          'text-sm font-medium p-2 rounded-md border',
                          hasError
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-green-50 text-green-700 border-green-200',
                        )}
                      >
                        Registrado: R$ {p.value?.toFixed(2) || '0.00'} |
                        Incluído: R$ {sumParcels.toFixed(2)} | Restante: R${' '}
                        {remaining.toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {p.details.map((d, dIdx) => (
                        <div
                          key={dIdx}
                          className="grid grid-cols-4 gap-2 items-center bg-muted/50 p-2 rounded-md"
                        >
                          <span className="text-sm font-medium">
                            {d.number}ª Parcela
                          </span>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Valor
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={d.value || ''}
                              onChange={(e) =>
                                updateDetail(
                                  i,
                                  dIdx,
                                  'value',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Pago
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={d.paidValue || ''}
                              onChange={(e) =>
                                updateDetail(
                                  i,
                                  dIdx,
                                  'paidValue',
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Vencimento
                            </Label>
                            <Input
                              type="date"
                              value={d.dueDate}
                              onChange={(e) =>
                                updateDetail(i, dIdx, 'dueDate', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}

          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Forma de Cobrança</Label>
              <Select value={forma_cobranca} onValueChange={setFormaCobranca}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAZIO">VAZIO</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="MOTOQUEIRO">MOTOQUEIRO</SelectItem>
                  <SelectItem value="BOLETO">BOLETO</SelectItem>
                  <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                  <SelectItem value="MENSAGEM">MENSAGEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Combinada</Label>
              <Input
                type="date"
                value={data_combinada}
                onChange={(e) => setDataCombinada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAZIO">VAZIO</SelectItem>
                  <SelectItem value="Autorizou ida">Autorizou ida</SelectItem>
                  <SelectItem value="Avisou ida">Avisou ida</SelectItem>
                  <SelectItem value="Combinou motoqueiro">
                    Combinou motoqueiro
                  </SelectItem>
                  <SelectItem value="Sem Contato">Sem Contato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
