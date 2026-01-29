import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from 'https://esm.sh/pdf-lib@1.17.1'
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
    const isDetailed = reportType === 'detailed-order'

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    if (isDetailed) {
      // A4 Landscape for detailed table
      page = pdfDoc.addPage([842, 595]) // A4 Landscape points
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 30, bottom: 30, left: 30, right: 30 }
      y = height - margins.top
    } else if (isThermal) {
      // Thermal 80mm
      const itemsCount = body.items ? body.items.length : 0
      const historyCount = body.history ? body.history.length : 0
      const installmentsCount = body.installments ? body.installments.length : 0

      const estimatedHeight =
        400 + // Header
        itemsCount * 80 + // Items
        100 + // Totals
        (installmentsCount > 0 ? 50 + installmentsCount * 20 : 0) + // Installments
        50 + // Signature
        (historyCount > 0 ? 50 + historyCount * 80 : 0) + // History (increased height estimate)
        100 // Footer padding

      page = pdfDoc.addPage([226, Math.max(400, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // Default A4 Portrait
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
        if (isDetailed) {
          page = pdfDoc.addPage([842, 595])
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

    if (reportType === 'detailed-order') {
      // --- DETAILED REPORT (GREEN) ---
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
      } = body

      // 1. Header Title
      drawText('FACIL VENDAS', width / 2, y, {
        size: 16,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('RELATORIO DETALHADO DE PEDIDO', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 25
      drawLine(y, 1.5)
      y -= 20

      // 2. Info Columns
      const startInfoY = y
      const colLeftX = margins.left
      const colRightX = width / 2 + 20
      const lineHeight = 14

      // Left Column
      drawText(`Numero do Pedido: ${orderNumber}`, colLeftX, y, {
        font: fontBold,
        size: 10,
      })
      y -= lineHeight
      drawText(
        `Cliente: ${client?.CODIGO || ''} - ${client?.['NOME CLIENTE'] || ''}`,
        colLeftX,
        y,
        { font: fontBold, size: 10 },
      )
      y -= lineHeight
      drawText(`Endereco: ${client?.ENDEREÇO || ''}`, colLeftX, y, { size: 10 })
      y -= lineHeight
      drawText(
        `Municipio: ${client?.MUNICÍPIO || ''} - ${client?.['ESTADO'] || ''}`,
        colLeftX,
        y,
        { size: 10 },
      )
      y -= lineHeight
      drawText(`Contato: ${client?.['CONTATO 1'] || ''}`, colLeftX, y, {
        size: 10,
      })
      y -= lineHeight
      drawText(`Funcionario: ${employee?.nome_completo || ''}`, colLeftX, y, {
        size: 10,
      })

      // Right Column
      y = startInfoY
      drawText(`Data do Acerto: ${safeFormatDate(date)}`, colRightX, y, {
        size: 10,
      })
      y -= lineHeight
      drawText(`CNPJ/CPF: ${client?.CNPJ || ''}`, colRightX, y, { size: 10 })
      y -= lineHeight
      drawText(`CEP: ${client?.['CEP OFICIO'] || ''}`, colRightX, y, {
        size: 10,
      })
      y -= lineHeight
      drawText(`Telefone: ${client?.['FONE 1'] || ''}`, colRightX, y, {
        size: 10,
      })

      // Move down for table
      // Ensure we are below the lowest text (Left column usually)
      y = startInfoY - lineHeight * 6 - 20

      // 3. Table Headers
      const headerHeightSpace = 120
      y -= headerHeightSpace // Move baseline down

      const headerBaseline = y
      const cols = [
        { label: 'CODIGO', x: margins.left, w: 60, vertical: true },
        { label: 'MERCADORIA', x: margins.left + 60, w: 230, vertical: false }, // Horizontal
        { label: 'TIPO', x: margins.left + 290, w: 50, vertical: true },
        {
          label: 'SALDO INICIAL',
          x: margins.left + 340,
          w: 60,
          vertical: true,
        },
        { label: 'CONTAGEM', x: margins.left + 400, w: 60, vertical: true },
        { label: 'QTD VENDIDA', x: margins.left + 460, w: 60, vertical: true },
        {
          label: 'VALOR VENDIDO',
          x: margins.left + 520,
          w: 70,
          vertical: true,
        },
        { label: 'SALDO FINAL', x: margins.left + 590, w: 60, vertical: true },
        {
          label: 'NOVAS CONSIG.',
          x: margins.left + 650,
          w: 70,
          vertical: true,
        },
        { label: 'RECOLHIDO', x: margins.left + 720, w: 60, vertical: true },
      ]

      // Draw Headers
      cols.forEach((col) => {
        if (col.vertical) {
          const xOffset = col.x + col.w / 2 - 3
          drawText(col.label, xOffset, headerBaseline, {
            size: 9,
            font: fontBold,
            rotate: degrees(90),
          })
        } else {
          drawText(col.label, col.x + 5, headerBaseline + 5, {
            size: 9,
            font: fontBold,
          })
        }
      })

      y -= 10
      drawLine(y)
      y -= 15

      // 4. Rows
      items.forEach((item: any, index: number) => {
        checkPageBreak(20)
        const rowY = y
        const fontSize = 9

        // 1. Codigo
        drawText(String(item.produtoCodigo || ''), cols[0].x, rowY, {
          size: fontSize,
        })
        // 2. Mercadoria
        drawText(item.produtoNome, cols[1].x, rowY, {
          size: fontSize,
          maxWidth: cols[1].w,
        })
        // 3. Tipo
        drawText(item.tipo || '', cols[2].x, rowY, { size: fontSize })
        // 4. Saldo Ini
        drawText(String(item.saldoInicial), cols[3].x + 30, rowY, {
          size: fontSize,
          align: 'center',
        })
        // 5. Contagem
        drawText(String(item.contagem), cols[4].x + 30, rowY, {
          size: fontSize,
          align: 'center',
        })
        // 6. Qtd Vend
        drawText(String(item.quantVendida), cols[5].x + 30, rowY, {
          size: fontSize,
          align: 'center',
        })
        // 7. Valor Vend
        drawText(formatCurrency(item.valorVendido), cols[6].x + 60, rowY, {
          size: fontSize,
          align: 'right',
        })
        // 8. Saldo Final
        drawText(String(item.saldoFinal), cols[7].x + 30, rowY, {
          size: fontSize,
          align: 'center',
        })
        // 9. Novas Consig
        drawText(formatCurrency(item.novasConsignacoes), cols[8].x + 60, rowY, {
          size: fontSize,
          align: 'right',
        })
        // 10. Recolhido
        drawText(formatCurrency(item.recolhido), cols[9].x + 50, rowY, {
          size: fontSize,
          align: 'right',
        })

        y -= 15
        if (index % 5 === 0 && index !== 0) drawLine(y + 12, 0.5)
      })

      y -= 10
      drawLine(y)
      y -= 30

      // 5. Financial Summary (With Improved Spacing)
      if (y < margins.bottom + 150) {
        page = pdfDoc.addPage([842, 595])
        y = height - margins.top
      }

      drawText('RESUMO FINANCEIRO', width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 35 // Increased spacing

      const summaryLabelX = width - margins.right - 180
      const summaryValueX = width - margins.right

      // Total Vendido
      drawText('Total Vendido:', summaryLabelX, y, { size: 12, font: fontBold })
      drawText(`R$ ${formatCurrency(totalVendido)}`, summaryValueX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
      })
      y -= 25 // Increased spacing

      // Desconto
      drawText('Desconto:', summaryLabelX, y, { size: 12, font: fontBold })
      drawText(`R$ ${formatCurrency(valorDesconto)}`, summaryValueX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
        color: rgb(0.8, 0, 0),
      })
      y -= 35 // Increased spacing

      // Total a Pagar
      drawText('TOTAL A PAGAR:', summaryLabelX, y, { size: 16, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, summaryValueX, y, {
        size: 16,
        font: fontBold,
        align: 'right',
      })
      y -= 40

      // 6. Installments (Added to detailed report)
      if (installments && installments.length > 0) {
        checkPageBreak(80)
        drawText('VALORES A PAGAR (PARCELAS)', margins.left, y, {
          size: 12,
          font: fontBold,
          align: 'left',
        })
        y -= 20

        // Headers
        const iCol1 = margins.left
        const iCol2 = margins.left + 150
        const iCol3 = margins.left + 300

        drawText('Forma', iCol1, y, { size: 10, font: fontBold })
        drawText('Vencimento', iCol2, y, { size: 10, font: fontBold })
        drawText('Valor', iCol3, y, {
          size: 10,
          font: fontBold,
          align: 'right',
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 15

        installments.forEach((p: any) => {
          checkPageBreak(20)
          const method = p.method || '-'
          const dateStr = safeFormatDate(p.dueDate)
          const val = formatCurrency(p.value)

          drawText(method, iCol1, y, { size: 10 })
          drawText(dateStr, iCol2, y, { size: 10 })
          drawText(`R$ ${val}`, iCol3, y, { size: 10, align: 'right' })
          y -= 15
        })
      }
    } else if (reportType === 'thermal-history' || reportType === 'acerto') {
      // --- THERMAL SETTLEMENT SUMMARY (RED/ACERTO) ---
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
        history = [],
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}, ${client?.BAIRRO || ''}`
      const clientCity = client?.MUNICÍPIO || ''

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
      y -= 10
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
      drawText(`End: ${clientAddress}`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 12
      drawText(`${clientCity}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
      })
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
      y -= 10
      drawLine(y)
      y -= 15

      // ITEMS SECTION
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      for (const item of items) {
        checkPageBreak(80)
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

      // ORDER TOTALS
      const drawTotal = (label: string, val: number, isBig = false) => {
        const f = isBig ? fontBold : fontRegular
        drawText(label, margins.left, y, { size: 9, font: f })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          font: f,
          align: 'right',
        })
        y -= 15 // Improved spacing
      }

      drawTotal('Total Vendido:', totalVendido)
      drawTotal('Desconto:', valorDesconto)
      y -= 5 // Extra spacing
      drawTotal('TOTAL A PAGAR:', valorAcerto, true)
      y -= 15
      drawLine(y)
      y -= 15

      // INSTALLMENTS SECTION
      if (installments.length > 0) {
        checkPageBreak(50)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        const col1 = margins.left
        const col2 = margins.left + 60
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

        let totalParcelas = 0
        installments.forEach((p: any) => {
          checkPageBreak(25)
          const methodShort = p.method.substring(0, 10)
          const dateStr = safeFormatDate(p.dueDate)

          drawText(methodShort, col1, y, { size: 8 })
          drawText(dateStr, col2, y, { size: 8 })
          drawText(`R$ ${formatCurrency(p.value)}`, col3, y, {
            size: 8,
            align: 'right',
          })
          y -= 12
          totalParcelas += p.value
        })

        y -= 5
        drawLine(y, 0.5)
        y -= 12
        drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalParcelas)}`,
          width - margins.right,
          y,
          {
            size: 9,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 25
      } else {
        y -= 15
      }

      // Signature Line
      // Ensure space for signature
      checkPageBreak(60)

      // Draw signature line with proper spacing
      y -= 30
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

      // HISTORY SECTION
      if (history && history.length > 0) {
        checkPageBreak(150)
        drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        history.forEach((h: any) => {
          checkPageBreak(60)

          // Line 1: Date #Pedido Vendedor
          // Example: 29/01/2026 #462 Guilherme
          const dateStr = safeFormatDate(h.data)
          const orderId = h.id ? `#${h.id}` : '-'
          const vendor = h.vendedor ? h.vendedor.split(' ')[0] : '-'

          drawText(`${dateStr}`, margins.left, y, { size: 8, font: fontBold })
          drawText(`${orderId}`, margins.left + 55, y, {
            size: 8,
            font: fontBold,
          })
          drawText(`${vendor}`, width - margins.right, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 11

          // Line 2: V: ... A Pagar: ...
          // Example: V: 4.799,52  A Pagar: 4.799,52
          const venda = formatCurrency(h.valorVendaTotal || 0)
          const aPagar = formatCurrency(h.saldoAPagar || 0)

          drawText(`V: ${venda}`, margins.left, y, { size: 8, font: fontBold })
          drawText(`A Pagar: ${aPagar}`, width - margins.right, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 11

          // Line 3: Pg: ... Deb: ... Med: ...
          // Example: Pg: 1.335,00 Deb: 3.464,52 Med: 0,00
          const pago = formatCurrency(h.valorPago || 0)
          const debitoVal = h.debito || 0
          const mediaVal = h.mediaMensal || 0

          drawText(`Pg: ${pago}`, margins.left, y, { size: 8 })

          // Color Logic: Debito > 1.00 -> Dark Red
          const debitoColor = debitoVal > 1.0 ? rgb(0.6, 0, 0) : rgb(0, 0, 0)
          const medColor = rgb(0, 0, 0.6)

          drawText(`Deb: ${formatCurrency(debitoVal)}`, margins.left + 70, y, {
            size: 8,
            font: fontBold,
            color: debitoColor,
          })

          drawText(
            `Med: ${formatCurrency(mediaVal)}`,
            width - margins.right,
            y,
            {
              size: 8,
              font: fontBold,
              color: medColor,
              align: 'right',
            },
          )

          y -= 12
          drawLine(y, 0.5)
          y -= 10
        })
      }
    } else {
      // ... existing default case ...
      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        const {
          fechamento,
          date: closingDate,
          receipts,
          expenses,
          settlements,
        } = body
        const closingData = fechamento || body.data

        if (closingData) {
          const empName =
            closingData.funcionario?.nome_completo || 'Funcionario'

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
          drawText('RESUMO GERAL', margins.left, y, {
            size: 12,
            font: fontBold,
          })
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
        }
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
