import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    let dateToParse = dateString
    if (dateString && dateString.length === 10 && !dateString.includes('T')) {
      dateToParse = `${dateString}T12:00:00`
    }
    const date = new Date(dateToParse)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return dateString || '-'
  }
}

const safeFormatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { reportType, format } = body
    const isThermal = format === '80mm'
    const isDetailedOrder = reportType === 'detailed-order'

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    if (isDetailedOrder && !isThermal) {
      // A4 Portrait for Detailed Invoice (Nota Fiscal Model)
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 40, bottom: 40, left: 40, right: 40 }
      y = height - margins.top
    } else if (isThermal) {
      // Thermal 80mm
      const itemsCount = body.items ? body.items.length : 0
      const historyCount = body.history ? body.history.length : 0
      const installmentsCount = body.installments ? body.installments.length : 0
      const expensesCount = body.expenses ? body.expenses.length : 0
      const receiptsCount = body.receipts ? body.receipts.length : 0
      const detailedPaymentsCount = body.detailedPayments
        ? body.detailedPayments.length
        : 0

      // Calculate variable height dynamically
      let estimatedHeight = 500 // Base height

      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        estimatedHeight += receiptsCount * 20
        estimatedHeight += expensesCount * 30 // Expenses need more space for description
        estimatedHeight += 400 // summary sections
      } else {
        estimatedHeight += itemsCount * 80
        estimatedHeight += installmentsCount * 20
        estimatedHeight += detailedPaymentsCount * 20
        estimatedHeight += historyCount * 40
      }

      page = pdfDoc.addPage([226, Math.max(400, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // Default fallback
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 40, bottom: 40, left: 40, right: 40 }
      y = height - margins.top
    }

    const drawText = (
      text: string,
      x: number,
      yPos: number,
      options: {
        size?: number
        font?: any
        align?: 'left' | 'right' | 'center'
        color?: any
        rotate?: any
        maxWidth?: number
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
        rotate = undefined,
        maxWidth = undefined,
      } = options

      const finalFont = font
      const cleanText = removeAccents(text || '')
      let textToDraw = cleanText

      if (maxWidth) {
        const textWidth = finalFont.widthOfTextAtSize(cleanText, size)
        if (textWidth > maxWidth) {
          const avgCharWidth = textWidth / cleanText.length
          const maxChars = Math.floor(maxWidth / avgCharWidth)
          textToDraw = cleanText.substring(0, Math.max(0, maxChars - 3)) + '...'
        }
      }

      const textWidth = finalFont.widthOfTextAtSize(textToDraw, size)
      let xPos = x
      if (!rotate) {
        if (align === 'right') xPos = x - textWidth
        if (align === 'center') xPos = x - textWidth / 2
      }

      page.drawText(textToDraw, {
        x: xPos,
        y: yPos,
        size,
        font: finalFont,
        color,
        rotate,
      })
      return textWidth
    }

    const drawLine = (yPos: number, thickness = 1) => {
      page.drawLine({
        start: { x: margins.left, y: yPos },
        end: { x: width - margins.right, y: yPos },
        thickness,
        color: rgb(0, 0, 0),
      })
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        if (isDetailedOrder && !isThermal) {
          page = pdfDoc.addPage()
        } else if (isThermal) {
          page = pdfDoc.addPage([width, height])
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    // --- DETAILED ORDER (NOTA FISCAL MODEL - A4) ---
    if (isDetailedOrder && !isThermal) {
      const {
        client,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        employee,
      } = body

      const clientName =
        client?.['NOME CLIENTE'] || client?.['RAZÃO SOCIAL'] || 'Consumidor'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''} - ${client?.MUNICÍPIO || ''}`
      const clientDoc = client?.CNPJ || client?.CPF || ''
      const clientPhone = client?.['FONE 1'] || ''
      const formattedDate = safeFormatDate(date)

      // Header
      drawText('PEDIDO DE VENDA', width / 2, y, {
        size: 18,
        font: fontBold,
        align: 'center',
      })
      y -= 25
      drawText(`Nº ${orderNumber}`, width - margins.right, y + 25, {
        size: 12,
        font: fontBold,
        align: 'right',
      })

      // Company Info (Mocked for generic template, replace if company info available in body)
      drawText('FACIL VENDAS', margins.left, y, { size: 14, font: fontBold })
      y -= 15
      drawText('Sistema de Gestão Comercial', margins.left, y, { size: 10 })
      y -= 25
      drawLine(y)
      y -= 20

      // Client Info
      drawText('DADOS DO CLIENTE', margins.left, y, {
        size: 11,
        font: fontBold,
      })
      y -= 15
      drawText(`Cliente: ${clientName}`, margins.left, y, { size: 10 })
      drawText(`Data: ${formattedDate}`, width - margins.right, y, {
        size: 10,
        align: 'right',
      })
      y -= 15
      drawText(`Endereço: ${clientAddress}`, margins.left, y, { size: 10 })
      y -= 15
      drawText(`CPF/CNPJ: ${clientDoc}`, margins.left, y, { size: 10 })
      drawText(`Telefone: ${clientPhone}`, width / 2, y, { size: 10 })
      y -= 15
      if (employee) {
        drawText(`Vendedor: ${employee.nome_completo || ''}`, margins.left, y, {
          size: 10,
        })
      }
      y -= 20

      // Table Header
      const colX = {
        code: margins.left,
        desc: margins.left + 60,
        qty: width - 180,
        price: width - 110,
        total: width - margins.right,
      }

      drawLine(y)
      y -= 15
      drawText('CÓD', colX.code, y, { size: 9, font: fontBold })
      drawText('DESCRIÇÃO', colX.desc, y, { size: 9, font: fontBold })
      drawText('QTD', colX.qty, y, { size: 9, font: fontBold, align: 'right' })
      drawText('V. UNIT', colX.price, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      drawText('V. TOTAL', colX.total, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      y -= 8
      drawLine(y)
      y -= 15

      // Items
      for (const item of items) {
        checkPageBreak(20)
        // Ensure values are numbers
        const qty = Number(item.quantVendida || 0)
        const price = Number(item.precoUnitario || 0)
        const total = Number(item.valorVendido || 0)

        // Only show items with quantity > 0 for invoice
        if (qty > 0) {
          drawText(
            String(item.produtoCodigo || item.codigo || '-'),
            colX.code,
            y,
            { size: 9 },
          )
          drawText(
            (item.produtoNome || item.produto || '').substring(0, 45),
            colX.desc,
            y,
            { size: 9 },
          )
          drawText(String(qty), colX.qty, y, { size: 9, align: 'right' })
          drawText(formatCurrency(price), colX.price, y, {
            size: 9,
            align: 'right',
          })
          drawText(formatCurrency(total), colX.total, y, {
            size: 9,
            align: 'right',
          })
          y -= 15
        }
      }

      y -= 5
      drawLine(y)
      y -= 20

      // Totals
      checkPageBreak(100)
      const totalsX = width - 150
      const valueX = width - margins.right

      drawText('SUBTOTAL:', totalsX, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(totalVendido)}`, valueX, y, {
        size: 10,
        align: 'right',
      })
      y -= 15

      if (valorDesconto > 0) {
        drawText('DESCONTO:', totalsX, y, { size: 10, font: fontBold })
        drawText(`R$ ${formatCurrency(valorDesconto)}`, valueX, y, {
          size: 10,
          align: 'right',
        })
        y -= 15
      }

      drawText('TOTAL A PAGAR:', totalsX, y, { size: 12, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, valueX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
      })

      y -= 60
      drawLine(y)
      y -= 15
      drawText('ASSINATURA DO CLIENTE', width / 2, y, {
        size: 10,
        align: 'center',
      })
    }

    // --- ACERTO / THERMAL HISTORY (THERMAL 80MM) ---
    else if (
      isThermal &&
      (reportType === 'thermal-history' ||
        reportType === 'acerto' ||
        reportType === 'receipt') // Receipt uses same structure
    ) {
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        installments = [], // "Valores a pagar"
        detailedPayments = [], // "Valores pagos"
        history = [],
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''}`

      // Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText(`PEDIDO ${orderNumber}`, width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // Client Info
      const infoSize = 9
      drawText(`Cliente: ${clientCode} - ${clientName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
        maxWidth: width - 20,
      })
      y -= 12
      if (clientAddress.length > 5) {
        drawText(clientAddress.substring(0, 35), margins.left, y, {
          size: infoSize,
          maxWidth: width - 20,
        })
        y -= 12
      }
      drawText(clientCity, margins.left, y, { size: infoSize, font: fontBold })
      y -= 12

      const formattedDate = safeFormatDate(date)
      const formattedTime = safeFormatTime(date)
      drawText(`Data: ${formattedDate} ${formattedTime}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
      y -= 12
      drawText(`Vendedor: ${sellerName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
      y -= 15
      drawLine(y)
      y -= 15

      // Items Section
      if (items.length > 0) {
        drawText('ITENS DO PEDIDO', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const item of items) {
          checkPageBreak(60)
          drawText(`${item.produtoNome || item.produto}`, margins.left, y, {
            size: 9,
            font: fontBold,
            maxWidth: width - 70,
          })
          drawText(
            `R$ ${formatCurrency(item.precoUnitario || item.preco)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12

          // Minimal stats for thermal receipt clarity
          drawText(`Qtd: ${item.quantVendida}`, margins.left, y, { size: 9 })
          drawText(
            `Total: R$ ${formatCurrency(item.valorVendido)}`,
            width - margins.right,
            y,
            { size: 9, font: fontBold, align: 'right' },
          )
          y -= 15
        }
        drawLine(y)
        y -= 15
      }

      // Totals
      drawText('Total Vendido:', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(totalVendido)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
      })
      y -= 12
      if (valorDesconto > 0) {
        drawText('Desconto:', margins.left, y, { size: 9 })
        drawText(
          `R$ ${formatCurrency(valorDesconto)}`,
          width - margins.right,
          y,
          { size: 9, align: 'right' },
        )
        y -= 12
      }
      drawText('TOTAL A PAGAR:', margins.left, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // --- SECTION: VALORES PAGOS (PAYMENTS MADE) ---
      if (detailedPayments && detailedPayments.length > 0) {
        checkPageBreak(50)
        drawText('VALORES PAGOS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        let totalPaid = 0
        detailedPayments.forEach((p: any) => {
          checkPageBreak(20)
          const method = p.method || 'Pagamento'
          const val = Number(p.value || p.paidValue || 0)
          if (val > 0) {
            drawText(method, margins.left, y, { size: 9 })
            drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
              size: 9,
              align: 'right',
            })
            y -= 12
            totalPaid += val
          }
        })

        // Show remaining debt if applicable
        const remaining = Math.max(0, valorAcerto - totalPaid)
        if (remaining > 0.05) {
          y -= 5
          drawText('Restante (Débito):', margins.left, y, {
            size: 9,
            font: fontBold,
          })
          drawText(
            `R$ ${formatCurrency(remaining)}`,
            width - margins.right,
            y,
            { size: 9, font: fontBold, align: 'right', color: rgb(0.8, 0, 0) },
          )
          y -= 12
        }

        drawLine(y, 0.5)
        y -= 15
      }

      // --- SECTION: VALORES A PAGAR (INSTALLMENTS) ---
      if (installments && installments.length > 0) {
        checkPageBreak(60)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Header Row
        drawText('Vencimento', margins.left, y, { size: 8, font: fontBold })
        drawText('Forma', margins.left + 60, y, { size: 8, font: fontBold })
        drawText('Valor', width - margins.right, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 10

        installments.forEach((inst: any) => {
          checkPageBreak(20)
          const dateStr = safeFormatDate(inst.dueDate || inst.vencimento).split(
            ' ',
          )[0] // Just date
          const method = (
            inst.method ||
            inst.formaPagamento ||
            'Outros'
          ).substring(0, 10)
          const val = Number(inst.value || inst.valor || 0)

          drawText(dateStr, margins.left, y, { size: 8 })
          drawText(method, margins.left + 60, y, { size: 8 })
          drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
            size: 8,
            align: 'right',
          })
          y -= 12
        })

        drawLine(y, 0.5)
        y -= 15
      }

      // Signature
      checkPageBreak(60)
      y -= 30
      drawLine(y)
      y -= 15
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 25
    }

    // --- CASH CLOSURE (FECHAMENTO DE CAIXA) - Detailed ---
    else if (
      isThermal &&
      (reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary')
    ) {
      const { fechamento, receipts = [], expenses = [], date } = body
      const closingData = fechamento || body.data || {}
      const empName = closingData.funcionario?.nome_completo || 'Funcionario'

      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      const formattedDate = safeFormatDate(date)
      drawText(`Data: ${formattedDate}`, margins.left, y, { size: 9 })
      y -= 12
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 15
      drawLine(y)
      y -= 15

      // --- DETAILED ENTRIES (SUMMARIZED BY TYPE as per instruction "Detail all Entries... grouped") ---
      // The instruction says "detail all Entries... grouped by payment type", which usually means listing the totals per type.
      // But "detail" could imply listing each receipt. The model usually implies a summary table for entries.
      // However, given "Detail all Exits listing each record", let's be explicit with entries too if needed?
      // "grouped by payment type" strongly suggests SUMS.

      drawText('RESUMO DE ENTRADAS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      const drawEntryRow = (label: string, val: number) => {
        if (val > 0) {
          drawText(label, margins.left, y, { size: 9 })
          drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
            size: 9,
            align: 'right',
          })
          y -= 12
        }
      }

      drawEntryRow('Dinheiro:', closingData.valor_dinheiro || 0)
      drawEntryRow('Pix:', closingData.valor_pix || 0)
      drawEntryRow('Cheque:', closingData.valor_cheque || 0)
      drawEntryRow('Boleto:', closingData.valor_boleto || 0)

      y -= 5
      const totalEntrada =
        (closingData.valor_dinheiro || 0) +
        (closingData.valor_pix || 0) +
        (closingData.valor_cheque || 0) +
        (closingData.valor_boleto || 0)
      drawText('TOTAL ENTRADAS:', margins.left, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(totalEntrada)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // --- DETAILED EXITS (LISTING EACH RECORD) ---
      drawText('DETALHAMENTO DE SAIDAS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // Filter for actual cash exits
      const cashExpenses = expenses.filter((e: any) => e.saiuDoCaixa !== false)

      if (cashExpenses.length > 0) {
        cashExpenses.forEach((e: any) => {
          checkPageBreak(30)
          // Date | Desc | Value
          const dStr = safeFormatDate(e.data).split(' ')[0]
          const desc = (e.detalhamento || e.grupo || 'Despesa').substring(0, 20)

          drawText(`${dStr} - ${desc}`, margins.left, y, { size: 8 })
          y -= 10
          drawText(
            `R$ ${formatCurrency(Number(e.valor))}`,
            width - margins.right,
            y,
            { size: 8, align: 'right' },
          )
          y -= 12
        })
      } else {
        drawText('Nenhuma saída registrada.', margins.left, y, {
          size: 9,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 15
      }

      y -= 5
      drawText('TOTAL SAIDAS:', margins.left, y, { size: 10, font: fontBold })
      drawText(
        `R$ ${formatCurrency(closingData.valor_despesas || 0)}`,
        width - margins.right,
        y,
        { size: 10, font: fontBold, align: 'right' },
      )
      y -= 15
      drawLine(y)
      y -= 15

      // --- FINAL BALANCE ---
      drawText('SALDO FINAL', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText(
        `R$ ${formatCurrency(closingData.saldo_acerto || 0)}`,
        width / 2,
        y,
        { size: 16, font: fontBold, align: 'center' },
      )
      y -= 30

      drawText('Assinatura do Responsável', width / 2, y, {
        size: 9,
        align: 'center',
      })
    }

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, {
      headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
