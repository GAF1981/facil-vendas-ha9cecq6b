import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { QuitarDividaItem } from '@/services/quitarDividaService'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowUpDown } from 'lucide-react'

interface Props {
  loading: boolean
  items: QuitarDividaItem[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export function QuitarDividaTable({
  loading,
  items,
  selectedId,
  onSelect,
}: Props) {
  const [sortCol, setSortCol] = useState<
    'vencimento' | 'data_combinada' | 'forma_cobranca'
  >('vencimento')
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (
    col: 'vencimento' | 'data_combinada' | 'forma_cobranca',
  ) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  const sortedItems = [...items].sort((a: any, b: any) => {
    const valA = a[sortCol] || ''
    const valB = b[sortCol] || ''
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhuma dívida encontrada.
      </div>
    )
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(v)

  const formatDate = (d?: string | null) => {
    if (!d) return '-'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[50px]">
              Sel.
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Dívida
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Cliente
            </th>
            <th
              className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => handleSort('vencimento')}
            >
              <div className="flex items-center gap-1">
                Vencimento <ArrowUpDown className="h-3 w-3 opacity-50" />
              </div>
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Forma
            </th>
            <th
              className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => handleSort('forma_cobranca')}
            >
              <div className="flex items-center gap-1">
                Forma Cobrança <ArrowUpDown className="h-3 w-3 opacity-50" />
              </div>
            </th>
            <th
              className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => handleSort('data_combinada')}
            >
              <div className="flex items-center gap-1">
                Data Combinada <ArrowUpDown className="h-3 w-3 opacity-50" />
              </div>
            </th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
              Valor Parcela
            </th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
              Saldo Devedor
            </th>
            <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {sortedItems.map((item: any) => {
            const isSelected = selectedId === item.id
            return (
              <tr
                key={item.id}
                className={`border-b transition-colors cursor-pointer hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''
                }`}
                onClick={() => onSelect(item.id)}
              >
                <td className="p-4 align-middle text-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="p-4 align-middle font-medium">#{item.id}</td>
                <td className="p-4 align-middle">
                  {item.cliente_id} - {item.cliente_nome}
                </td>
                <td className="p-4 align-middle">
                  {formatDate(item.vencimento)}
                </td>
                <td className="p-4 align-middle">{item.forma_pagamento}</td>
                <td className="p-4 align-middle">
                  {item.forma_cobranca || '-'}
                </td>
                <td className="p-4 align-middle">
                  {formatDate(item.data_combinada)}
                </td>
                <td className="p-4 align-middle text-right">
                  {formatCurrency(item.valor_parcela)}
                </td>
                <td className="p-4 align-middle text-right text-red-600 font-semibold">
                  {formatCurrency(item.saldo_devedor)}
                </td>
                <td className="p-4 align-middle text-center">
                  <Badge
                    variant={item.status === 'PAGO' ? 'default' : 'secondary'}
                    className={
                      item.status === 'PAGO'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    }
                  >
                    {item.status}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
