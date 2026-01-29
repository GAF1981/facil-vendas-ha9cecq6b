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
    const { reportType, format, signature } = body
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
    let estimatedHeight = 842
    if (isThermal) {
      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        const expensesCount = body.expenses ? body.expenses.length : 0
        const settlementsCount = body.settlements ? body.settlements.length : 0
        const receiptsCount = body.receipts ? body.receipts.length : 0
        // Base size + dynamic items
        estimatedHeight =
          500 +
          expensesCount * 30 +
          settlementsCount * 80 +
          receiptsCount * 30 +
          300
      } else {
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        // Calculate detailed items height
        const detailedPaymentsCount = body.detailedPayments
          ? body.detailedPayments.length
          : 0
        const pendingInstallmentsCount = body.pendingInstallments
          ? body.pendingInstallments.length
          : 0

        // Use standard if new arrays missing
        const payments = body.payments || []
        let installmentsCount = 0
        if (!detailedPaymentsCount && !pendingInstallmentsCount) {
          payments.forEach((p: any) => {
            if (p.details && Array.isArray(p.details)) {
              installmentsCount += p.details.length
            } else {
              installmentsCount += 1
            }
          })
        }

        estimatedHeight =
          500 +
          itemsCount * 80 +
          detailedPaymentsCount * 40 +
          pendingInstallmentsCount * 40 +
          installmentsCount * 20 +
          historyCount * 120 + // History section size
          300
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

      const finalFont = isThermal ? fontBold : font
      const finalColor = color
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
      // ... (Existing logic for closing-confirmation preserved)
      const {
        fechamento,
        date: closingDate,
        receipts,
        expenses,
        settlements,
      } = body
      const closingData = fechamento || body.data

      if (closingData) {
        const empName = closingData.funcionario?.nome_completo || 'Funcionario'

        // --- HEADER ---
        drawText('FECHAMENTO DE CAIXA', width / 2, y, {
          size: 14,
          font: fontBold,
          align: 'center',
        })
        y -= 25
        drawText(`Funcionario: ${empName}`, margins.left, y, { size: 10 })
        y -= 15
        drawText(`Data: ${safeFormatDate(closingDate)}`, margins.left, y, {
          size: 10,
        })
        y -= 20
        drawLine(y)
        y -= 20

        // --- SUMMARY ---
        drawText('RESUMO GERAL', margins.left, y, { size: 12, font: fontBold })
        y -= 15
        const drawRow = (label: string, value: number) => {
          checkPageBreak(20)
          drawText(label, margins.left, y)
          drawText(`R$ ${formatCurrency(value)}`, width - margins.right, y, {
            align: 'right',
          })
          y -= 15
        }
        drawRow('Total Vendas:', closingData.venda_total)
        drawRow(
          'Total Recebido:',
          closingData.valor_dinheiro +
            closingData.valor_pix +
            closingData.valor_cheque +
            closingData.valor_boleto,
        )
        drawRow('Total Despesas:', closingData.valor_despesas)
        y -= 10
        drawText('SALDO ACERTO:', margins.left, y, { font: fontBold })
        drawText(
          `R$ ${formatCurrency(closingData.saldo_acerto)}`,
          width - margins.right,
          y,
          { align: 'right', font: fontBold },
        )
        y -= 20
        drawLine(y)
        y -= 20

        // --- TOTAL RECEBIDO (Detailed) ---
        drawText('TOTAL RECEBIDO (DETALHADO)', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 20

        if (receipts && receipts.length > 0) {
          const col1 = margins.left
          const col2 = margins.left + (isThermal ? 60 : 100)
          const col4 = width - margins.right

          drawText('Forma', col1, y, { size: 8, font: fontBold })
          drawText('Ped/Cli', col2, y, { size: 8, font: fontBold })
          drawText('Valor', col4, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 10
          drawLine(y, 0.5)
          y -= 15

          receipts.forEach((r: any) => {
            checkPageBreak(30)
            drawText(r.forma.substring(0, 10), col1, y, { size: 8 })
            const clientInfo = r.orderId
              ? `#${r.orderId} - ${r.clienteNome}`
              : r.clienteNome
            drawText(clientInfo, col2, y, {
              size: 8,
              maxWidth: isThermal ? 80 : 200,
            })
            drawText(`R$ ${formatCurrency(r.valor)}`, col4, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          })
        } else {
          drawText('Nenhum recebimento registrado.', margins.left, y, {
            size: 9,
          })
          y -= 15
        }
        y -= 10
        drawLine(y)
        y -= 20

        // --- TOTAL DA DESPESA (Detailed) ---
        drawText('TOTAL DA DESPESA (DETALHADO)', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 20

        if (expenses && expenses.length > 0) {
          const col1 = margins.left
          const col2 = margins.left + (isThermal ? 60 : 150)
          const col3 = width - margins.right

          drawText('Grupo', col1, y, { size: 8, font: fontBold })
          drawText('Detalhe', col2, y, { size: 8, font: fontBold })
          drawText('Valor', col3, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 10
          drawLine(y, 0.5)
          y -= 15

          expenses.forEach((e: any) => {
            if (!e.saiuDoCaixa) return
            checkPageBreak(25)
            drawText(e.grupo, col1, y, { size: 8, maxWidth: 50 })
            drawText(e.detalhamento, col2, y, {
              size: 8,
              maxWidth: isThermal ? 80 : 200,
            })
            drawText(`R$ ${formatCurrency(e.valor)}`, col3, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          })
        } else {
          drawText('Nenhuma despesa registrada.', margins.left, y, { size: 9 })
          y -= 15
        }
        y -= 10
        drawLine(y)
        y -= 20

        // --- DETALHAMENTO DE ACERTOS ---
        drawText('DETALHAMENTO DE ACERTOS', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 20

        if (settlements && settlements.length > 0) {
          const col1 = margins.left
          const col2 = margins.left + (isThermal ? 40 : 80)
          const col3 = width - margins.right

          drawText('Pedido', col1, y, { size: 8, font: fontBold })
          drawText('Cliente', col2, y, { size: 8, font: fontBold })
          drawText('Total Venda', col3, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 10
          drawLine(y, 0.5)
          y -= 15

          settlements.forEach((s: any) => {
            checkPageBreak(25)
            drawText(`#${s.orderId}`, col1, y, { size: 8 })
            drawText(s.clientName, col2, y, {
              size: 8,
              maxWidth: isThermal ? 100 : 250,
            })
            drawText(`R$ ${formatCurrency(s.totalSalesValue)}`, col3, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          })
        } else {
          drawText('Nenhum acerto registrado.', margins.left, y, { size: 9 })
          y -= 15
        }
      }
    } else {
      // --- NEW ACERTO / RECEIPT LAYOUT ---
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        payments = [],
        detailedPayments = [],
        pendingInstallments = [],
        signature,
        issuerName,
        history,
      } = body

      const sellerName = issuerName || employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`

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
      drawText(`${client?.MUNICÍPIO || ''}`, margins.left, y, {
        size: infoSize,
      })
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
        drawText(`${item.produtoNome}`, margins.left, y, {
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

      // --- DETAILED PAYMENT SECTION (NEW) ---
      if (detailedPayments.length > 0) {
        checkPageBreak(50)
        drawText('VALORES PAGOS (DETALHADO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Headers
        const col1 = margins.left
        const col2 = margins.left + (isThermal ? 40 : 80)
        const col3 = margins.left + (isThermal ? 100 : 200)
        const col4 = width - margins.right

        drawText('Forma', col1, y, { size: 8, font: fontBold })
        drawText('Data/Func', col2, y, { size: 8, font: fontBold })
        drawText('Valor', col4, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 10
        drawLine(y, 0.5)
        y -= 12

        let totalPagoDetailed = 0

        detailedPayments.forEach((p: any) => {
          checkPageBreak(25)
          const methodShort = p.method.substring(0, 10)
          const dateStr = safeFormatDate(p.date)
          const empStr = p.employee.split(' ')[0] // First name

          drawText(methodShort, col1, y, { size: 8 })
          drawText(`${dateStr} - ${empStr}`, col2, y, {
            size: 8,
            maxWidth: isThermal ? 100 : 200,
          })
          drawText(`R$ ${formatCurrency(p.paidValue)}`, col4, y, {
            size: 8,
            align: 'right',
          })
          y -= 12
          totalPagoDetailed += p.paidValue
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 12
        drawText('Total Pago:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalPagoDetailed)}`,
          width - margins.right,
          y,
          {
            size: 9,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 15
        drawLine(y)
        y -= 15
      } else if (payments.length > 0) {
        const paidItems = payments.filter((i: any) => i.paidValue > 0)
        if (paidItems.length > 0) {
          checkPageBreak(50)
          drawText('VALORES PAGOS', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15
          paidItems.forEach((p: any) => {
            checkPageBreak(20)
            const desc = p.method
            drawText(desc, margins.left, y, { size: 9 })
            drawText(
              `R$ ${formatCurrency(p.paidValue)}`,
              width - margins.right,
              y,
              {
                size: 9,
                align: 'right',
              },
            )
            y -= 12
          })
          y -= 10
          drawLine(y)
          y -= 15
        }
      }

      // --- PENDING INSTALLMENTS SECTION (NEW) ---
      if (pendingInstallments.length > 0) {
        checkPageBreak(50)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Headers
        const col1 = margins.left
        const col2 = margins.left + (isThermal ? 60 : 120)
        const col3 = width - margins.right

        drawText('Forma', col1, y, { size: 8, font: fontBold })
        drawText('Vencimento', col2, y, { size: 8, font: fontBold })
        drawText('Valor', col3, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 10
        drawLine(y, 0.5)
        y -= 12

        let totalAPagar = 0

        pendingInstallments.forEach((p: any) => {
          checkPageBreak(25)
          const methodShort = p.method.substring(0, 15)
          const dateStr = safeFormatDate(p.dueDate).split(' ')[0] // Just date

          drawText(methodShort, col1, y, { size: 8 })
          drawText(dateStr, col2, y, { size: 8 })
          drawText(`R$ ${formatCurrency(p.value)}`, col3, y, {
            size: 8,
            align: 'right',
          })
          y -= 12
          totalAPagar += p.value
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 12
        drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalAPagar)}`,
          width - margins.right,
          y,
          {
            size: 9,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 15
        drawLine(y)
        y -= 15
      } else {
        const allPayments: any[] = []
        if (payments && Array.isArray(payments)) {
          payments.forEach((p: any) => {
            if (p.details && Array.isArray(p.details) && p.details.length > 0) {
              p.details.forEach((d: any) => {
                allPayments.push({
                  method: p.method,
                  value: d.value,
                  paidValue: d.paidValue || 0,
                  dueDate: d.dueDate,
                })
              })
            } else {
              allPayments.push({
                method: p.method,
                value: p.value,
                paidValue: p.paidValue || 0,
                dueDate: p.dueDate,
              })
            }
          })
        }
        const unpaidItems = allPayments.filter(
          (i: any) => i.value > i.paidValue + 0.01,
        )

        if (unpaidItems.length > 0) {
          checkPageBreak(50)
          drawText('VALORES A PAGAR', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          unpaidItems.forEach((p: any) => {
            checkPageBreak(25)
            const desc = `${p.method} - ${safeFormatDate(p.dueDate)}`
            drawText(desc, margins.left, y, { size: 9, maxWidth: width - 80 })
            drawText(
              `R$ ${formatCurrency(p.value)}`,
              width - margins.right,
              y,
              {
                size: 9,
                align: 'right',
              },
            )
            y -= 12
          })
          y -= 10
          drawLine(y)
          y -= 15
        }
      }

      // --- SIGNATURE ---
      if (signature) {
        checkPageBreak(100)
        try {
          const pngImage = await pdfDoc.embedPng(signature)
          const sigDims = pngImage.scale(0.4)
          const sigX = (width - sigDims.width) / 2
          page.drawImage(pngImage, {
            x: sigX,
            y: y - sigDims.height,
            width: sigDims.width,
            height: sigDims.height,
          })
          y -= sigDims.height + 5
        } catch {}
      } else {
        y -= 30 // Space for signing if no digital signature
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
      y -= 25

      // --- HISTORY SECTION (NEW, DETAILED) ---
      if (history && history.length > 0) {
        checkPageBreak(200) // Ensure enough space for at least a header and 1 row
        drawText('RESUMO DE ACERTOS (HISTÓRICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Detailed Header
        // Layout:
        // Data | Venda | Desc | A Pagar | Pago | Debito | Vend | Media | Pedido
        // This is a lot for 80mm (226pt width approx).
        // Let's optimize columns for thermal width (approx 200pt usable).
        // Row 1: Data, Pedido, Vendedor
        // Row 2: Venda, Desc, A Pagar
        // Row 3: Pago, Debito, Media

        history.forEach((h: any) => {
          // Each entry block needs ~60px
          checkPageBreak(65)

          const dateStr = safeFormatDate(h.data)
          const orderId = h.id ? `#${h.id}` : '-'
          const vendor = h.vendedor ? h.vendedor.split(' ')[0] : '-' // First name only

          // --- ROW 1: Meta ---
          drawText(`${dateStr}`, margins.left, y, { size: 8 })
          drawText(`${orderId}`, margins.left + 60, y, { size: 8 })
          drawText(`${vendor}`, width - margins.right, y, {
            size: 8,
            align: 'right',
          })
          y -= 10

          // --- ROW 2: Financials 1 ---
          const venda = formatCurrency(h.valorVendaTotal)
          const desc = formatCurrency(h.desconto || 0) // Assuming discount is value
          const aPagar = formatCurrency(h.saldoAPagar)

          drawText(`V: ${venda}`, margins.left, y, { size: 8 })
          // drawText(`D: ${desc}`, margins.left + 60, y, { size: 8 })
          drawText(`A Pagar: ${aPagar}`, width - margins.right, y, {
            size: 8,
            align: 'right',
          })
          y -= 10

          // --- ROW 3: Financials 2 + Conditional ---
          const pago = formatCurrency(h.valorPago)
          const debito = h.debito || 0
          const media = h.mediaMensal || 0

          drawText(`Pg: ${pago}`, margins.left, y, { size: 8 })

          // Conditional Debt Color
          const debtColor = debito > 1.0 ? rgb(0.6, 0, 0) : rgb(0, 0, 0)
          drawText(`Déb: ${formatCurrency(debito)}`, margins.left + 60, y, {
            size: 8,
            color: debtColor,
            font: fontBold,
          })

          // Conditional Media Color
          const mediaColor = rgb(0, 0, 0.6)
          drawText(`Méd: ${formatCurrency(media)}`, width - margins.right, y, {
            size: 8,
            align: 'right',
            color: mediaColor,
            font: fontBold,
          })

          y -= 15
          drawLine(y, 0.5)
          y -= 10
        })
      }
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
