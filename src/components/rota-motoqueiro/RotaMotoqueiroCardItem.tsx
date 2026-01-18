import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  History,
  PlusCircle,
  Calendar,
  MessageCircle,
  MapPin,
  DollarSign,
  Printer,
  Phone,
  Mail,
  Info,
} from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { cobrancaService } from '@/services/cobrancaService'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { EditContactDialog } from './EditContactDialog'

interface RotaMotoqueiroItem {
  clientId: number
  clientName: string
  orderId: number
  vencimento: string | null
  valorParc: number
  pago: number
  debito: number
  dataCombinada: string | null
  status: string
  address: string | null
  neighborhood: string | null
  city: string | null
  phone: string | null
  telefone_cobranca?: string | null
  email_cobranca?: string | null
  clientStatus?: string | null
  motivo?: string | null
}

interface RotaMotoqueiroCardItemProps {
  item: RotaMotoqueiroItem
  onConsult: () => void
  onRegisterAction: () => void
  onRegisterReceipt: () => void
}

export function RotaMotoqueiroCardItem({
  item,
  onConsult,
  onRegisterAction,
  onRegisterReceipt,
}: RotaMotoqueiroCardItemProps) {
  const isOverdue = item.status === 'VENCIDO'
  const isPaid = item.status === 'PAGO'
  const { toast } = useToast()
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Edit Dialog States
  const [editPhoneOpen, setEditPhoneOpen] = useState(false)
  const [editEmailOpen, setEditEmailOpen] = useState(false)

  const handleWhatsApp = () => {
    const phoneToUse = item.telefone_cobranca || item.phone
    if (!phoneToUse) return
    const cleanPhone = phoneToUse.replace(/\D/g, '')
    const url = `https://wa.me/55${cleanPhone}`
    window.open(url, '_blank')
  }

  const handleGenerateOrderPdf = async () => {
    setGeneratingPdf(true)
    try {
      const blob = await cobrancaService.generateOrderReceipt(item.orderId)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao gerar PDF do acerto.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-shadow hover:shadow-md border-l-4 flex flex-col h-full',
          isOverdue
            ? 'border-l-red-500'
            : isPaid
              ? 'border-l-green-500'
              : 'border-l-blue-500',
        )}
      >
        <CardHeader className="p-4 pb-2 bg-muted/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1 w-full pr-2">
              <CardTitle
                className="text-base line-clamp-1"
                title={item.clientName}
              >
                {item.clientName}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono font-normal">
                  {item.clientId}
                </Badge>
                <span>Pedido #{item.orderId}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Badge
                variant={
                  isOverdue ? 'destructive' : isPaid ? 'default' : 'outline'
                }
                className={cn(
                  'text-[10px] px-2 py-0.5 uppercase shrink-0',
                  isPaid && 'bg-green-100 text-green-800 hover:bg-green-200',
                  !isOverdue &&
                    !isPaid &&
                    'text-blue-600 border-blue-200 bg-blue-50',
                )}
              >
                {item.status}
              </Badge>
              {item.clientStatus && (
                <Badge variant="secondary" className="text-[9px]">
                  {item.clientStatus}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-3 flex-1">
          {/* Address Section */}
          <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-dashed flex gap-2 items-start">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="line-clamp-2">
              {item.address ? (
                <>
                  <span className="font-medium text-foreground">
                    {item.address}
                  </span>
                  <br />
                  {item.neighborhood}, {item.city}
                </>
              ) : (
                <span className="italic">Endereço não cadastrado</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Vencimento
              </span>
              <p className="font-medium">
                {item.vencimento
                  ? safeFormatDate(item.vencimento, 'dd/MM/yy')
                  : '-'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Comb.
              </span>
              <p className="font-medium text-blue-600">
                {item.dataCombinada
                  ? safeFormatDate(item.dataCombinada, 'dd/MM/yy')
                  : '-'}
              </p>
            </div>
          </div>

          {item.motivo && (
            <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800 flex gap-2 items-start">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block mb-0.5">Motivo:</span>
                {item.motivo}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Parcela</span>
              <p className="font-medium">{formatCurrency(item.valorParc)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Pago</span>
              <p className="font-medium text-green-600">
                {formatCurrency(item.pago)}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-xs text-muted-foreground">Débito</span>
              <p className="font-bold text-red-600">
                {formatCurrency(item.debito)}
              </p>
            </div>
          </div>

          {/* New Actions Row */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => setEditPhoneOpen(true)}
            >
              <Phone className="w-3 h-3 mr-1" />
              Tel. Cobrança
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => setEditEmailOpen(true)}
            >
              <Mail className="w-3 h-3 mr-1" />
              Email Cob.
            </Button>
          </div>
        </CardContent>
        <CardFooter className="p-3 bg-muted/20 flex flex-col gap-2">
          {item.telefone_cobranca && (
            <div className="w-full text-center text-[10px] text-muted-foreground font-medium mb-1">
              Telefone Cobrança: {item.telefone_cobranca}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800 h-8"
            onClick={handleWhatsApp}
            disabled={!item.phone && !item.telefone_cobranca}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>

          {item.email_cobranca && (
            <div className="w-full text-center text-[10px] text-muted-foreground mb-1">
              {item.email_cobranca}
            </div>
          )}

          <div className="flex w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 h-9"
              onClick={handleGenerateOrderPdf}
              disabled={generatingPdf}
              title="PDF do Acerto"
            >
              <Printer
                className={cn(
                  'w-4 h-4 text-gray-600',
                  generatingPdf && 'animate-spin',
                )}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-9 px-0"
              onClick={onConsult}
              title="Histórico"
            >
              <History className="w-4 h-4 mr-1.5" />
              Hist.
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700 px-0"
              onClick={onRegisterReceipt}
              title="Recebimento"
            >
              <DollarSign className="w-4 h-4 mr-1.5" />
              Rec.
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-9 bg-blue-600 hover:bg-blue-700 px-0"
              onClick={onRegisterAction}
              title="Ação"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Ação
            </Button>
          </div>
        </CardFooter>
      </Card>

      <EditContactDialog
        open={editPhoneOpen}
        onClose={() => setEditPhoneOpen(false)}
        clientId={item.clientId}
        clientName={item.clientName}
        initialValue={item.telefone_cobranca || item.phone || ''}
        type="phone"
        onSuccess={onConsult} // Re-using onConsult to trigger refresh if parent handles it, otherwise just updates DB
      />

      <EditContactDialog
        open={editEmailOpen}
        onClose={() => setEditEmailOpen(false)}
        clientId={item.clientId}
        clientName={item.clientName}
        initialValue={item.email_cobranca || ''}
        type="email"
        onSuccess={onConsult}
      />
    </>
  )
}
