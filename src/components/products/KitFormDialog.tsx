import { useState, useEffect } from 'react'
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
import { Kit, KitItem } from '@/types/kit'
import { ProductRow } from '@/types/product'
import { kitsService } from '@/services/kitsService'
import { ProductCombobox } from '@/components/products/ProductCombobox'
import { Trash2, Plus, Loader2, Save } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface KitFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitToEdit: Kit | null
  onSuccess: () => void
}

export function KitFormDialog({
  open,
  onOpenChange,
  kitToEdit,
  onSuccess,
}: KitFormDialogProps) {
  const [name, setName] = useState('')
  const [items, setItems] = useState<Partial<KitItem>[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      if (kitToEdit) {
        setName(kitToEdit.nome)
        setItems(kitToEdit.items || [])
      } else {
        setName('')
        setItems([])
      }
      setSelectedProduct(null)
      setQuantity(1)
    }
  }, [open, kitToEdit])

  const handleAddItem = () => {
    if (!selectedProduct) return

    // Check if already exists
    if (items.some((i) => i.produto_id === selectedProduct.ID)) {
      toast({
        title: 'Produto já adicionado',
        variant: 'destructive',
      })
      return
    }

    const newItem: Partial<KitItem> = {
      produto_id: selectedProduct.ID,
      quantidade_padrao: quantity,
      product: selectedProduct,
    }

    setItems([...items, newItem])
    setSelectedProduct(null)
    setQuantity(1)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleQuantityChange = (index: number, val: number) => {
    const newItems = [...items]
    newItems[index].quantidade_padrao = val
    setItems(newItems)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o kit.',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Kit vazio',
        description: 'Adicione pelo menos um produto.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let kitId = kitToEdit?.id

      if (kitId) {
        // Update Kit Name
        await kitsService.updateKit(kitId, { nome: name })

        // Diff Items logic is complex (add/remove/update).
        // Simplest strategy: Delete all old items and re-insert all current items.
        // Or specific handling. For simplicity and robustness given time:
        // We will remove items not in new list, add items not in old list, update existing.
        // Actually, deleting all and re-adding is safer to ensure consistency if IDs map correctly.
        // BUT, better to just sync.

        // Since we don't have bulk update for items easily exposed without complex logic:
        // 1. Fetch current DB items
        const freshKit = await kitsService.getKitById(kitId)
        const dbItems = freshKit.items || []

        // 2. Identify to Delete
        const toDelete = dbItems.filter(
          (db) => !items.find((i) => i.produto_id === db.produto_id),
        )
        for (const i of toDelete) await kitsService.removeKitItem(i.id)

        // 3. Identify to Insert or Update
        for (const item of items) {
          const existing = dbItems.find(
            (db) => db.produto_id === item.produto_id,
          )
          if (existing) {
            if (existing.quantidade_padrao !== item.quantidade_padrao) {
              await kitsService.updateKitItem(
                existing.id,
                item.quantidade_padrao!,
              )
            }
          } else {
            await kitsService.addKitItem({
              kit_id: kitId,
              produto_id: item.produto_id!,
              quantidade_padrao: item.quantidade_padrao!,
            })
          }
        }
      } else {
        // Create New
        const newKit = await kitsService.createKit({ nome: name })
        kitId = newKit.id

        // Add Items
        for (const item of items) {
          await kitsService.addKitItem({
            kit_id: kitId,
            produto_id: item.produto_id!,
            quantidade_padrao: item.quantidade_padrao!,
          })
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Kit salvo com sucesso.',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar kit.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kitToEdit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Kit</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Kit Churrasco"
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label>Adicionar Produtos</Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <ProductCombobox
                  selectedProduct={selectedProduct}
                  onSelect={setSelectedProduct}
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  placeholder="Qtd"
                />
              </div>
              <Button
                onClick={handleAddItem}
                disabled={!selectedProduct}
                variant="secondary"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-[100px]">Qtd Padrão</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {item.product?.PRODUTO}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          className="h-8"
                          value={item.quantidade_padrao}
                          onChange={(e) =>
                            handleQuantityChange(
                              index,
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Salvar Kit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
