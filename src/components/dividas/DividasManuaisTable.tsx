import { useState } from 'react'
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
    <div className="border rounded-md bg-card overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/50 whitespace-nowrap">
          <TableRow>
            <TableHead className="text-xs">Cobrança</TableHead>
            <TableHead className="text-xs">Funcionário</TableHead>
            <TableHead className="text-xs">Código</TableHead>
            <TableHead className="text-xs min-w-[150px]">Cliente</TableHead>
            <TableHead className="text-xs">Data Acerto</TableHead>
            <TableHead className="text-xs">Vencimento</TableHead>
            <TableHead className="text-xs">F. Pagamento</TableHead>
            <TableHead className="text-xs text-right">Valor Parc.</TableHead>
            <TableHead className="text-xs text-right">Pago</TableHead>
            <TableHead className="text-xs text-right">Dívida</TableHead>
            <TableHead className="text-xs text-center">Status</TableHead>
            <TableHead className="text-xs min-w-[120px]">
              Forma Cobrança
            </TableHead>
            <TableHead className="text-xs min-w-[120px]">
              Data Combinada
            </TableHead>
            <TableHead className="text-xs min-w-[120px]">Motivo</TableHead>
            <TableHead className="text-xs min-w-[120px]">Contato</TableHead>
            <TableHead className="text-xs text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={16} className="h-24 text-center">
                Carregando...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={16} className="h-24 text-center">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
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
                  <TableCell className="font-mono">{row.cliente_id}</TableCell>
                  <TableCell
                    className="font-medium truncate max-w-[150px]"
                    title={row.CLIENTES?.['NOME CLIENTE']}
                  >
                    {row.CLIENTES?.['NOME CLIENTE'] || '-'}
                  </TableCell>
                  <TableCell>{safeFormatDate(row.data_acerto)}</TableCell>
                  <TableCell>{safeFormatDate(row.vencimento)}</TableCell>
                  <TableCell>{row.forma_pagamento}</TableCell>
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
                        <SelectItem value="MOTOQUEIRO">MOTOQUEIRO</SelectItem>
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
                    <Select
                      value={row.motivo || ''}
                      onValueChange={(val) =>
                        handleUpdate(
                          row.id,
                          'motivo',
                          val === 'VAZIO' ? null : val,
                        )
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VAZIO">VAZIO</SelectItem>
                        <SelectItem value="Autorizou ida">
                          Autorizou ida
                        </SelectItem>
                        <SelectItem value="Avisou ida">Avisou ida</SelectItem>
                        <SelectItem value="Combinou motoqueiro">
                          Combinou motoqueiro
                        </SelectItem>
                        <SelectItem value="Sem Contato">Sem Contato</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {phone ? (
                        <>
                          <span className="truncate max-w-[90px]" title={phone}>
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
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                        onClick={() => setActionsDebt(row)}
                        title="Ações de Cobrança"
                      >
                        <PlusCircle className="h-4 w-4" />
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
                        className="h-6 w-6 text-amber-600 hover:bg-amber-50"
                        onClick={() => setEditingDebt(row)}
                        title="Editar Dívida"
                      >
                        <Edit className="h-4 w-4" />
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
    </div>
  )
}
