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
        (historyCount > 0 ? 50 + historyCount * 60 : 0) + // History
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
      } = body

      // 1. Header Title
      drawText('RELATORIO DETALHADO DE PEDIDO', width / 2, y, {
        size: 18,
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
      // We need to reserve space for the vertical headers that will be drawn UPWARDS from the baseline.
      // Vertical text height approx 100-120.
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
          // Center vertically relative to column width (horizontally in page coords)
          const xOffset = col.x + col.w / 2 - 3
          drawText(col.label, xOffset, headerBaseline, {
            size: 9,
            font: fontBold,
            rotate: degrees(90),
          })
        } else {
          // Horizontal text (Mercadoria)
          // Draw slightly above baseline to align with the "start" of vertical text visually
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

      // 5. Financial Summary
      // Ensure space for footer
      if (y < margins.bottom + 120) {
        page = pdfDoc.addPage([842, 595])
        y = height - margins.top
      }

      drawText('RESUMO FINANCEIRO', width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 25

      const summaryLabelX = width - margins.right - 180
      const summaryValueX = width - margins.right

      // Total Vendido
      drawText('Total Vendido:', summaryLabelX, y, { size: 12, font: fontBold })
      drawText(`R$ ${formatCurrency(totalVendido)}`, summaryValueX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
      })
      y -= 20

      // Desconto
      drawText('Desconto:', summaryLabelX, y, { size: 12, font: fontBold })
      drawText(`R$ ${formatCurrency(valorDesconto)}`, summaryValueX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
        color: rgb(0.8, 0, 0),
      })
      y -= 25

      // Total a Pagar
      drawText('TOTAL A PAGAR:', summaryLabelX, y, { size: 16, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, summaryValueX, y, {
        size: 16,
        font: fontBold,
        align: 'right',
      })
    } else if (reportType === 'thermal-history') {
      // --- THERMAL SETTLEMENT SUMMARY (RED) ---
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

      // Header
      drawText('FACIL VENDAS', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 18
      drawText(`PEDIDO ${orderNumber}`, width / 2, y, {
        size: 12,
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
      drawText(`${client?.MUNICÍPIO || ''}`, margins.left, y, {
        size: infoSize,
      })
      y -= 12
      drawText(`Data: ${safeFormatDate(date)}`, margins.left, y, {
        size: infoSize,
      })
      y -= 12
      drawText(`Vendedor: ${sellerName}`, margins.left, y, { size: infoSize })
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
        y -= 12
      }

      drawTotal('Total Vendido:', totalVendido)
      drawTotal('Desconto:', valorDesconto)
      y -= 2
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
        y -= 15
      }

      y -= 30
      // Signature Line
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
          const dateStr = safeFormatDate(h.data)
          const orderId = h.id ? `#${h.id}` : '-'
          const vendor = h.vendedor ? h.vendedor.split(' ')[0] : '-'

          drawText(`${dateStr}`, margins.left, y, { size: 8, font: fontBold })
          drawText(`${orderId}`, margins.left + 60, y, {
            size: 8,
            font: fontBold,
          })
          drawText(`${vendor}`, width - margins.right, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 10

          // Line 2: V: ... A Pagar: ...
          const venda = formatCurrency(h.valorVendaTotal)
          const aPagar = formatCurrency(h.saldoAPagar)

          drawText(`V: ${venda}`, margins.left, y, { size: 8 })
          drawText(`A Pagar: ${aPagar}`, width - margins.right, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 10

          // Line 3: Pg: ... Deb: ... Med: ...
          const pago = formatCurrency(h.valorPago)
          const debitoVal = h.debito || 0
          const mediaVal = h.mediaMensal || 0

          drawText(`Pg: ${pago}`, margins.left, y, { size: 8 })

          // Color Logic: Debito > 1.00 -> Dark Red
          const debitoColor = debitoVal > 1.0 ? rgb(0.6, 0, 0) : rgb(0, 0, 0)
          drawText(`Deb: ${formatCurrency(debitoVal)}`, margins.left + 70, y, {
            size: 8,
            font: fontBold,
            color: debitoColor,
          })

          // Color Logic: Media -> Dark Blue
          const mediaColor = rgb(0, 0, 0.6)
          drawText(
            `Med: ${formatCurrency(mediaVal)}`,
            width - margins.right,
            y,
            {
              size: 8,
              font: fontBold,
              color: mediaColor,
              align: 'right',
            },
          )

          y -= 12
          drawLine(y, 0.5)
          y -= 10
        })
      }
    } else {
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
