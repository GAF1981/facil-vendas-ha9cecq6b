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

// Ensure dates are displayed in Brazil Timezone
const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    let dateToParse = dateString
    // Check if it's a simple date YYYY-MM-DD
    if (dateString && dateString.length === 10 && !dateString.includes('T')) {
      // Append midday to avoid timezone shifts when parsing to Date object
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
    const { reportType, format, signature } = body // Extract signature
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
      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        const expensesCount = body.expenses ? body.expenses.length : 0
        const settlementsCount = body.settlements ? body.settlements.length : 0
        // Base size + dynamic items
        estimatedHeight = 500 + expensesCount * 25 + settlementsCount * 80
      } else if (
        !reportType ||
        reportType === 'acerto' ||
        reportType === 'receipt'
      ) {
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        const payments = body.payments || []

        // Calculate flattened installments count for height
        let installmentsCount = 0
        payments.forEach((p: any) => {
          if (p.details && Array.isArray(p.details)) {
            installmentsCount += p.details.length
          } else {
            installmentsCount += 1
          }
        })

        estimatedHeight =
          500 + // Base header/footer
          itemsCount * 80 + // Product items (approx 5-6 lines each)
          installmentsCount * 20 + // Payment lines
          historyCount * 120 + // History blocks
          300 // Buffer

        // Add extra space for signature if present
        if (signature) estimatedHeight += 150
      }

      page = pdfDoc.addPage([226, Math.max(400, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
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

      const finalFont = isThermal ? fontBold : font // Use Bold for thermal for clarity
      const finalColor = isThermal ? rgb(0, 0, 0) : color
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
        color: finalColor,
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
        if (isThermal) {
          // For thermal, we usually extend the page or just let it be long,
          // but if we must break, add new page with same width
          page = pdfDoc.addPage([width, height])
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    if (
      reportType === 'closing-confirmation' ||
      reportType === 'employee-cash-summary'
    ) {
      // ... (Existing closing confirmation logic remains unchanged) ...
      const { fechamento, date: closingDate, expenses, settlements } = body
      const closingData = fechamento || body.data
      if (!closingData) throw new Error('No closing data provided')

      const empName = closingData.funcionario?.nome_completo || 'Funcionario'
      const routeId = closingData.rota_id || 'N/D'

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
      y -= 10
      drawLine(y)
      y -= 15

      // Header
      drawText(`Funcionario: ${empName}`, margins.left, y)
      y -= 15
      drawText(
        `Data: ${safeFormatDate(closingDate)} ${safeFormatTime(closingDate)}`,
        margins.left,
        y,
      )
      y -= 15
      drawText(`Rota ID: ${routeId}`, margins.left, y)
      y -= 15
      drawLine(y)
      y -= 20

      // Financial Summary
      drawText('RESUMO FINANCEIRO', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 20

      const drawRow = (label: string, value: number, isBold = false) => {
        const f = isBold ? fontBold : fontRegular
        drawText(label, margins.left, y, { size: 10, font: f })
        drawText(`R$ ${formatCurrency(value)}`, width - margins.right, y, {
          size: 10,
          font: f,
          align: 'right',
        })
        y -= 15
      }

      drawRow('Total Vendas:', closingData.venda_total)
      y -= 5 // Spacing
      drawText('RECEBIMENTOS:', margins.left, y, { size: 10, font: fontBold })
      y -= 15
      drawRow('  Dinheiro:', closingData.valor_dinheiro)
      drawRow('  Pix:', closingData.valor_pix)
      drawRow('  Cheque:', closingData.valor_cheque)
      y -= 5
      drawRow(
        'Total Recebido:',
        closingData.valor_dinheiro +
          closingData.valor_pix +
          closingData.valor_cheque,
        true,
      )
      y -= 5
      drawLine(y)
      y -= 15

      drawRow('Total Despesas:', closingData.valor_despesas, true)
      y -= 5
      drawLine(y)
      y -= 15

      // Final Balance
      drawText('SALDO ACERTO:', margins.left, y, { size: 12, font: fontBold })
      drawText(
        `R$ ${formatCurrency(closingData.saldo_acerto)}`,
        width - margins.right,
        y,
        { size: 12, font: fontBold, align: 'right' },
      )
      y -= 20
      drawLine(y)
      y -= 20

      // Expenses Detail
      if (expenses && expenses.length > 0) {
        checkPageBreak(100)
        drawText('DETALHAMENTO DE DESPESAS', width / 2, y, {
          size: 11,
          font: fontBold,
          align: 'center',
        })
        y -= 20
        expenses.forEach((exp: any) => {
          checkPageBreak(40)
          drawText(
            `${safeFormatDate(exp.data)} - ${exp.detalhamento}`,
            margins.left,
            y,
            { size: 9 },
          )
          drawText(
            `R$ ${formatCurrency(exp.valor)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 15
        })
        y -= 10
        drawLine(y)
        y -= 20
      }

      // Signatures
      checkPageBreak(150)
      y -= 40
      drawLine(y)
      y -= 15
      drawText('Assinatura do Funcionario', width / 2, y, {
        align: 'center',
        size: 10,
      })

      y -= 50
      drawLine(y)
      y -= 15
      drawText('Assinatura do Responsavel (Conferencia)', width / 2, y, {
        align: 'center',
        size: 10,
      })
    } else if (
      isThermal &&
      (!reportType || reportType === 'acerto' || reportType === 'receipt')
    ) {
      // NEW "ACERTO" RECEIPT LOGIC
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        valorPago = 0, // "Valor Total Pago (Hoje)"
        debito = 0, // "RESTANTE (DEBITO)"
        payments = [],
        history = [],
        issuerName,
      } = body

      const sellerName = issuerName || employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''}`

      // --- HEADER ---
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

      // --- CLIENT INFO ---
      const infoSize = 9
      drawText(`Cliente: ${clientCode} - ${clientName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
        maxWidth: width - 20,
      })
      y -= 12
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
      drawText(`Vendedor: ${sellerName}`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 10
      drawLine(y)
      y -= 15

      // --- ITENS DO PEDIDO ---
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        checkPageBreak(100)
        // Product Name and Price line
        const priceStr = `R$ ${formatCurrency(item.precoUnitario)}`
        drawText(`${item.produtoNome} ${priceStr}`, margins.left, y, {
          size: 9,
          font: fontBold,
          maxWidth: width - 20,
        })
        y -= 12

        const drawDetail = (label: string, val: any) => {
          drawText(label, margins.left, y, { size: 9 })
          drawText(String(val), width - margins.right, y, {
            size: 9,
            align: 'right',
          })
          y -= 11
        }

        drawDetail('Saldo Inicial:', item.saldoInicial)
        drawDetail('Contagem:', item.contagem)
        drawDetail('Qtd. Vendida:', item.quantVendida)
        drawDetail('Saldo Final:', item.saldoFinal)

        drawText('Total:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(item.valorVendido)}`,
          width - margins.right,
          y,
          { size: 9, font: fontBold, align: 'right' },
        )
        y -= 15
      }
      drawLine(y)
      y -= 15

      // --- TOTALS ---
      const drawTotal = (label: string, val: number, isBig = false) => {
        const f = isBig ? fontBold : fontRegular
        drawText(label, margins.left, y, { size: 9, font: f })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          font: f,
          align: 'right',
        })
        y -= 12
      }

      drawTotal('Total Vendido:', totalVendido)
      drawTotal('Desconto:', valorDesconto)
      y -= 2
      drawTotal('TOTAL A PAGAR:', valorAcerto, true)
      y -= 15
      drawLine(y)
      y -= 15

      // --- PAGAMENTOS (IMMEDIATE) ---
      drawText('PAGAMENTOS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // Flatten logic: Extract all payment details/parts
      // Identify immediate vs future
      const immediatePayments: any[] = []
      const futureInstallments: any[] = []

      // Normalize payments input
      const allPaymentParts: any[] = []
      if (payments && payments.length > 0) {
        payments.forEach((p: any) => {
          if (p.details && Array.isArray(p.details) && p.details.length > 0) {
            p.details.forEach((d: any) => {
              allPaymentParts.push({ ...d, method: p.method })
            })
          } else {
            // Flat entry
            allPaymentParts.push(p)
          }
        })
      }

      allPaymentParts.forEach((p) => {
        // Updated logic: Check if paidValue matches registered value (within tolerance)
        const isFullyPaid = Math.abs((p.paidValue || 0) - (p.value || 0)) < 0.01

        if ((p.paidValue || 0) > 0) {
          immediatePayments.push(p)
        }

        // Only add to future "A PAGAR" if NOT fully paid and has value
        if (!isFullyPaid && (p.value || 0) > 0) {
          futureInstallments.push(p)
        }
      })

      if (immediatePayments.length > 0) {
        immediatePayments.forEach((p) => {
          drawText(
            `${p.method} - ${safeFormatDate(p.dueDate || date)}`,
            margins.left,
            y,
            { size: 9 },
          )
          drawText(
            `R$ ${formatCurrency(p.paidValue)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12
        })
      } else {
        drawText('Nenhum pagamento imediato.', margins.left, y, { size: 9 })
        y -= 12
      }
      y -= 5
      drawLine(y)
      y -= 15

      // --- A PAGAR (INSTALLMENTS) ---
      drawText('A PAGAR', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      if (futureInstallments.length > 0) {
        // Group by method to determine (X/Y)
        const grouped: Record<string, any[]> = {}
        futureInstallments.forEach((p) => {
          if (!grouped[p.method]) grouped[p.method] = []
          grouped[p.method].push(p)
        })

        // Iterate groups and sort by date
        Object.entries(grouped).forEach(([method, parts]) => {
          parts.sort((a, b) => {
            const dA = new Date(a.dueDate || '2099-01-01').getTime()
            const dB = new Date(b.dueDate || '2099-01-01').getTime()
            return dA - dB
          })

          parts.forEach((p, idx) => {
            // Format: "Boleto (1/1) - 17/01/2026"
            const label = `${method} (${idx + 1}/${parts.length}) - ${safeFormatDate(p.dueDate)}`
            drawText(label, margins.left, y, { size: 9, font: fontBold })
            drawText(
              `R$ ${formatCurrency(p.value)}`,
              width - margins.right,
              y,
              { size: 9, align: 'right', font: fontBold },
            )
            y -= 12
          })
        })
      } else {
        drawText('Nenhuma parcela futura.', margins.left, y, { size: 9 })
        y -= 12
      }
      y -= 5
      drawLine(y)
      y -= 15

      // --- RESUMO FINANCEIRO (HOJE) ---
      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 15
      drawText('Valor Total Pago (Hoje):', margins.left, y, {
        size: 9,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(valorPago)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
        font: fontBold,
      })
      y -= 12
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

      // --- RESUMO DE ACERTOS (HISTORICO) ---
      drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      if (history && history.length > 0) {
        history.forEach((h: any) => {
          checkPageBreak(120) // Ensure block fits
          // Data: 17/01/2026 (Right aligned)
          drawText('Data:', margins.left, y, { size: 9, font: fontBold })
          drawText(
            safeFormatDate(h.data),
            width - margins.right,
            y,
            { size: 9, align: 'right', font: fontBold }, // Bold Date
          )
          y -= 12

          const drawHistRow = (label: string, val: any, boldVal = false) => {
            drawText(label, margins.left, y, { size: 9 })
            drawText(
              typeof val === 'number'
                ? `R$ ${formatCurrency(val)}`
                : String(val),
              width - margins.right,
              y,
              {
                size: 9,
                align: 'right',
                font: boldVal ? fontBold : fontRegular,
              },
            )
            y -= 12
          }

          drawHistRow('Venda:', h.valorVendaTotal)
          drawHistRow('Desconto:', h.desconto)
          drawHistRow('A pagar:', h.saldoAPagar)
          drawHistRow('Pago:', h.valorPago)
          drawHistRow('Debito:', h.debito)

          // Seller line
          drawText('Vendedor:', margins.left, y, { size: 9 })
          drawText(h.vendedor || '-', width - margins.right, y, {
            size: 9,
            align: 'right',
            maxWidth: 120,
          })
          y -= 12

          drawHistRow('Media Mensal:', h.mediaMensal)

          // Order ID
          drawText('Pedido:', margins.left, y, { size: 9, font: fontBold })
          drawText(`#${h.id}`, width - margins.right, y, {
            size: 9,
            align: 'right',
            font: fontBold,
          })
          y -= 15 // Spacing between blocks
        })
      } else {
        drawText('Nenhum histórico disponível.', margins.left, y, { size: 9 })
        y -= 15
      }
      drawLine(y)
      y -= 25

      // --- SIGNATURE ---
      checkPageBreak(100) // Ensure space for signature

      if (signature) {
        try {
          // Signature is typically "data:image/png;base64,..."
          const pngImage = await pdfDoc.embedPng(signature)
          const sigDims = pngImage.scale(0.4) // Scale appropriately
          const sigX = (width - sigDims.width) / 2

          // Draw image above the line
          page.drawImage(pngImage, {
            x: sigX,
            y: y,
            width: sigDims.width,
            height: sigDims.height,
          })

          y -= 5 // Small padding between image and line
        } catch (e) {
          console.error('Failed to embed signature image', e)
          drawText('(Assinatura digital não carregada)', width / 2, y + 10, {
            size: 8,
            align: 'center',
          })
        }
      }

      const sigLineY = y
      page.drawLine({
        start: { x: margins.left + 20, y: sigLineY },
        end: { x: width - margins.right - 20, y: sigLineY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      y -= 15
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 12
      drawText(`Emitido por: ${sellerName}`, width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
    } else {
      drawText('Relatório não suportado.', margins.left, y)
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
