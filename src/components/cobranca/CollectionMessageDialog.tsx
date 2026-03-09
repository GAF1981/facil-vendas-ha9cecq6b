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
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'

interface CollectionMessageDialogProps {
  isOpen: boolean
  onClose: () => void
  data: any | null
}

export function CollectionMessageDialog({
  isOpen,
  onClose,
  data,
}: CollectionMessageDialogProps) {
  const [dataAcerto, setDataAcerto] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [valor, setValor] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (data && isOpen) {
      const formattedAcerto = data.orderDate
        ? safeFormatDate(data.orderDate, 'dd/MM/yyyy')
        : ''
      const formattedVencimento = data.vencimento
        ? format(parseISO(data.vencimento), 'dd/MM/yyyy')
        : ''
      const formattedValor = `R$ ${formatCurrency(data.debito)}`

      setDataAcerto(formattedAcerto)
      setVencimento(formattedVencimento)
      setValor(formattedValor)
      setFormaPagamento(data.formaPagamento || '')
    }
  }, [data, isOpen])

  useEffect(() => {
    setMensagem(
      `Olá, somos Fácil Livros, fizemos um acerto em ${dataAcerto}, no valor de ${valor}, com vencimento ${vencimento} o pagamento foi programado em ${formaPagamento}`,
    )
  }, [dataAcerto, vencimento, valor, formaPagamento])

  const handleSendWhatsApp = () => {
    if (data?.telefoneCobranca) {
      const cleanPhone = data.telefoneCobranca.replace(/\D/g, '')
      const text = encodeURIComponent(mensagem)
      window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank')
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data do Acerto</Label>
              <Input
                value={dataAcerto}
                onChange={(e) => setDataAcerto(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Input
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            disabled={!data?.telefoneCobranca}
          >
            Enviar WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
