import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt } from 'lucide-react'

interface AcertoFiscalSectionProps {
  clientNotaFiscal: string | null
  notaFiscalVenda: boolean
  onNotaFiscalVendaChange: (checked: boolean) => void
  disabled?: boolean
}

export function AcertoFiscalSection({
  clientNotaFiscal,
  notaFiscalVenda,
  onNotaFiscalVendaChange,
  disabled = false,
}: AcertoFiscalSectionProps) {
  return (
    <Card className="border-muted bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Emissão de Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col space-y-1 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <span className="text-sm text-muted-foreground font-medium">
              Nota Fiscal Cadastro
            </span>
            <span className="text-xl font-bold">
              {clientNotaFiscal || 'NÃO'}
            </span>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-white dark:bg-card rounded-lg border shadow-sm h-full">
            <Checkbox
              id="notaFiscalVenda"
              checked={notaFiscalVenda}
              onCheckedChange={(c) => onNotaFiscalVendaChange(c as boolean)}
              disabled={disabled}
              className="h-6 w-6"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="notaFiscalVenda"
                className="text-base font-medium cursor-pointer"
              >
                Nota Fiscal Venda
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque para emitir nota fiscal nesta venda.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
