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
    const { reportType, format, data } = body
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
        estimatedHeight =
          450 + expensesCount * 20 + (settlementsCount || 0) * 80
      } else if (reportType === 'receipt') {
        estimatedHeight = 400
      } else if (!reportType || reportType === 'acerto') {
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        const paymentsCount = body.payments ? body.payments.length : 0
        let installmentsCount = 0
        if (body.payments) {
          body.payments.forEach((p: any) => {
            if (p.details) installmentsCount += p.details.length
            else installmentsCount += 1
          })
        }
        estimatedHeight =
          450 +
          itemsCount * 100 +
          paymentsCount * 40 +
          installmentsCount * 30 +
          historyCount * 160 +
          300
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

      const finalFont = isThermal ? fontBold : font
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
      const {
        fechamento,
        receipts,
        expenses,
        settlements = [],
        date: closingDate,
      } = body
      const closingData = fechamento || body.data

      if (!closingData) throw new Error('No closing data provided')
      const empName = closingData.funcionario?.nome_completo || 'N/D'

      // New Standardized Template Logic
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

      // Header Info
      drawText(
        `Data: ${safeFormatDate(closingDate)} ${safeFormatTime(closingDate)}`,
        margins.left,
        y,
        { size: 10 },
      )
      y -= 12
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 12
      drawText(`Rota ID: ${closingData.rota_id}`, margins.left, y, { size: 10 })
      y -= 10
      drawLine(y)
      y -= 15

      // SALDO DO ACERTO
      drawText('SALDO DO ACERTO', margins.left, y, { size: 12, font: fontBold })
      drawText(
        `R$ ${formatCurrency(closingData.saldo_acerto)}`,
        width - margins.right,
        y,
        {
          size: 12,
          font: fontBold,
          align: 'right',
        },
      )
      y -= 15
      drawLine(y)
      y -= 15

      // RESUMO DE ENTRADA
      drawText('RESUMO DE ENTRADA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      const drawEntry = (label: string, value: number) => {
        drawText(label, margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(value)}`, width - margins.right, y, {
          size: 10,
          align: 'right',
        })
        y -= 12
      }
      drawEntry('Dinheiro:', closingData.valor_dinheiro)
      drawEntry('Pix:', closingData.valor_pix)
      drawEntry('Cheque:', closingData.valor_cheque)

      const totalEntrada =
        (closingData.valor_dinheiro || 0) +
        (closingData.valor_pix || 0) +
        (closingData.valor_cheque || 0)
      drawText('TOTAL ENTRADA:', margins.left, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(totalEntrada)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawLine(y)
      y -= 15

      // DETALHAMENTO DA SAIDA
      drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // List expenses if space allows and it's A4, but standard template focuses on Total
      // The requirement says: "DETALHAMENTO DA SAIDA (Total Saida/Despesas)"
      // Let's assume we list them if present for better detail
      if (expenses && expenses.length > 0) {
        expenses.forEach((exp: any) => {
          checkPageBreak(15)
          const desc = `${exp.grupo} - ${exp.detalhamento || ''}`
          drawText(desc, margins.left, y, { size: 9, maxWidth: width - 80 })
          drawText(
            `R$ ${formatCurrency(exp.valor)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12
        })
        y -= 5
      }

      drawText('TOTAL SAIDA (DESPESAS):', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      drawText(
        `R$ ${formatCurrency(closingData.valor_despesas)}`,
        width - margins.right,
        y,
        { size: 10, font: fontBold, align: 'right' },
      )
      y -= 15
      drawLine(y)
      y -= 15

      // DETALHAMENTO DO ACERTO
      drawText('DETALHAMENTO DO ACERTO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawEntry('Venda Total:', closingData.venda_total)
      drawEntry('Desconto Total:', closingData.desconto_total)
      y -= 15
      drawLine(y)
    } else if (
      isThermal &&
      (!reportType || reportType === 'acerto' || reportType === 'receipt')
    ) {
      // Existing Thermal Receipt Logic (unchanged)
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        valorPago = 0,
        debito = 0,
        payments = [],
        history = [],
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = `${client?.MUNICÍPIO || ''}`

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

      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        checkPageBreak(100)
        const priceStr = `R$ ${formatCurrency(item.precoUnitario)}`
        drawText(`${item.produtoNome}`, margins.left, y, {
          size: 9,
          font: fontBold,
          maxWidth: width - 80,
        })
        drawText(priceStr, width - margins.right, y, {
          size: 9,
          font: fontBold,
          align: 'right',
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

      drawText('PAGAMENTOS', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      let hasImmediate = false
      for (const p of payments) {
        if (p.paidValue > 0) {
          drawText(`${p.method} - Hoje`, margins.left, y, { size: 9 })
          drawText(
            `R$ ${formatCurrency(p.paidValue)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right' },
          )
          y -= 12
          hasImmediate = true
        }
      }
      if (!hasImmediate) {
        drawText('Nenhum pagamento imediato.', margins.left, y, {
          size: 9,
          font: fontBold,
        })
        y -= 15
      }
      y -= 5
      drawLine(y)
      y -= 15

      drawText('A PAGAR', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      let hasScheduled = false
      for (const p of payments) {
        if (p.details && p.details.length > 0) {
          for (const d of p.details) {
            const parts = d.dueDate.split('-')
            let dueTime = 0
            if (parts.length === 3) {
              const yNum = parseInt(parts[0])
              const mNum = parseInt(parts[1]) - 1
              const dNum = parseInt(parts[2])
              dueTime = Date.UTC(yNum, mNum, dNum)
            } else {
              dueTime = new Date(d.dueDate).getTime()
            }

            const now = new Date()
            const todayUTC = Date.UTC(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            )

            // Include if Due >= Today (Logic Update)
            if (dueTime >= todayUTC) {
              if (d.paidValue < d.value) {
                hasScheduled = true
                checkPageBreak(20)
                const label = `${p.method} (${d.number}/${p.installments}) - ${safeFormatDate(d.dueDate)}`
                drawText(label, margins.left, y, {
                  size: 9,
                  maxWidth: width - 80,
                })
                drawText(
                  `R$ ${formatCurrency(d.value)}`,
                  width - margins.right,
                  y,
                  { size: 9, align: 'right' },
                )
                y -= 12
              }
            }
          }
        }
      }

      if (!hasScheduled) {
        if (debito > 0.01) {
          // Fallback if details missing but debt exists
          drawText('Saldo Devedor Pendente.', margins.left, y, { size: 9 })
          y -= 12
        } else {
          drawText('Nenhum pagamento agendado.', margins.left, y, { size: 9 })
          y -= 12
        }
      }
      y -= 5
      drawLine(y)
      y -= 15

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

      drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const h of history) {
        checkPageBreak(120)

        const drawHistLine = (l: string, v: string | number) => {
          drawText(l, margins.left, y, { size: 9, font: fontBold })
          drawText(String(v), width - margins.right, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          y -= 11
        }

        drawHistLine('Data:', safeFormatDate(h.data))
        drawHistLine('Venda:', `R$ ${formatCurrency(h.valorVendaTotal)}`)
        drawHistLine('Desconto:', `R$ ${formatCurrency(h.desconto || 0)}`)
        drawHistLine('A pagar:', `R$ ${formatCurrency(h.saldoAPagar)}`)
        drawHistLine('Pago:', `R$ ${formatCurrency(h.valorPago)}`)
        drawHistLine('Debito:', `R$ ${formatCurrency(h.debito)}`)

        drawText('Vendedor:', margins.left, y, { size: 9, font: fontBold })
        drawText(h.vendedor || '-', width - margins.right, y, {
          size: 9,
          align: 'right',
          font: fontBold,
          maxWidth: 120,
        })
        y -= 11

        drawHistLine(
          'Media Mensal:',
          `R$ ${formatCurrency(h.mediaMensal || 0)}`,
        )
        drawHistLine('Pedido:', `#${h.id}`)

        y -= 8
      }

      drawLine(y)
      y -= 30

      checkPageBreak(50)
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
