import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Package,
  Loader2,
  Check,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react'
import { Kit, KitItem } from '@/types/kit'
import { kitsService } from '@/services/kitsService'
import { AcertoItem } from '@/types/acerto'
import { parseCurrency } from '@/lib/formatters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface KitSelectorDialogProps {
  onSelect: (items: AcertoItem[]) => void
}

export function KitSelectorDialog({ onSelect }: KitSelectorDialogProps) {
  const [open, setOpen] = useState(false)
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setLoading(true)
      kitsService
        .getKits()
        .then(setKits)
        .catch(console.error)
        .finally(() => setLoading(false))
      setSelectedKit(null)
    }
  }, [open])

  const handleSelectKit = (kit: Kit) => {
    setSelectedKit(kit)
  }

  const handleConfirm = () => {
    if (!selectedKit || !selectedKit.items) return

    const acertoItems: AcertoItem[] = selectedKit.items
      .filter((kitItem) => kitItem.product)
      .map((kitItem) => {
        const p = kitItem.product!
        const qty = Number(kitItem.quantidade_padrao) || 0
        const price = parseCurrency(p.PREÇO)

        // Logic: Inserting a kit in Acerto typically means adding items to the current transaction.
        // We initialize saldoFinal with the quantity from Kit to represent "Stock with Client" or "Delivered".
        // This implies: Saldo Inicial (0) -> Saldo Final (Qty).
        // Difference is +Qty (Novas Consignações).
        // User can adjust manually.

        return {
          uid: Math.random().toString(36).substr(2, 9),
          produtoId: p.ID,
          produtoCodigo: p.CODIGO,
          codigoInterno: p.codigo_interno || '',
          codigoBarras: p['CÓDIGO BARRAS'] || '',
          produtoNome: p.PRODUTO || 'Sem nome',
          tipo: p.TIPO,
          precoUnitario: price,
          saldoInicial: 0,
          contagem: 0,
          quantVendida: 0,
          valorVendido: 0,
          saldoFinal: qty, // Default quantity goes to Saldo Final
          idVendaItens: null,
        }
      })

    if (acertoItems.length === 0) {
      toast({
        title: 'Kit vazio ou produtos inválidos',
        variant: 'destructive',
      })
      return
    }

    onSelect(acertoItems)
    setOpen(false)
    toast({
      title: 'Kit inserido',
      description: `${acertoItems.length} produtos adicionados.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Package className="mr-2 h-4 w-4" />
          Inserir Kit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Selecionar Kit de Produtos</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: List of Kits */}
          <div className="w-full md:w-1/3 border-r overflow-y-auto p-2 bg-muted/10">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : kits.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                Nenhum kit encontrado.
              </div>
            ) : (
              <div className="space-y-1">
                {kits.map((kit) => (
                  <button
                    key={kit.id}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      selectedKit?.id === kit.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelectKit(kit)}
                  >
                    <span className="truncate font-medium">{kit.nome}</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Kit Details Preview */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedKit ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{selectedKit.nome}</h3>
                  <Badge variant="secondary">
                    {selectedKit.items?.length || 0} itens
                  </Badge>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Padrão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedKit.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-sm">
                            {item.product?.PRODUTO}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.quantidade_padrao}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                <p>Selecione um kit para visualizar os itens.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedKit}>
            <Check className="mr-2 h-4 w-4" />
            Confirmar Inserção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
