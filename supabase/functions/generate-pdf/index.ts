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

// Function to calculate exact height needed for thermal receipt content
const calculateThermalHeight = (body: any) => {
  // Base header height (Title, Subtitle, Client Info, Seller Info, Dates, Lines)
  // Header section approx sum: 20+20+15+12*5+15+15 = ~145
  let h = 145

  // Items Section Header
  h += 15 // "ITENS DO PEDIDO"

  const items = body.items || []
  // Per Item: Name(12) + 5 Stats(60) + Spacer(2) + Line(12) = 86
  h += items.length * 86

  // Totals Section
  // Approx: 5(spacer) + 12(Total) + 12(Desc) + 12(Prod count) + 12(Qtd count) + 15(Total Pay) + 15(Line) = 83
  h += 83

  // VALOR PAGO Section
  const payments =
    body.detailedPayments && body.detailedPayments.length > 0
      ? body.detailedPayments
      : body.payments || []

  if (payments.length > 0) {
    h += 60 // Header + Title + Line
    // Per payment row: 12
    h += payments.length * 12
    h += 15 // Line after
  }

  // Installments Section
  const installments = body.installments || []
  if (installments.length > 0) {
    h += 60 // Header + Title + Line
    // Per installment row: 12
    h += installments.length * 12
    h += 40 // Footer total + line
  }

  // Signature Section
  h += 60 // Space + Line + Text

  // History Section
  const history = body.history || []
  if (history.length > 0) {
    h += 15 // Header
    // Per history item: 3 lines(30) + 15 gap = 45
    h += history.length * 45
    h += 10 // Final line
  }

  // Buffer at bottom (5cm ~ 142px)
  h += 142

  return Math.max(400, Math.ceil(h))
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
      margins = { top: 40, bottom: 40, left: 25, right: 25 }
      y = height - margins.top
    } else if (isThermal) {
      // Thermal 80mm - Calculate Optimized Height
      let calculatedHeight = 600 // Default fallback

      if (
        reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary'
      ) {
        calculatedHeight = 600
      } else {
        calculatedHeight = calculateThermalHeight(body)
      }

      page = pdfDoc.addPage([226, calculatedHeight])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // Default fallback (Standard A4)
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
      // Keep existing logic for A4 detailed order, adding new metrics
      const {
        client,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        employee,
        totalItemsSold,
        totalQuantitySold,
      } = body

      // ... (Rest of A4 logic same as before until footer)
      const clientName =
        client?.['NOME CLIENTE'] || client?.['RAZÃO SOCIAL'] || 'Consumidor'
      const clientAddress = client?.ENDEREÇO || '-'
      const clientCity = `${client?.MUNICÍPIO || ''} - ${client?.ESTADO || ''}`
      const clientContact =
        client?.['CONTATO 1'] || client?.['CONTATO 2'] || 'Kkk'
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

      // Fix Overlapping Headers: Move Y down significantly before drawing headers
      y -= 100

      // Table Header - Vertical Headers
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

      const headerY = y
      const headerFontSize = 8

      const drawVerticalHeader = (text: string, x: number) => {
        // Draw rotated text. It will extend UPWARDS from y.
        drawText(text, x + 5, headerY, {
          size: headerFontSize,
          font: fontBold,
          rotate: { type: 'degrees', angle: 90 },
        })
      }

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

      y -= 10 // small gap after headers base
      drawLine(y)
      y -= 12

      // Items Row
      const rowFontSize = 8
      // Sort items alphabetically if not already sorted
      const sortedItems = [...items].sort((a, b) =>
        (a.produtoNome || '').localeCompare(b.produtoNome || ''),
      )

      for (const item of sortedItems) {
        checkPageBreak(15)

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
      const footerLabelX = width - 350

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

      // New Metrics for A4 as well if available
      if (totalItemsSold !== undefined) {
        drawText('Total de produtos vendidos:', footerLabelX, y, { size: 10 })
        drawText(String(totalItemsSold), footerRightX, y, {
          size: 10,
          align: 'right',
        })
        y -= 15
      }

      if (totalQuantitySold !== undefined) {
        drawText('Quantidade de produtos vendidos:', footerLabelX, y, {
          size: 10,
        })
        drawText(String(totalQuantitySold), footerRightX, y, {
          size: 10,
          align: 'right',
        })
        y -= 15
      }

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

    // --- CASH CLOSURE (FECHAMENTO DE CAIXA) - A4 LAYOUT ---
    else if (
      !isThermal &&
      (reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary')
    ) {
      // ... (Keep existing logic)
      const { fechamento, date } = body
      const closingData = fechamento || body.data || {}

      const empName = closingData.funcionario?.nome_completo || 'Funcionario'
      const rotaId = closingData.rota_id || '-'
      const reportDate = closingData.created_at || date

      const saldoAcerto = closingData.saldo_acerto || 0
      const vDinheiro = closingData.valor_dinheiro || 0
      const vPix = closingData.valor_pix || 0
      const vCheque = closingData.valor_cheque || 0
      const totalEntrada = vDinheiro + vPix + vCheque
      const vDespesas = closingData.valor_despesas || 0
      const vendaTotal = closingData.venda_total || 0
      const descontoTotal = closingData.desconto_total || 0

      drawText('FACIL VENDAS', width / 2, y, {
        size: 18,
        font: fontBold,
        align: 'center',
      })
      y -= 25
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawLine(y)
      y -= 20

      const formattedDate =
        safeFormatDate(reportDate) + ' ' + safeFormatTime(reportDate)

      drawText(`Data: ${formattedDate}`, margins.left, y, { size: 10 })
      y -= 15
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText(`Rota ID: ${rotaId}`, margins.left, y, { size: 10 })
      y -= 20
      drawLine(y)
      y -= 25

      drawText('SALDO DO ACERTO', margins.left, y, {
        size: 14,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(saldoAcerto)}`, width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 10
      drawLine(y)
      y -= 25

      drawText('RESUMO DE ENTRADA', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 25

      const drawRow = (label: string, val: number, boldVal = false) => {
        drawText(label, margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 10,
          align: 'right',
          font: boldVal ? fontBold : fontRegular,
        })
        y -= 15
      }

      drawRow('Dinheiro:', vDinheiro)
      drawRow('Pix:', vPix)
      drawRow('Cheque:', vCheque)

      y -= 5
      drawText('TOTAL ENTRADA:', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(totalEntrada)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 20
      drawLine(y)
      y -= 25

      drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 25

      drawText('TOTAL SAIDA (DESPESAS):', margins.left, y, { size: 10 })
      drawText(`R$ ${formatCurrency(vDespesas)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 20
      drawLine(y)
      y -= 25

      drawText('DETALHAMENTO DO ACERTO', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 25

      drawRow('Venda Total:', vendaTotal)
      drawRow('Desconto Total:', descontoTotal)

      y -= 5
      drawLine(y)
    }

    // --- CASH CLOSURE (FECHAMENTO DE CAIXA) - Standardized Layout (80mm) ---
    else if (
      isThermal &&
      (reportType === 'closing-confirmation' ||
        reportType === 'employee-cash-summary')
    ) {
      // ... (Keep existing logic)
      const { fechamento, date } = body
      const closingData = fechamento || body.data || {}

      const empName = closingData.funcionario?.nome_completo || 'Funcionario'
      const rotaId = closingData.rota_id || '-'
      const reportDate = closingData.created_at || date

      const saldoAcerto = closingData.saldo_acerto || 0
      const vDinheiro = closingData.valor_dinheiro || 0
      const vPix = closingData.valor_pix || 0
      const vCheque = closingData.valor_cheque || 0
      const totalEntrada = vDinheiro + vPix + vCheque
      const vDespesas = closingData.valor_despesas || 0
      const vendaTotal = closingData.venda_total || 0
      const descontoTotal = closingData.desconto_total || 0

      drawText('FACIL VENDAS', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 18
      drawText('FECHAMENTO DE CAIXA', width / 2, y, {
        size: 12,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      const formattedDate =
        safeFormatDate(reportDate) + ' ' + safeFormatTime(reportDate)
      drawText(`Data: ${formattedDate}`, margins.left, y, { size: 9 })
      y -= 12
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 9,
        font: fontBold,
      })
      y -= 12
      drawText(`Rota ID: ${rotaId}`, margins.left, y, { size: 9 })
      y -= 15

      drawLine(y)
      y -= 15

      drawText('SALDO DO ACERTO', margins.left, y, { size: 11, font: fontBold })
      drawText(`R$ ${formatCurrency(saldoAcerto)}`, width - margins.right, y, {
        size: 11,
        font: fontBold,
        align: 'right',
      })
      y -= 15

      drawLine(y)
      y -= 15

      drawText('RESUMO DE ENTRADA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      const drawRow = (label: string, val: number) => {
        drawText(label + ':', margins.left, y, { size: 9 })
        drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
          size: 9,
          align: 'right',
        })
        y -= 12
      }

      drawRow('Dinheiro', vDinheiro)
      drawRow('Pix', vPix)
      drawRow('Cheque', vCheque)

      y -= 3
      drawText('TOTAL ENTRADA:', margins.left, y, { size: 9, font: fontBold })
      drawText(`R$ ${formatCurrency(totalEntrada)}`, width - margins.right, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      y -= 15

      drawLine(y)
      y -= 15

      drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      drawText('TOTAL SAIDA (DESPESAS):', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(vDespesas)}`, width - margins.right, y, {
        size: 9,
        align: 'right',
      })
      y -= 15

      drawLine(y)
      y -= 15

      drawText('DETALHAMENTO DO ACERTO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      drawRow('Venda Total', vendaTotal)
      drawRow('Desconto Total', descontoTotal)

      y -= 15
      drawLine(y)
    }

    // --- ACERTO DETAILED THERMAL (Based on User Story / OCR Image) ---
    else if (
      isThermal &&
      (reportType === 'thermal-history' ||
        reportType === 'acerto' ||
        reportType === 'receipt')
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
        installments = [],
        history = [],
        detailedPayments = [],
        payments = [],
        totalItemsSold,
        totalQuantitySold,
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}`.substring(0, 45) // Trim
      const clientCity = `${client?.MUNICÍPIO || ''} - ${client?.ESTADO || ''}`

      // 1. Header
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
      drawLine(y, 1.5)
      y -= 12

      // Client Info
      const infoSize = 9
      drawText(`Cliente: ${clientCode} - ${clientName}`, margins.left, y, {
        size: infoSize,
        font: fontBold,
        maxWidth: width - 20,
      })
      y -= 12
      drawText(`End: ${clientAddress}...`, margins.left, y, {
        size: infoSize,
        maxWidth: width - 20,
      })
      y -= 12
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

      // 2. Items Section ("ITENS DO PEDIDO")
      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      // Ensure Alphabetical Sort for PDF
      const sortedItems = [...items].sort((a, b) =>
        (a.produtoNome || a.produto || '').localeCompare(
          b.produtoNome || b.produto || '',
        ),
      )

      if (sortedItems.length > 0) {
        for (const item of sortedItems) {
          checkPageBreak(80)

          // Product Name and Unit Price
          const prodName = `${item.produtoNome || item.produto} R$ ${formatCurrency(item.precoUnitario || item.preco)}`
          drawText(prodName, margins.left, y, {
            size: 9,
            font: fontBold,
            maxWidth: width - 20,
          })
          y -= 12

          // Stats (Right Aligned Values)
          const stats = [
            { label: 'Saldo Inicial:', val: String(item.saldoInicial || 0) },
            { label: 'Contagem:', val: String(item.contagem || 0) },
            { label: 'Qtd. Vendida:', val: String(item.quantVendida || 0) },
            { label: 'Saldo Final:', val: String(item.saldoFinal || 0) },
            {
              label: 'Total:',
              val: `R$ ${formatCurrency(item.valorVendido)}`,
              bold: true,
            },
          ]

          stats.forEach((stat) => {
            drawText(stat.label, margins.left, y, { size: 9 })
            drawText(stat.val, width - margins.right, y, {
              size: 9,
              align: 'right',
              font: stat.bold ? fontBold : fontRegular,
            })
            y -= 12
          })

          y -= 2 // Spacer
          drawLine(y, 0.5)
          y -= 12
        }
      }

      // 3. Totals Section
      y -= 5
      drawText('Total Vendido:', margins.left, y, { size: 9, font: fontBold })
      drawText(`R$ ${formatCurrency(totalVendido)}`, width - margins.right, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      y -= 12
      drawText('Desconto:', margins.left, y, { size: 9, font: fontBold })
      drawText(
        `R$ ${formatCurrency(valorDesconto)}`,
        width - margins.right,
        y,
        {
          size: 9,
          font: fontBold,
          align: 'right',
        },
      )
      y -= 12

      // New Metrics
      if (totalItemsSold !== undefined) {
        drawText('Total de produtos vendidos:', margins.left, y, {
          size: 9,
          font: fontBold,
        })
        drawText(String(totalItemsSold), width - margins.right, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        y -= 12
      }

      if (totalQuantitySold !== undefined) {
        drawText('Quantidade de produtos vendidos:', margins.left, y, {
          size: 9,
          font: fontBold,
        })
        drawText(String(totalQuantitySold), width - margins.right, y, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
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

      // NEW: VALOR PAGO Section
      const paymentsList =
        detailedPayments && detailedPayments.length > 0
          ? detailedPayments
          : payments

      if (paymentsList && paymentsList.length > 0) {
        checkPageBreak(60)
        drawText('VALOR PAGO', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Header Row
        drawText('Forma de Pagamento', margins.left, y, {
          size: 8,
          font: fontBold,
        })
        drawText('Valor', width - margins.right, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 10

        for (const pay of paymentsList) {
          checkPageBreak(20)
          // Use paidValue as it represents "Valor Pago".
          const pVal =
            pay.paidValue !== undefined
              ? Number(pay.paidValue)
              : Number(pay.value || 0)
          const pMethod = (
            pay.method ||
            pay.forma_pagamento ||
            'N/D'
          ).substring(0, 25)

          if (pVal > 0) {
            drawText(pMethod, margins.left, y, { size: 8 })
            drawText(`R$ ${formatCurrency(pVal)}`, width - margins.right, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          }
        }

        drawLine(y, 0.5)
        y -= 15
      }

      // 4. Installments Section ("VALORES A PAGAR (PARCELAS)")
      if (installments && installments.length > 0) {
        checkPageBreak(60)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Header Row
        drawText('Forma', margins.left, y, { size: 8, font: fontBold })
        drawText('Vencimento', width / 2, y, {
          size: 8,
          font: fontBold,
          align: 'center',
        })
        drawText('Valor', width - margins.right, y, {
          size: 8,
          font: fontBold,
          align: 'right',
        })
        y -= 5
        drawLine(y, 0.5)
        y -= 10

        let totalInstallments = 0
        installments.forEach((inst: any) => {
          checkPageBreak(20)
          const dateStr = safeFormatDate(inst.dueDate || inst.vencimento)
          const method = (
            inst.method ||
            inst.formaPagamento ||
            'Outros'
          ).substring(0, 15)
          const val = Number(inst.value || inst.valor || 0)
          totalInstallments += val

          drawText(method, margins.left, y, { size: 8 })
          drawText(dateStr, width / 2, y, { size: 8, align: 'center' })
          drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
            size: 8,
            align: 'right',
          })
          y -= 12
        })

        drawLine(y, 0.5)
        y -= 10
        drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalInstallments)}`,
          width - margins.right,
          y,
          {
            size: 9,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 15
        drawLine(y, 1.5)
        y -= 15
      }

      // 5. Signature
      checkPageBreak(60)
      y -= 30
      drawLine(y)
      y -= 10
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 20

      // 6. History Section ("RESUMO DE ACERTOS (HISTORICO)")
      if (history && history.length > 0) {
        checkPageBreak(80)
        drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const h of history) {
          checkPageBreak(45)

          const hDate = safeFormatDate(h.data || h.data_acerto)
          const hId = h.id || h.pedido_id
          const hSeller = h.vendedor || h.vendedor_nome || 'N/D'

          const valTotal = Number(h.valorVendaTotal || h.valor_venda || 0)
          const valAPagar = Number(h.saldoAPagar || h.saldo_a_pagar || valTotal)
          const valPago = Number(h.valorPago || h.valor_pago || 0)
          const valDeb = Number(h.debito || 0)
          const valMed = Number(h.mediaMensal || h.media_mensal || 0)

          // Line 1: Date #ID Seller
          drawText(`${hDate}   #${hId}`, margins.left, y, {
            size: 8,
            font: fontBold,
          })
          drawText(hSeller, width - margins.right, y, {
            size: 8,
            align: 'right',
            font: fontBold,
          })
          y -= 10

          // Line 2: V: ... A Pagar: ...
          drawText(`V: ${formatCurrency(valTotal)}`, margins.left, y, {
            size: 8,
          })
          drawText(
            `A Pagar: ${formatCurrency(valAPagar)}`,
            width - margins.right,
            y,
            { size: 8, align: 'right' },
          )
          y -= 10

          // Line 3: Pg: ... Deb: ... Med: ...
          // Using manual spacing estimation for simplicity as column alignment in pdf-lib is manual
          drawText(`Pg: ${formatCurrency(valPago)}`, margins.left, y, {
            size: 8,
          })

          // Deb (Red)
          const debText = `Deb: ${formatCurrency(valDeb)}`
          // Centered-ish
          drawText(debText, margins.left + 70, y, {
            size: 8,
            color: rgb(0.8, 0, 0),
          })

          // Med (Blue)
          drawText(`Med: ${formatCurrency(valMed)}`, width - margins.right, y, {
            size: 8,
            align: 'right',
            color: rgb(0, 0, 0.8),
          })

          y -= 15 // Gap between entries
        }
        drawLine(y)
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
