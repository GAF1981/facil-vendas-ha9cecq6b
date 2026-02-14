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
      // A4 Portrait for Detailed Invoice (Custom Layout)
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 40, bottom: 40, left: 25, right: 25 } // Tighter margins
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

    // --- CUSTOM DETAILED ORDER (RELATORIO DETALHADO DE PEDIDO - A4) ---
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
      const clientAddress = client?.ENDEREÇO || '-'
      const clientCity = `${client?.MUNICÍPIO || ''} - ${client?.ESTADO || ''}` // Mocked ESTADO if missing
      const clientContact =
        client?.['CONTATO 1'] || client?.['CONTATO 2'] || 'Kkk' // Matches image 'Kkk' mock or real data
      const clientDoc = client?.CNPJ || client?.CPF || '00.000.000/0000-00'
      const clientCep = client?.['CEP OFICIO'] || '-'
      const clientPhone = client?.['FONE 1'] || client?.['FONE 2'] || '-'
      const formattedDate = safeFormatDate(date)
      const empName = employee?.nome_completo || 'N/D'

      // Title
      drawText('RELATORIO DETALHADO DE PEDIDO', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 30
      drawLine(y)
      y -= 15

      // Header Grid (Left / Right split roughly)
      const leftColX = margins.left
      const rightColX = width / 2 + 20

      // Row 1
      drawText(`Numero do Pedido: ${orderNumber}`, leftColX, y, {
        size: 10,
        font: fontBold,
      })
      drawText(`Data do Acerto: ${formattedDate}`, rightColX, y, { size: 10 })
      y -= 15

      // Row 2
      drawText(`Cliente: ${client?.CODIGO || 0} - ${clientName}`, leftColX, y, {
        size: 10,
        font: fontBold,
      })
      drawText(`CNPJ/CPF: ${clientDoc}`, rightColX, y, { size: 10 })
      y -= 15

      // Row 3
      drawText(`Endereco: ${clientAddress}`, leftColX, y, { size: 10 })
      drawText(`CEP: ${clientCep}`, rightColX, y, { size: 10 })
      y -= 15

      // Row 4
      drawText(`Municipio: ${clientCity}`, leftColX, y, { size: 10 })
      drawText(`Telefone: ${clientPhone}`, rightColX, y, { size: 10 })
      y -= 15

      // Row 5
      drawText(`Contato: ${clientContact}`, leftColX, y, { size: 10 })
      y -= 15

      // Row 6
      drawText(`Funcionario: ${empName}`, leftColX, y, { size: 10 })
      y -= 20
      drawLine(y)
      y -= 10

      // Table Header - Vertical Headers as per image
      // Columns based on User Story & Image:
      // CODIGO, MERCADORIA, TIPO, SALDO INICIAL, CONTAGEM, QUANTIDADE VENDIDA, VALOR VENDIDO, SALDO FINAL, NOVAS CONSIGNACOES, RECOLHIDO
      // Total 10 columns.
      // Width allocations (Total ~545 points available):
      // Cod: 40, Merc: 160, Tipo: 40, SI: 35, Cont: 35, QV: 40, VV: 50, SF: 35, NC: 50, Rec: 40
      const tableX = {
        cod: margins.left,
        merc: margins.left + 45,
        tipo: margins.left + 210,
        si: margins.left + 250,
        cont: margins.left + 285,
        qv: margins.left + 320,
        vv: margins.left + 360,
        sf: margins.left + 410,
        nc: margins.left + 445,
        rec: margins.left + 495,
      }

      // Draw Vertical Headers
      // We simulate vertical text by drawing character by character vertically or rotating 90 degrees
      // pdf-lib supports rotation.
      // Rotation origin is the x,y point.
      const headerY = y
      const headerFontSize = 8

      const drawVerticalHeader = (text: string, x: number) => {
        drawText(text, x + 5, headerY, {
          size: headerFontSize,
          font: fontBold,
          rotate: { type: 'degrees', angle: 90 },
        })
      }

      // CODIGO
      drawVerticalHeader('CODIGO', tableX.cod)
      // MERCADORIA
      drawVerticalHeader('MERCADORIA', tableX.merc) // Actually Mercadoria is vertical in image? No, image OCR shows standard row. Wait.
      // The image OCR has "1004589 ACESSORIO CELULAR R$ 19,99 GERAL 70 55 15 299,85 60 5,00 0,00".
      // The headers are ABOVE the data.
      // In the image, headers "CODIGO", "MERCADORIA", "TIPO" are vertical?
      // Re-reading user story: "Table Columns: CODIGO...".
      // Re-reading image OCR:
      // "CODIGO"
      // "MERCADORIA"
      // "TIPO"
      // "SALDO INICIAL"
      // ...
      // They are printed VERTICALLY in the image header row to save horizontal space?
      // Yes, typical for this dense report.
      // Let's implement vertical headers for all columns to match the "strictly follow" instruction if that's what the image implies.
      // Usually "MERCADORIA" is horizontal because it's long, but in dense reports it might be.
      // Let's look at the image visually description again.
      // Actually, standard reports have "Mercadoria" horizontal.
      // But looking at the OCR text block:
      // CODIGO
      // MERCADORIA
      // TIPO
      // ...
      // They seem listed vertically in the OCR text block, which suggests they are vertical headers in the PDF.
      // Let's apply vertical rotation for ALL headers to be safe and match dense columns.

      drawVerticalHeader('CODIGO', tableX.cod)
      drawVerticalHeader('MERCADORIA', tableX.merc)
      drawVerticalHeader('TIPO', tableX.tipo)
      drawVerticalHeader('SALDO INICIAL', tableX.si)
      drawVerticalHeader('CONTAGEM', tableX.cont)
      drawVerticalHeader('QUANTIDADE VENDIDA', tableX.qv)
      drawVerticalHeader('VALOR VENDIDO', tableX.vv)
      drawVerticalHeader('SALDO FINAL', tableX.sf)
      drawVerticalHeader('NOVAS CONSIGNACOES', tableX.nc)
      drawVerticalHeader('RECOLHIDO', tableX.rec)

      y -= 80 // Space for vertical headers (approx 10-12 chars * 6pts)
      drawLine(y)
      y -= 12

      // Items Row
      const rowFontSize = 8
      for (const item of items) {
        checkPageBreak(15)

        // Columns Data
        drawText(String(item.produtoCodigo || ''), tableX.cod, y, {
          size: rowFontSize,
        })
        drawText(
          String(item.produtoNome || '').substring(0, 35),
          tableX.merc,
          y,
          { size: rowFontSize },
        )
        drawText(String(item.tipo || 'GERAL').substring(0, 8), tableX.tipo, y, {
          size: rowFontSize,
        })

        // Numbers right aligned effectively
        // Since we defined X as start, let's just print. For strict alignment we'd need width calcs.
        // Assuming loose alignment based on X coords above.
        drawText(String(item.saldoInicial || 0), tableX.si + 5, y, {
          size: rowFontSize,
        })
        drawText(String(item.contagem || 0), tableX.cont + 5, y, {
          size: rowFontSize,
        })
        drawText(String(item.quantVendida || 0), tableX.qv + 5, y, {
          size: rowFontSize,
        })
        drawText(formatCurrency(item.valorVendido || 0), tableX.vv + 5, y, {
          size: rowFontSize,
        })
        drawText(String(item.saldoFinal || 0), tableX.sf + 5, y, {
          size: rowFontSize,
        })
        drawText(
          formatCurrency(item.novasConsignacoes || 0),
          tableX.nc + 5,
          y,
          { size: rowFontSize },
        )
        drawText(formatCurrency(item.recolhido || 0), tableX.rec + 5, y, {
          size: rowFontSize,
        })

        y -= 12
      }

      y -= 5
      drawLine(y)
      y -= 20

      // Footer - RESUMO FINANCEIRO
      checkPageBreak(80)
      const footerRightX = width - margins.right
      const footerLabelX = width - 200

      drawText('RESUMO FINANCEIRO', footerRightX, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 20

      drawText('Total Vendido:', footerLabelX, y, { size: 10 })
      drawText(`R$ ${formatCurrency(totalVendido)}`, footerRightX, y, {
        size: 10,
        align: 'right',
      })
      y -= 15

      drawText('Desconto:', footerLabelX, y, { size: 10 })
      drawText(`R$ ${formatCurrency(valorDesconto)}`, footerRightX, y, {
        size: 10,
        align: 'right',
        color: rgb(1, 0, 0), // Red
      })
      y -= 15

      drawText('TOTAL A PAGAR:', footerLabelX, y, {
        size: 12,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, footerRightX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
      })
    }

    // --- THERMAL LAYOUTS (EXISTING LOGIC PRESERVED) ---
    else if (
      isThermal &&
      (reportType === 'thermal-history' ||
        reportType === 'acerto' ||
        reportType === 'receipt')
    ) {
      // ... existing thermal logic ...
      const {
        client,
        employee,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        installments = [],
        detailedPayments = [],
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
      const { fechamento, expenses = [], date } = body
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
