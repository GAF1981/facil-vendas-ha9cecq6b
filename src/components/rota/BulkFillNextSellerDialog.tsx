import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Employee } from '@/types/employee'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkFillNextSellerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (sellerId: number | null, sellerName: string) => void
  sellers: Employee[]
  rowCount: number
}

export function BulkFillNextSellerDialog({
  open,
  onOpenChange,
  onConfirm,
  sellers,
  rowCount,
}: BulkFillNextSellerDialogProps) {
  const [selectedSellerId, setSelectedSellerId] = useState<string>('')
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const handleConfirm = () => {
    const seller = sellers.find((s) => s.id.toString() === selectedSellerId)
    onConfirm(
      seller ? seller.id : null,
      seller ? seller.nome_completo : 'Nenhum',
    )
    setSelectedSellerId('')
    onOpenChange(false)
  }

  const selectedSellerName =
    sellers.find((s) => s.id.toString() === selectedSellerId)?.nome_completo ||
    'Selecione...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Preencher Coluna "Próxima"
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o vendedor para atribuir à coluna <strong>Próxima</strong>{' '}
            de todos os <strong>{rowCount}</strong> clientes listados.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Vendedor:</label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedSellerId
                    ? sellers.find((s) => s.id.toString() === selectedSellerId)
                        ?.nome_completo
                    : 'Selecione um vendedor...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar vendedor..." />
                  <CommandList>
                    <CommandEmpty>Vendedor não encontrado.</CommandEmpty>
                    <CommandGroup>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.nome_completo}
                          onSelect={() => {
                            setSelectedSellerId(seller.id.toString())
                            setComboboxOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedSellerId === seller.id.toString()
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {seller.nome_completo}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedSellerId}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
