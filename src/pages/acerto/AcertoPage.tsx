import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoTable } from '@/components/acerto/AcertoTable'
import { AcertoStockSummary } from '@/components/acerto/AcertoStockSummary'
import { AcertoSalesSummary } from '@/components/acerto/AcertoSalesSummary'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { AcertoFiscalSection } from '@/components/acerto/AcertoFiscalSection'
import { AcertoPrintOptions } from '@/components/acerto/AcertoPrintOptions'
import { SignatureModal } from '@/components/acerto/SignatureModal'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { ProductSelector } from '@/components/acerto/ProductSelector'
import { ZeroStockAlert } from '@/components/acerto/ZeroStockAlert'
import { KitSelectorDialog } from '@/components/acerto/KitSelectorDialog'
import { ClientDebtSelectorDialog } from '@/components/acerto/ClientDebtSelectorDialog'
import { PerformanceSummaryModal } from '@/components/acerto/PerformanceSummaryModal'
import { LocationCaptureModal } from '@/components/acerto/LocationCaptureModal'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { AcertoItem, PendingStockAdjustment } from '@/types/acerto'
import { PaymentEntry } from '@/types/payment'
import { ProductRow } from '@/types/product'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { acertoService } from '@/services/acertoService'
import { employeesService } from '@/services/employeesService'
import { inativarClientesService } from '@/services/inativarClientesService'
import { cobrancaService } from '@/services/cobrancaService'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
  Save,
  Printer,
  Loader2,
  Copy,
  ArrowRight,
  RefreshCw,
  Banknote,
  Edit3,
  Package,
  AlertCircle,
} from 'lucide-react'
import { parseCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { fechamentoService } from '@/services/fechamentoService'
import { rotaService } from '@/services/rotaService'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function AcertoPage() {
  const { employee: loggedInUser } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const mounted = useRef(true)
  const loadedClientIdRef = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const [showSummaryModal, setShowSummaryModal] = useState(
    () => !searchParams.get('editOrderId'),
  )

  const [client, setClient] = useState<ClientRow | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [items, setItems] = useState<AcertoItem[]>([])
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [notaFiscal, setNotaFiscal] = useState<string>('')
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [zeroStockDialogOpen, setZeroStockDialogOpen] = useState(false)
  const [isCaptacao, setIsCaptacao] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [isVendaMercadoria, setIsVendaMercadoria] = useState(false)

  const [hideContagem, setHideContagem] = useState(false)
  const [hideSaldoFinal, setHideSaldoFinal] = useState(false)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editOrderId, setEditOrderId] = useState<number | null>(null)
  const [originalOrderDate, setOriginalOrderDate] = useState<string | null>(
    null,
  )
  const [originalSessionId, setOriginalSessionId] = useState<number | null>(
    null,
  )

  const [pdfFormat, setPdfFormat] = useState<'A4' | '80mm'>('80mm')

  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingStockAdjustment[]
  >([])

  const [loadingAcerto, setLoadingAcerto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState(0)
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)

  useEffect(() => {
    employeesService
      .getEmployees(1, 100)
      .then(({ data }) => {
        if (mounted.current) {
          const activeEmployees = data.filter((e) => e.situacao === 'ATIVO')
          setEmployees(activeEmployees)
        }
      })
      .catch((err) => console.error('Failed to fetch employees', err))
  }, [])

  const canEditEmployee =
    loggedInUser &&
    (Array.isArray(loggedInUser.setor)
      ? loggedInUser.setor.some((s) => ['Administrador', 'Gerente'].includes(s))
      : ['Administrador', 'Gerente'].includes(loggedInUser.setor || ''))

  useEffect(() => {
    if (loggedInUser && mounted.current) {
      if (!selectedEmployeeId) {
        setSelectedEmployeeId(loggedInUser.id.toString())
      }
    }
  }, [loggedInUser, selectedEmployeeId])

  useEffect(() => {
    const eid = searchParams.get('editOrderId')
    const cid = searchParams.get('clientId')

    if (eid && !isEditMode && loggedInUser) {
      if (!canEditEmployee) {
        toast({
          title: 'Acesso Negado',
          description: 'Você não tem permissão para editar pedidos.',
          variant: 'destructive',
        })
        navigate('/resumo-acertos')
        return
      }

      const oid = Number(eid)
      if (!isNaN(oid) && oid > 0) {
        setLoadingAcerto(true)
        setIsEditMode(true)
        setEditOrderId(oid)
        setNextOrderNumber(oid)

        bancoDeDadosService
          .getEditableOrderDetails(oid)
          .then(async (details) => {
            if (details && mounted.current) {
              const clientData = await clientsService.getById(details.clientId)
              if (!mounted.current) return

              loadedClientIdRef.current = clientData.CODIGO
              setItems(details.items)
              setPayments(details.payments)
              setSelectedEmployeeId(details.employeeId.toString())
              setNotaFiscal(details.nfVenda)
              setOriginalOrderDate(details.originalDate)
              setOriginalSessionId(details.sessionId)
              setClient(clientData)

              bancoDeDadosService
                .getMonthlyAverage(details.clientId)
                .then((avg) => mounted.current && setMonthlyAverage(avg))

              bancoDeDadosService
                .checkClientHasOrders(details.clientId, oid)
                .then((hasOrders) => {
                  if (mounted.current) setIsCaptacao(!hasOrders)
                })

              toast({
                title: 'Modo de Edição',
                description: `Carregado pedido #${oid} para edição.`,
              })
            } else if (mounted.current) {
              toast({
                title: 'Erro',
                description: 'Pedido não encontrado.',
                variant: 'destructive',
              })
            }
          })
          .catch((e) => {
            console.error(e)
            if (mounted.current) {
              toast({
                title: 'Erro',
                description: 'Erro ao carregar pedido.',
                variant: 'destructive',
              })
            }
          })
          .finally(() => {
            if (mounted.current) setLoadingAcerto(false)
          })
      }
    } else if (cid && !client && !isEditMode) {
      const clientIdNum = Number(cid)
      if (!isNaN(clientIdNum) && clientIdNum > 0) {
        setLoadingAcerto(true)
        clientsService
          .getById(clientIdNum)
          .then((data) => {
            if (data && mounted.current) {
              setClient(data)
              toast({
                title: 'Cliente Selecionado',
                description: `Carregando dados para ${data['NOME CLIENTE']}.`,
              })
            }
          })
          .catch((err) => {
            console.error('Failed to load client from URL', err)
            if (mounted.current) {
              toast({
                title: 'Erro',
                description: 'Não foi possível carregar o cliente indicado.',
                variant: 'destructive',
              })
            }
          })
          .finally(() => {
            if (mounted.current) setLoadingAcerto(false)
          })
      }
    }
  }, [
    searchParams,
    isEditMode,
    loggedInUser,
    canEditEmployee,
    client,
    navigate,
    toast,
  ])

  useEffect(() => {
    if (client) {
      if (loadedClientIdRef.current === client.CODIGO) {
        return
      }

      loadedClientIdRef.current = client.CODIGO

      if (isEditMode) {
        return
      }

      setLoadingAcerto(true)

      bancoDeDadosService
        .checkClientHasOrders(client.CODIGO)
        .then((hasOrders) => {
          if (mounted.current) setIsCaptacao(!hasOrders)
        })
        .catch((e) => console.error('History check error', e))

      bancoDeDadosService
        .getLastAcerto(client.CODIGO)
        .then((data) => {
          if (mounted.current) setLastAcerto(data)
        })
        .catch((e) => console.error('Last Acerto error', e))

      acertoService
        .getInitialItemsForClient(client.CODIGO)
        .then((newItems) => {
          if (mounted.current) {
            setItems(newItems)
            setPendingAdjustments([])
          }
        })
        .catch((err) => {
          console.error(err)
          if (mounted.current) {
            toast({
              title: 'Erro ao carregar dados',
              description: 'Falha ao buscar estoque atual do cliente.',
              variant: 'destructive',
            })
          }
        })
        .finally(() => {
          if (mounted.current) setLoadingAcerto(false)
        })

      bancoDeDadosService
        .getMonthlyAverage(client.CODIGO)
        .then((avg) => mounted.current && setMonthlyAverage(avg))
        .catch((e) => console.error('Avg error', e))

      bancoDeDadosService
        .getNextNumeroPedido()
        .then((num) => mounted.current && setNextOrderNumber(num))
        .catch((e) => console.error('Next order error', e))

      if (client['NOTA FISCAL'] === 'NÃO' || client['NOTA FISCAL'] === '0') {
        setNotaFiscal('NÃO')
      } else {
        setNotaFiscal('')
      }

      if (client.tipo_venda === 'venda de mercadorias') {
        setIsVendaMercadoria(true)
      } else {
        setIsVendaMercadoria(false)
      }
    } else {
      setItems([])
      setLastAcerto(null)
      setMonthlyAverage(0)
      setNextOrderNumber(null)
      setPayments([])
      setSignature(null)
      setNotaFiscal('')
      setPendingAdjustments([])
      setIsCaptacao(false)
      setIsEditMode(false)
      setEditOrderId(null)
      setOriginalOrderDate(null)
      setOriginalSessionId(null)
      setIsVendaMercadoria(false)
      loadedClientIdRef.current = null
    }
  }, [client, isEditMode, toast])

  const totalSalesValue = items.reduce(
    (acc, item) => acc + item.valorVendido,
    0,
  )

  const discountStr = client?.Desconto || '0'
  const discountVal = parseCurrency(discountStr.replace('%', ''))
  const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal
  const discountAmount = totalSalesValue * discountFactor
  const amountToPay = totalSalesValue - discountAmount

  const handleUpdateContagem = (uid: string, newContagem: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uid === uid) {
          const quantVendida = item.saldoInicial - newContagem
          const valorVendido = quantVendida * item.precoUnitario
          return {
            ...item,
            contagem: newContagem,
            quantVendida,
            valorVendido,
          }
        }
        return item
      }),
    )
  }

  const handleUpdateSaldoFinal = (uid: string, newSaldo: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.uid === uid ? { ...item, saldoFinal: newSaldo } : item,
      ),
    )
  }

  const handleUpdateSaldoInicial = (uid: string, newSaldo: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uid === uid) {
          const quantVendida = newSaldo - item.contagem
          const valorVendido = quantVendida * item.precoUnitario
          return {
            ...item,
            saldoInicial: newSaldo,
            quantVendida,
            valorVendido,
          }
        }
        return item
      }),
    )
  }

  const handleQueueAdjustment = (adjustment: PendingStockAdjustment) => {
    const safeAdjustment = {
      ...adjustment,
      data_acerto: adjustment.data_acerto || new Date().toISOString(),
    }
    setPendingAdjustments((prev) => [...prev, safeAdjustment])
  }

  const handleRemoveItem = (uid: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.uid !== uid))
  }

  const handleClientSelect = (c: ClientRow) => {
    setClient(c)
  }

  const handleAddProducts = (newProducts: ProductRow[]) => {
    const newItems: AcertoItem[] = newProducts.map((p) => ({
      uid: Math.random().toString(36).substr(2, 9),
      produtoId: p.ID,
      produtoCodigo: p.CODIGO,
      produtoNome: p.PRODUTO || 'Sem nome',
      tipo: p.TIPO,
      precoUnitario: parseCurrency(p.PREÇO),
      saldoInicial: 0,
      contagem: 0,
      quantVendida: 0,
      valorVendido: 0,
      saldoFinal: 0,
      idVendaItens: null,
    }))

    setItems((prev) => {
      const combined = [...prev, ...newItems]
      return combined.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome))
    })

    toast({
      title: 'Produtos Adicionados',
      description: `${newProducts.length} produto(s) incluído(s) na lista.`,
    })
  }

  const handleAddKit = (kitItems: AcertoItem[]) => {
    setItems((prev) => {
      const combined = [...prev, ...kitItems]
      return combined.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome))
    })
  }

  const handleRepeatCount = () => {
    if (items.length === 0) return
    if (
      confirm(
        'Tem certeza que deseja copiar a CONTAGEM para o SALDO FINAL de todos os itens?',
      )
    ) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          saldoFinal: item.contagem,
        })),
      )
      toast({
        title: 'Atualizado',
        description: 'Saldo Final atualizado com valores da Contagem.',
      })
    }
  }

  const handleRepeatInitialToCount = () => {
    if (items.length === 0) return
    if (
      confirm(
        'Tem certeza que deseja copiar o SALDO INICIAL para a CONTAGEM de todos os itens? Isso zerará as vendas calculadas se não houverem ajustes.',
      )
    ) {
      setItems((prev) =>
        prev.map((item) => {
          const newContagem = item.saldoInicial
          const quantVendida = item.saldoInicial - newContagem
          const valorVendido = quantVendida * item.precoUnitario
          return {
            ...item,
            contagem: newContagem,
            quantVendida,
            valorVendido,
          }
        }),
      )
      toast({
        title: 'Atualizado',
        description: 'Contagem atualizada com valores do Saldo Inicial.',
      })
    }
  }

  const handleRepeatInitialToFinal = () => {
    if (items.length === 0) return
    if (
      confirm(
        'Tem certeza que deseja copiar o SALDO INICIAL para o SALDO FINAL de todos os itens?',
      )
    ) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          saldoFinal: item.saldoInicial,
        })),
      )
      toast({
        title: 'Atualizado',
        description: 'Saldo Final atualizado com valores do Saldo Inicial.',
      })
    }
  }

  const handleGeneratePreview = async () => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) return

    setGeneratingPdf(true)
    try {
      const historyRaw = await bancoDeDadosService.getHistoryForPdf(
        client.CODIGO,
      )
      const history = historyRaw.filter((h: any) => !h.isAjuste)

      const detailedPayments = payments
        .filter((p) => p.paidValue > 0)
        .flatMap((p) => {
          if (p.details && p.details.length > 0) {
            return p.details
              .filter((d) => d.paidValue > 0)
              .map((d) => ({
                method: p.method,
                value: d.paidValue,
                paidValue: d.paidValue,
                employee: loggedInUser?.nome_completo || 'N/D',
                date: new Date().toISOString(),
              }))
          }
          return [
            {
              method: p.method,
              value: p.paidValue,
              paidValue: p.paidValue,
              employee: loggedInUser?.nome_completo || 'N/D',
              date: new Date().toISOString(),
            },
          ]
        })

      const pendingInstallments = payments
        .filter((p) => p.value > p.paidValue)
        .flatMap((p) => {
          if (p.details && p.details.length > 0) {
            return p.details
              .filter((d) => d.value > d.paidValue)
              .map((d) => ({
                method: p.method,
                value: d.value,
                dueDate: d.dueDate,
              }))
          }
          return [
            {
              method: p.method,
              value: p.value - p.paidValue,
              dueDate: p.dueDate,
            },
          ]
        })

      const totalItemsSold = items.reduce(
        (acc, i) => acc + (i.quantVendida > 0 ? 1 : 0),
        0,
      )
      const totalQuantitySold = items.reduce(
        (acc, i) => acc + i.quantVendida,
        0,
      )

      const sortedItemsForPdf = [...items].sort((a, b) =>
        a.produtoNome.localeCompare(b.produtoNome),
      )

      const previewHistoryEntry = {
        id: nextOrderNumber || 0,
        data: new Date().toISOString(),
        vendedor: loggedInUser?.nome_completo || 'N/D',
        valorVendaTotal: totalSalesValue,
        saldoAPagar: amountToPay,
        valorPago: payments.reduce((acc, p) => acc + p.paidValue, 0),
        debito: Math.max(
          0,
          amountToPay - payments.reduce((acc, p) => acc + p.paidValue, 0),
        ),
        mediaMensal: monthlyAverage,
        desconto: discountAmount,
      }
      const combinedHistory = [previewHistoryEntry, ...history].slice(0, 10)

      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items: sortedItemsForPdf,
          date: new Date().toISOString(),
          acertoTipo: isCaptacao ? 'Captação' : 'Acerto',
          totalVendido: totalSalesValue,
          valorDesconto: discountAmount,
          valorAcerto: amountToPay,
          valorPago: payments.reduce((acc, p) => acc + p.paidValue, 0),
          debito: Math.max(
            0,
            amountToPay - payments.reduce((acc, p) => acc + p.paidValue, 0),
          ),
          payments,
          detailedPayments,
          pendingInstallments,
          installments: pendingInstallments,
          monthlyAverage,
          orderNumber: nextOrderNumber,
          issuerName: loggedInUser?.nome_completo,
          history: combinedHistory,
          totalItemsSold,
          totalQuantitySold,
        },
        { preview: true, signature, format: pdfFormat },
      )

      const url = window.URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
    } catch (err: any) {
      console.error('Preview Error:', err)
      if (mounted.current) {
        toast({
          title: 'Erro no PDF',
          description: 'Não foi possível gerar a prévia.',
          variant: 'destructive',
        })
      }
    } finally {
      if (mounted.current) setGeneratingPdf(false)
    }
  }

  const handleOpenSignature = () => {
    if (!client) return
    if (client.latitude != null && client.longitude != null) {
      setSignatureOpen(true)
    } else {
      setLocationModalOpen(true)
    }
  }

  const handleLocationSuccess = (lat: number, lon: number) => {
    if (client) {
      setClient({ ...client, latitude: lat, longitude: lon })
    }
    setLocationModalOpen(false)
    setTimeout(() => {
      if (mounted.current) setSignatureOpen(true)
    }, 300)
  }

  const handleForceSignature = () => {
    setLocationModalOpen(false)
    setTimeout(() => {
      if (mounted.current) setSignatureOpen(true)
    }, 300)
  }

  const handlePreSaveValidation = async () => {
    setHideContagem(false)
    setHideSaldoFinal(false)

    if (!client) return

    if (client['TIPO DE CLIENTE'] !== 'ATIVO') {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Não é possível realizar Acerto em um cliente Inativo! Favor ATIVAR o cliente no cadastro!',
        variant: 'destructive',
      })
      return
    }

    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) {
      toast({
        title: 'Funcionário obrigatório',
        description: 'Selecione um funcionário responsável.',
        variant: 'destructive',
      })
      return
    }

    try {
      const activeRota = await rotaService.getActiveRota()
      if (activeRota) {
        const closureStatus = await fechamentoService.getClosureStatus(
          activeRota.id,
          emp.id,
        )
        if (closureStatus === 'Aberto' || closureStatus === 'Fechado') {
          toast({
            title: 'Ação Bloqueada',
            description:
              'Ações bloqueadas: o caixa para esta rota está fechado ou em processo de fechamento.',
            variant: 'destructive',
          })
          return
        }
      }
    } catch (error) {
      console.error('Error checking closure status:', error)
    }

    if (!notaFiscal) {
      toast({
        title: 'Nota Fiscal Obrigatória',
        description:
          'Por favor, selecione SIM ou NÃO para a Nota Fiscal Venda.',
        variant: 'destructive',
      })
      return
    }

    const totalPaid = payments.reduce((acc, p) => acc + p.paidValue, 0)
    const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)

    if (isCaptacao && totalPaid !== 0) {
      toast({
        title: 'Erro de Validação',
        description:
          'Para finalizar é necessário que o total selecionado de pagamento seja igual a 0',
        variant: 'destructive',
      })
      return
    }

    if (!isCaptacao) {
      if (Math.abs(totalRegistered - amountToPay) > 0.01) {
        toast({
          title: 'Erro de Validação',
          description:
            'O Total Selecionado deve ser igual ao total do saldo a pagar.',
          variant: 'destructive',
        })
        return
      }
    }

    if (totalPaid > amountToPay + 0.01) {
      toast({
        title: 'Erro Financeiro',
        description: `O valor pago (R$ ${totalPaid.toFixed(2)}) não pode ser maior que o saldo a pagar (R$ ${amountToPay.toFixed(2)}).`,
        variant: 'destructive',
      })
      return
    }

    if (payments.length === 0 && amountToPay > 0.01 && !isCaptacao) {
      toast({
        title: 'Pagamento Obrigatório',
        description:
          'Selecione pelo menos uma forma de pagamento para finalizar.',
        variant: 'destructive',
      })
      return
    }

    if (!signature) {
      toast({
        title: 'Assinatura necessária',
        description: 'A assinatura do cliente é obrigatória.',
        variant: 'destructive',
      })
      handleOpenSignature()
      return
    }

    const totalStock = items.reduce(
      (acc, item) => acc + (item.saldoFinal || 0),
      0,
    )

    if (isVendaMercadoria) {
      if (totalStock > 0) {
        toast({
          title: 'Erro de Validação',
          description:
            'Venda de Mercadorias. O saldo final deverá ser igual a 0!!!',
          variant: 'destructive',
        })
        return
      }

      executeSave(false)
      return
    }

    if (totalStock === 0) {
      setZeroStockDialogOpen(true)
    } else {
      executeSave()
    }
  }

  const handleZeroStockConfirm = () => {
    setZeroStockDialogOpen(false)
    executeSave(true)
  }

  const executeSave = async (flagInactivation: boolean = false) => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) return

    setSaving(true)
    try {
      const now = new Date()

      let finalOrderNumber: number
      const orderDate =
        isEditMode && originalOrderDate ? new Date(originalOrderDate) : now

      if (isEditMode && editOrderId) {
        if (!canEditEmployee) {
          toast({
            title: 'Acesso Negado',
            description: 'Você não tem permissão para editar pedidos.',
            variant: 'destructive',
          })
          if (mounted.current) setSaving(false)
          return
        }

        finalOrderNumber = await bancoDeDadosService.editTransaction(
          client,
          emp,
          items,
          orderDate,
          isCaptacao ? 'Captação' : 'Acerto',
          payments,
          notaFiscal,
          editOrderId,
          originalSessionId,
        )
      } else {
        finalOrderNumber = await bancoDeDadosService.saveTransaction(
          client,
          emp,
          items,
          now,
          isCaptacao ? 'Captação' : 'Acerto',
          payments,
          notaFiscal,
        )
      }

      if (pendingAdjustments.length > 0) {
        for (const adj of pendingAdjustments) {
          try {
            await bancoDeDadosService.logInitialBalanceAdjustment({
              ...adj,
              numero_pedido: finalOrderNumber,
              data_acerto: adj.data_acerto || now.toISOString(),
            })
          } catch (logError) {
            console.error('Failed to log adjustment', adj, logError)
          }
        }
      }

      if (flagInactivation && !isVendaMercadoria) {
        const valorPagoTotal = payments.reduce((acc, p) => acc + p.paidValue, 0)
        let totalDebt = 0
        try {
          totalDebt = await cobrancaService.getClientDebtSummary(client.CODIGO)
        } catch (e) {
          console.error('Error fetching total debt for inactivation:', e)
          totalDebt = Math.max(0, amountToPay - valorPagoTotal)
        }

        await inativarClientesService.create({
          pedido_id: finalOrderNumber,
          funcionario_nome: emp.nome_completo,
          cliente_codigo: client.CODIGO,
          cliente_nome: client['NOME CLIENTE'],
          valor_venda: totalSalesValue,
          saldo_a_pagar: amountToPay,
          valor_pago: valorPagoTotal,
          debito: totalDebt,
        })
      }

      const historyRaw = await bancoDeDadosService.getHistoryForPdf(
        client.CODIGO,
      )
      const filteredHistory = historyRaw
        .filter((h: any) => !h.isAjuste)
        .slice(0, 10)

      const detailedPayments = payments
        .filter((p) => p.paidValue > 0)
        .flatMap((p) => {
          if (p.details && p.details.length > 0) {
            return p.details
              .filter((d) => d.paidValue > 0)
              .map((d) => ({
                method: p.method,
                value: d.paidValue,
                paidValue: d.paidValue,
                employee: loggedInUser?.nome_completo || 'N/D',
                date: now.toISOString(),
              }))
          }
          return [
            {
              method: p.method,
              value: p.paidValue,
              paidValue: p.paidValue,
              employee: loggedInUser?.nome_completo || 'N/D',
              date: now.toISOString(),
            },
          ]
        })

      const pendingInstallments = payments
        .filter((p) => p.value > p.paidValue)
        .flatMap((p) => {
          if (p.details && p.details.length > 0) {
            return p.details
              .filter((d) => d.value > d.paidValue)
              .map((d) => ({
                method: p.method,
                value: d.value,
                dueDate: d.dueDate,
              }))
          }
          return [
            {
              method: p.method,
              value: p.value - p.paidValue,
              dueDate: p.dueDate,
            },
          ]
        })

      const totalItemsSold = items.reduce(
        (acc, i) => acc + (i.quantVendida > 0 ? 1 : 0),
        0,
      )
      const totalQuantitySold = items.reduce(
        (acc, i) => acc + i.quantVendida,
        0,
      )

      const sortedItemsForPdf = [...items].sort((a, b) =>
        a.produtoNome.localeCompare(b.produtoNome),
      )

      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items: sortedItemsForPdf,
          date: orderDate.toISOString(),
          acertoTipo: isCaptacao ? 'Captação' : 'Acerto',
          totalVendido: totalSalesValue,
          valorDesconto: discountAmount,
          valorAcerto: amountToPay,
          valorPago: payments.reduce((acc, p) => acc + p.paidValue, 0),
          debito: Math.max(
            0,
            amountToPay - payments.reduce((acc, p) => acc + p.paidValue, 0),
          ),
          payments,
          detailedPayments,
          pendingInstallments,
          installments: pendingInstallments,
          monthlyAverage,
          orderNumber: finalOrderNumber,
          issuerName: loggedInUser?.nome_completo,
          history: filteredHistory,
          totalItemsSold,
          totalQuantitySold,
        },
        { preview: false, signature, format: pdfFormat },
      )

      const url = window.URL.createObjectURL(pdfBlob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${client['NOME CLIENTE']} - ${client.CODIGO} - ${finalOrderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => {
        window.open(url, '_blank')
      }, 100)

      if (mounted.current) {
        toast({
          title: isCaptacao
            ? 'Captação Realizada'
            : isEditMode
              ? `Pedido #${finalOrderNumber} Atualizado`
              : 'Acerto Realizado',
          description: isEditMode
            ? 'O pedido foi atualizado e o PDF gerado com sucesso.'
            : 'Pedido salvo e PDF gerado com sucesso.',
          className: 'bg-green-600 text-white',
        })

        setClient(null)
        setPendingAdjustments([])

        const wasEditMode = isEditMode

        setIsEditMode(false)
        setEditOrderId(null)
        setOriginalOrderDate(null)
        setOriginalSessionId(null)
        setIsVendaMercadoria(false)
        loadedClientIdRef.current = null

        if (flagInactivation && !isVendaMercadoria) {
          navigate('/inativar-clientes')
        } else if (wasEditMode) {
          setTimeout(() => {
            if (mounted.current) navigate('/resumo-acertos')
          }, 1000)
        }
      }
    } catch (err: any) {
      console.error('Acerto Save Error:', err)
      let errorMessage = 'Falha ao processar o acerto.'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        errorMessage =
          err.message || err.details || err.hint || JSON.stringify(err)
      } else if (typeof err === 'string') {
        errorMessage = err
      }

      if (mounted.current) {
        toast({
          title: 'Erro ao salvar',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-24 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realizar Acerto</h1>
          <p className="text-muted-foreground">
            Lançamento de conferência e vendas da rota.
          </p>
        </div>
        <div className="w-full sm:w-[300px]">
          <Label className="text-xs mb-1 block">Funcionário Responsável</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={!canEditEmployee}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSearch
            onSelect={handleClientSelect}
            disabled={saving || isEditMode}
          />
        </CardContent>
      </Card>

      {client && (
        <div className="space-y-6 animate-fade-in-up">
          {isEditMode && editOrderId && (
            <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-r shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Edit3 className="h-6 w-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">
                  Editando Pedido #{editOrderId}
                </h3>
                <p className="text-sm opacity-90">
                  Ao finalizar, os dados anteriores deste pedido serão
                  substituídos pelas informações atuais na base de dados.
                </p>
              </div>
            </div>
          )}

          <ClientDetails
            client={client}
            lastAcerto={lastAcerto}
            loading={loadingAcerto}
          />

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border p-2 rounded-md bg-card w-full xl:w-auto">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-contagem"
                  checked={hideContagem}
                  onCheckedChange={setHideContagem}
                />
                <Label htmlFor="hide-contagem" className="cursor-pointer">
                  ocultar contagem
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-saldo-final"
                  checked={hideSaldoFinal}
                  onCheckedChange={setHideSaldoFinal}
                />
                <Label htmlFor="hide-saldo-final" className="cursor-pointer">
                  ocultar saldo final
                </Label>
              </div>
            </div>

            <div className="flex justify-start xl:justify-end gap-2 flex-wrap flex-1 w-full">
              <Button
                variant={isVendaMercadoria ? 'default' : 'outline'}
                onClick={() => setIsVendaMercadoria(!isVendaMercadoria)}
                className={cn(
                  isVendaMercadoria &&
                    'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
                )}
                title="Venda de todo o estoque"
              >
                <Package className="mr-2 h-4 w-4" />
                Venda de Mercadoria
              </Button>
              <Button
                variant="outline"
                onClick={handleRepeatInitialToCount}
                title="Copiar Saldo Inicial para Contagem em todos os itens"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Repetir Saldo Inicial na Contagem
              </Button>
              <Button
                variant="outline"
                onClick={handleRepeatInitialToFinal}
                title="Copiar Saldo Inicial para Saldo Final em todos os itens"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Repetir Saldo Inicial no Saldo Final
              </Button>
              <Button
                variant="outline"
                onClick={handleRepeatCount}
                title="Copiar Contagem para Saldo Final em todos os itens"
              >
                <Copy className="mr-2 h-4 w-4" />
                Repetir Contagem
              </Button>
              <KitSelectorDialog onSelect={handleAddKit} />
              <ProductSelector onSelect={handleAddProducts} />
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => setCollectionDialogOpen(true)}
                title="Registrar Ação de Cobrança para este cliente"
              >
                <Banknote className="mr-2 h-4 w-4" />
                Registrar Ação de Cobrança
              </Button>
            </div>
          </div>

          {isVendaMercadoria && (
            <Alert className="bg-amber-50 border-amber-200 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-bold">
                venda de mercadoria
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                Modo de venda de estoque completo ativado. O saldo final de
                todos os produtos deve ser zero.
              </AlertDescription>
            </Alert>
          )}

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            onUpdateSaldoInicial={handleUpdateSaldoInicial}
            onQueueAdjustment={handleQueueAdjustment}
            loading={loadingAcerto}
            mode={isCaptacao ? 'CAPTACAO' : 'ACERTO'}
            acertoTipo={isCaptacao ? 'Captação' : 'Acerto'}
            clientId={client.CODIGO}
            clientName={client['NOME CLIENTE'] || 'Desconhecido'}
            orderNumber={nextOrderNumber}
            isCaptacao={isCaptacao}
            hideContagem={hideContagem}
            hideSaldoFinal={hideSaldoFinal}
          />

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AcertoStockSummary items={items} />
              <AcertoSalesSummary items={items} client={client} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AcertoPaymentSummary
                  saldoAPagar={amountToPay}
                  payments={payments}
                  onPaymentsChange={setPayments}
                  disabled={saving || isCaptacao}
                />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-6">
                <AcertoFiscalSection
                  clientNotaFiscal={client['NOTA FISCAL']}
                  notaFiscalVenda={notaFiscal}
                  onNotaFiscalVendaChange={setNotaFiscal}
                  disabled={saving}
                />
                <AcertoPrintOptions
                  format={pdfFormat}
                  onFormatChange={setPdfFormat}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleOpenSignature}
              className={signature ? 'border-green-500 text-green-600' : ''}
            >
              {signature ? 'Assinatura Capturada' : 'Coletar Assinatura'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleGeneratePreview}
              disabled={generatingPdf || saving}
            >
              {generatingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Pré-visualizar PDF
            </Button>

            <div
              onClickCapture={(e) => {
                if (
                  isVendaMercadoria &&
                  items.some((i) => (i.saldoFinal || 0) > 0)
                ) {
                  e.stopPropagation()
                  e.preventDefault()
                  toast({
                    title: 'Erro de Validação',
                    description:
                      'Venda de Mercadorias. O saldo final deverá ser igual a 0!!!',
                    variant: 'destructive',
                  })
                }
              }}
            >
              <Button
                size="lg"
                onClick={handlePreSaveValidation}
                disabled={
                  saving ||
                  items.length === 0 ||
                  (isVendaMercadoria &&
                    items.some((i) => (i.saldoFinal || 0) > 0))
                }
                className={cn(
                  'min-w-[200px]',
                  isVendaMercadoria &&
                    items.some((i) => (i.saldoFinal || 0) > 0) &&
                    'opacity-50 cursor-not-allowed',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isCaptacao
                      ? 'Finalizar Captação'
                      : isEditMode
                        ? 'Salvar Alterações'
                        : 'Finalizar Acerto'}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="pt-8">
            <h3 className="text-lg font-semibold mb-4">Histórico Recente</h3>
            <AcertoHistoryTable
              clientId={client.CODIGO}
              monthlyAverage={monthlyAverage}
            />
          </div>
        </div>
      )}

      <SignatureModal
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSave={setSignature}
      />

      {client && (
        <LocationCaptureModal
          open={locationModalOpen}
          onOpenChange={setLocationModalOpen}
          client={client}
          onSuccess={handleLocationSuccess}
          onForceSignature={handleForceSignature}
        />
      )}

      <ZeroStockAlert
        open={zeroStockDialogOpen}
        onOpenChange={setZeroStockDialogOpen}
        onConfirm={handleZeroStockConfirm}
        onCancel={() => setZeroStockDialogOpen(false)}
      />

      {client && (
        <ClientDebtSelectorDialog
          open={collectionDialogOpen}
          onOpenChange={setCollectionDialogOpen}
          clientId={client.CODIGO}
          clientName={client['NOME CLIENTE'] || ''}
        />
      )}

      {showSummaryModal && (
        <PerformanceSummaryModal onClose={() => setShowSummaryModal(false)} />
      )}
    </div>
  )
}
