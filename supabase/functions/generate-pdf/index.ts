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
    // Fix: If date string is simple YYYY-MM-DD, append time to force it to noon UTC
    // This prevents timezone shift when converting to local time (Brazil is UTC-3)
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
    // If original string was date-only, we might not want to show time, or show 12:00
    // But usually this function is called when we expect a time component.
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

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    // Height Calculation Logic
    let estimatedHeight = 842 // Default A4 height
    if (isThermal) {
      if (reportType === 'closing-confirmation') {
        const expensesCount = body.expenses ? body.expenses.length : 0
        const receiptsCount = body.receipts ? body.receipts.length : 0
        estimatedHeight = 800 + expensesCount * 40 + receiptsCount * 40
      } else if (!reportType || reportType === 'acerto') {
        // Acerto Receipt logic
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        const paymentsCount = body.payments ? body.payments.length : 0
        // Calculate installments count
        let installmentsCount = 0
        if (body.payments) {
          body.payments.forEach((p: any) => {
            if (p.details) installmentsCount += p.details.length
            else installmentsCount += 1
          })
        }

        // Detailed Height Estimation based on layout
        const headerHeight = 250
        const itemHeight = 90 // 6 lines + spacing
        const totalsHeight = 80
        const paymentsHeight = 40 // per immediate payment
        const installmentsHeight = 30 // per installment
        const summaryHeight = 60
        const historyItemHeight = 130 // ~9 lines + spacing
        const footerHeight = 150

        estimatedHeight =
          headerHeight +
          itemsCount * itemHeight +
          totalsHeight +
          paymentsCount * paymentsHeight +
          installmentsCount * installmentsHeight +
          summaryHeight +
          historyCount * historyItemHeight +
          footerHeight +
          100 // buffer
      }

      page = pdfDoc.addPage([226, Math.max(842, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // A4 Format
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

      const finalFont = isThermal ? fontBold : font
      const finalColor = isThermal ? rgb(0, 0, 0) : color

      const cleanText = removeAccents(text || '')

      let textToDraw = cleanText
      // Simple truncation if maxWidth is provided
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
        color: finalColor,
        rotate,
      })
      return textWidth
    }

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: margins.left, y: yPos },
        end: { x: width - margins.right, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        if (isThermal) {
          // For thermal, we typically don't page break in a continuous roll logic if we estimated correctly,
          // but if we do, just add another page
          page = pdfDoc.addPage([width, height])
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    // --- REPORT TYPES LOGIC ---

    if (reportType === 'closing-confirmation') {
      // ... (Existing closing logic - preserved)
      const { fechamento, receipts, expenses, date } = body
      const closingData = fechamento || body.data

      if (!closingData) throw new Error('No closing data provided')

      const empName = closingData.funcionario?.nome_completo || 'N/D'

      drawText('FACIL VENDAS', width / 2, y, {
        size: isThermal ? 14 : 18,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: isThermal ? 12 : 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      drawText(
        `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
        margins.left,
        y,
        { size: 10 },
      )
      y -= 15
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText(`Rota ID: ${closingData.rota_id}`, margins.left, y, { size: 10 })
      y -= 20
      drawLine(y)
      y -= 20

      // ... (rest of closing logic - kept identical)
      const rows = [
        { l: 'Venda Total', v: closingData.venda_total },
        { l: 'Desconto Total', v: closingData.desconto_total },
        {
          l: 'Saldo do Acerto (Dívida)',
          v: closingData.valor_a_receber,
          bold: true,
          color: rgb(0, 0, 0.8),
        },
        { l: 'Dinheiro', v: closingData.valor_dinheiro },
        { l: 'Pix', v: closingData.valor_pix },
        { l: 'Cheque', v: closingData.valor_cheque },
        { l: 'Despesas', v: closingData.valor_despesas, color: rgb(1, 0, 0) },
      ]

      for (const row of rows) {
        drawText(row.l, margins.left, y, {
          size: 10,
          font: row.bold ? fontBold : fontRegular,
          color: row.color || rgb(0, 0, 0),
        })
        drawText(`R$ ${formatCurrency(row.v)}`, width - margins.right, y, {
          size: 10,
          align: 'right',
          font: row.bold ? fontBold : fontRegular,
          color: row.color || rgb(0, 0, 0),
        })
        y -= 15
      }

      y -= 5
      drawLine(y)
      y -= 15
      const saldoAcertoVal = closingData.saldo_acerto || 0
      drawText('SALDO DO ACERTO (CONFIRMADO)', width / 2, y, {
        size: 11,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawText(`R$ ${formatCurrency(saldoAcertoVal)}`, width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
        color: rgb(0, 0.5, 0),
      })

      const boxTop = y + 35
      const boxBottom = y - 5
      const boxLeft = margins.left + 20
      const boxRight = width - margins.right - 20

      page.drawRectangle({
        x: boxLeft,
        y: boxBottom,
        width: boxRight - boxLeft,
        height: boxTop - boxBottom,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      })

      y -= 20

      if (receipts && receipts.length > 0) {
        checkPageBreak(100)
        drawText('RESUMO DE ENTRADAS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15
        const grouped: any = {}
        for (const r of receipts) {
          const type = r.forma || 'Outros'
          if (!grouped[type]) grouped[type] = 0
          grouped[type] += r.valor
        }
        for (const [type, val] of Object.entries(grouped)) {
          if (checkPageBreak(20)) y -= 10
          drawText(type, margins.left, y, { size: 9 })
          drawText(
            `R$ ${formatCurrency(val as number)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right', font: fontBold },
          )
          y -= 12
        }
        y -= 10
        drawLine(y)
        y -= 15

        checkPageBreak(100)
        drawText('DETALHAMENTO DE ACERTOS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const r of receipts) {
          if (checkPageBreak(40)) y -= 10
          const clientName = r.clienteNome || 'Cliente'
          const line = `${safeFormatDate(r.data)} - ${clientName.substring(0, 20)}`

          drawText(line, margins.left, y, { size: 8 })
          drawText(
            `(${r.forma})  R$ ${formatCurrency(r.valor)}`,
            width - margins.right,
            y,
            { size: 8, align: 'right' },
          )
          y -= 10
        }

        y -= 10
        drawLine(y)
        y -= 15
      }

      if (expenses && expenses.length > 0) {
        checkPageBreak(100)
        drawText('DETALHAMENTO DE SAIDAS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15
        for (const exp of expenses) {
          if (checkPageBreak(40)) y -= 10
          const desc = exp.detalhamento || exp.grupo
          const line = `${safeFormatDate(exp.data)} - ${desc.substring(0, 20)}`
          drawText(line, margins.left, y, { size: 8 })
          drawText(formatCurrency(exp.valor), width - margins.right, y, {
            size: 8,
            align: 'right',
            color: exp.saiuDoCaixa ? rgb(0.8, 0, 0) : rgb(0.5, 0.5, 0.5),
          })
          y -= 10
        }
        y -= 10
        drawLine(y)
        y -= 15
      }

      y -= 30
      if (!isThermal) {
        checkPageBreak(100)
        y -= 50
      }
      const sigLineY = y
      page.drawLine({
        start: { x: margins.left + 20, y: sigLineY },
        end: { x: width - margins.right - 20, y: sigLineY },
        thickness: 1,
      })
      drawText('Assinatura Responsavel', width / 2, sigLineY - 15, {
        size: 9,
        align: 'center',
      })
    } else {
      // --- RESTORED ACERTO LAYOUT (Updated) ---
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0, // Total A Pagar
        valorPago = 0, // Total Pago (Imediato)
        debito = 0, // Restante (Inclui parcelas futuras)
        payments = [],
        history = [],
        signature,
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''}`

      // 1. Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText(`PEDIDO ${orderNumber || 'N/D'}`, width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 10
      drawLine(y)
      y -= 15

      // 2. Client Info
      const infoSize = 9
      drawText(`Cliente: ${clientCode} - ${clientName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
      y -= 12
      // Wrap address if needed or simple truncation
      drawText(`End: ${clientAddress}`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 12
      drawText(`${clientCity}`, margins.left, y, { size: infoSize })
      y -= 12
      drawText(
        `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
        margins.left,
        y,
        { size: infoSize },
      )
      y -= 12
      drawText(`Vendedor: ${sellerName}`, margins.left, y, { size: infoSize })
      y -= 10
      drawLine(y)
      y -= 15

      // 3. Items
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        if (checkPageBreak(80)) {
          // Reprint header if page break? Usually no for receipt strip
        }

        // Product Name + Price Line
        drawText(
          `${item.produtoNome} R$ ${formatCurrency(item.precoUnitario)}`,
          margins.left,
          y,
          {
            size: 9,
            font: fontBold,
            maxWidth: width - 20,
          },
        )
        y -= 12

        // Details Grid (Right aligned keys and values for clean look, or Left Key Right Value)
        const drawDetailLine = (label: string, value: string | number) => {
          drawText(label, margins.left, y, { size: 9 })
          drawText(String(value), width - margins.right, y, {
            size: 9,
            align: 'right',
          })
          y -= 11
        }

        drawDetailLine('Saldo Inicial:', item.saldoInicial)
        drawDetailLine('Contagem:', item.contagem)
        drawDetailLine('Qtd. Vendida:', item.quantVendida)
        drawDetailLine('Saldo Final:', item.saldoFinal)

        // Total Line
        drawText('Total:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(item.valorVendido)}`,
          width - margins.right,
          y,
          { size: 9, align: 'right', font: fontBold },
        )
        y -= 15 // Extra spacing between items
      }
      drawLine(y)
      y -= 15

      // 4. Totals
      const drawTotalLine = (label: string, value: number, bold = false) => {
        drawText(label, margins.left, y, {
          size: 9,
          font: bold ? fontBold : fontRegular,
        })
        drawText(`R$ ${formatCurrency(value)}`, width - margins.right, y, {
          size: 9,
          align: 'right',
          font: bold ? fontBold : fontRegular,
        })
        y -= 12
      }

      drawTotalLine('Total Vendido:', totalVendido)
      drawTotalLine('Desconto:', valorDesconto)
      y -= 2 // tiny bit more space before Total A Pagar
      drawTotalLine('TOTAL A PAGAR:', valorAcerto, true)
      y -= 5
      drawLine(y)
      y -= 15

      // 5. Payments (Immediate)
      drawText('PAGAMENTOS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      let hasImmediatePayment = false
      for (const p of payments) {
        if (p.paidValue > 0.01) {
          drawText(p.method, margins.left, y, { size: 9, font: fontBold })
          drawText(
            `R$ ${formatCurrency(p.paidValue)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right', font: fontBold },
          )
          y -= 12
          hasImmediatePayment = true
        }
      }
      if (!hasImmediatePayment) {
        drawText('Nenhum pagamento imediato.', margins.left, y, {
          size: 9,
          font: fontRegular,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 12
      }
      y -= 5
      drawLine(y)
      y -= 15

      // 6. A PAGAR (Schedule)
      drawText('A PAGAR', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // List all installments where value > paidValue
      // This effectively lists future payments
      let hasFuturePayments = false
      for (const p of payments) {
        if (p.details && p.details.length > 0) {
          p.details.forEach((det: any, idx: number) => {
            // Only show pending amounts (Future dated payments have paidValue=0)
            const isPending = det.value > (det.paidValue || 0) + 0.01
            if (isPending) {
              const installmentNum = det.number || idx + 1
              const totalInstallments = p.installments || p.details.length
              const label = `${p.method} (${installmentNum}/${totalInstallments}) - ${safeFormatDate(det.dueDate)}`

              drawText(label, margins.left, y, { size: 9 })
              drawText(
                `R$ ${formatCurrency(det.value)}`,
                width - margins.right,
                y,
                { size: 9, align: 'right' },
              )
              y -= 12
              hasFuturePayments = true
            }
          })
        }
      }
      if (!hasFuturePayments) {
        drawText('Nenhum agendamento futuro.', margins.left, y, {
          size: 9,
          font: fontRegular,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 12
      }

      y -= 5
      drawLine(y)
      y -= 15

      // 7. Resumo Financeiro
      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 15

      drawText('Valor Total Pago (Hoje):', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(valorPago)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
      })
      y -= 12

      // Matches "Valor a Pagar" per user story
      drawText('RESTANTE (DEBITO):', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(debito)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
        font: fontBold,
      })
      y -= 15
      drawLine(y)
      y -= 15

      // 8. Historico
      if (history && history.length > 0) {
        checkPageBreak(150)
        drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const h of history) {
          if (checkPageBreak(120)) {
            // header logic if needed
          }

          const drawHistLine = (label: string, val: string) => {
            drawText(label, margins.left, y, { size: 8 })
            drawText(val, width - margins.right, y, { size: 8, align: 'right' })
            y -= 10
          }

          drawHistLine('Data:', safeFormatDate(h.data))
          drawHistLine('Venda:', `R$ ${formatCurrency(h.valorVendaTotal || 0)}`)
          drawHistLine(
            'Desconto:',
            `R$ ${formatCurrency(h.valorVendaTotal - h.saldoAPagar)}`,
          )
          drawHistLine('A pagar:', `R$ ${formatCurrency(h.saldoAPagar || 0)}`)
          drawHistLine('Pago:', `R$ ${formatCurrency(h.valorPago || 0)}`)
          drawHistLine('Debito:', `R$ ${formatCurrency(h.debito || 0)}`)
          drawHistLine('Vendedor:', h.vendedor || 'N/D')
          drawHistLine(
            'Media Mensal:',
            `R$ ${formatCurrency(h.mediaMensal || 0)}`,
          )
          drawHistLine('Pedido:', `#${h.id}`)

          y -= 5
          // Dashed separator or spacing
          y -= 5
        }
        drawLine(y)
        y -= 15
      }

      // 9. Footer (Signature)
      y -= 30
      if (signature) {
        try {
          const sigImage = await pdfDoc.embedPng(signature)
          const sigDims = sigImage.scale(0.25)
          const sigX = (width - sigDims.width) / 2
          page.drawImage(sigImage, {
            x: sigX,
            y: y,
            width: sigDims.width,
            height: sigDims.height,
          })
          y -= 5 // Adjust for text below
        } catch {
          // If signature fails, just line
          const lineY = y + 20
          page.drawLine({
            start: { x: margins.left + 20, y: lineY },
            end: { x: width - margins.right - 20, y: lineY },
            thickness: 1,
          })
        }
      } else {
        const lineY = y + 20
        page.drawLine({
          start: { x: margins.left + 20, y: lineY },
          end: { x: width - margins.right - 20, y: lineY },
          thickness: 1,
        })
      }

      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        align: 'center',
        font: fontBold,
      })
      y -= 12
      drawText(`Emitido por: ${sellerName}`, width / 2, y, {
        size: 8,
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
