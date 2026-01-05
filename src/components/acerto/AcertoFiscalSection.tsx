import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Receipt } from 'lucide-react'

interface AcertoFiscalSectionProps {
  clientNotaFiscal: string | null
  notaFiscalVenda: string
  onNotaFiscalVendaChange: (value: string) => void
  disabled?: boolean
}

export function AcertoFiscalSection({
  clientNotaFiscal,
  notaFiscalVenda,
  onNotaFiscalVendaChange,
  disabled = false,
}: AcertoFiscalSectionProps) {
  return (
    <Card className="border-muted bg-muted/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Emissão de Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col space-y-1 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <span className="text-sm text-muted-foreground font-medium">
              Nota Fiscal Cadastro
            </span>
            <span className="text-xl font-bold">
              {clientNotaFiscal || 'NÃO'}
            </span>
          </div>

          <div className="flex flex-col space-y-3 p-3 bg-white dark:bg-card rounded-lg border shadow-sm">
            <Label className="font-medium">
              Nota Fiscal Venda <span className="text-red-500">*</span>
            </Label>

            <RadioGroup
              value={notaFiscalVenda}
              onValueChange={onNotaFiscalVendaChange}
              disabled={disabled}
              className="flex flex-row space-x-4 pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SIM" id="nf-venda-sim" />
                <Label
                  htmlFor="nf-venda-sim"
                  className="cursor-pointer font-normal"
                >
                  SIM
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NÃO" id="nf-venda-nao" />
                <Label
                  htmlFor="nf-venda-nao"
                  className="cursor-pointer font-normal"
                >
                  NÃO
                </Label>
              </div>
            </RadioGroup>

            <p className="text-xs text-muted-foreground">
              Obrigatório para finalizar o acerto.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
