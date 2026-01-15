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
    const date = new Date(dateString)
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

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page
    let width
    let height
    let margins
    let y

    if (isThermal) {
      let estimatedHeight = 800 // Base
      if (
        reportType === 'cash-summary' ||
        reportType === 'employee-cash-summary'
      ) {
        const summaryCount = body.summaryData ? body.summaryData.length : 0
        const expensesCount = body.expenses ? body.expenses.length : 0
        const receiptsCount = body.receipts ? body.receipts.length : 0
        estimatedHeight =
          800 + summaryCount * 50 + expensesCount * 40 + receiptsCount * 40
      } else if (reportType === 'closing-confirmation') {
        const expensesCount = body.expenses ? body.expenses.length : 0
        const receiptsCount = body.receipts ? body.receipts.length : 0
        estimatedHeight = 800 + expensesCount * 40 + receiptsCount * 40
      } else {
        const itemsCount = body.items ? body.items.length : 0
        const historyCount = body.history ? body.history.length : 0
        const paymentsCount = body.payments ? body.payments.length : 0
        estimatedHeight =
          800 + itemsCount * 120 + historyCount * 100 + paymentsCount * 60
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
      if (maxWidth) {
        const width = finalFont.widthOfTextAtSize(cleanText, size)
        if (width > maxWidth) {
          const avgCharWidth = width / cleanText.length
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

    if (reportType === 'detailed-order-report') {
      const { header, items } = body

      drawText('RELATORIO DETALHADO DE PEDIDO', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 25
      drawLine(y)
      y -= 20

      // Header Info
      const headerLabels = [
        { l: 'Numero do Pedido:', v: header.orderId },
        { l: 'Cliente:', v: `${header.codigoCliente} - ${header.cliente}` },
        { l: 'Funcionario:', v: header.funcionario },
        { l: 'Data do Acerto:', v: safeFormatDate(header.dataAcerto) },
      ]

      for (const h of headerLabels) {
        drawText(h.l, margins.left, y, { size: 10, font: fontBold })
        drawText(String(h.v || '-'), margins.left + 120, y, { size: 10 })
        y -= 15
      }
      y -= 10
      drawLine(y)
      y -= 15

      // Table Header
      // Cols: Cod(30), Produto(140), Tipo(40), SI(40), Cont(40), QtdV(40), ValV(50), SF(40), NovCons(50), Dev(40)
      // Total approx: 510 width (A4 available ~515)
      const cols = [
        { label: 'Cod', x: margins.left, width: 30, align: 'left' },
        { label: 'Produto', x: margins.left + 35, width: 130, align: 'left' },
        { label: 'Tipo', x: margins.left + 170, width: 35, align: 'left' },
        { label: 'S.Ini', x: margins.left + 210, width: 35, align: 'right' },
        { label: 'Cont', x: margins.left + 250, width: 35, align: 'right' },
        { label: 'Qtd.V', x: margins.left + 290, width: 35, align: 'right' },
        { label: 'Val.V', x: margins.left + 330, width: 50, align: 'right' },
        { label: 'S.Fim', x: margins.left + 385, width: 35, align: 'right' },
        { label: 'N.Cons', x: margins.left + 425, width: 50, align: 'right' },
        { label: 'Dev', x: margins.left + 480, width: 35, align: 'right' },
      ]

      // Draw Header Row
      cols.forEach((col: any) => {
        const xPos = col.align === 'right' ? col.x + col.width : col.x
        drawText(col.label, xPos, y, {
          size: 8,
          font: fontBold,
          align: col.align,
        })
      })
      y -= 5
      drawLine(y)
      y -= 12

      // Draw Rows
      for (const item of items) {
        checkPageBreak(15)

        const formatVal = (v: any) => {
          if (v === null || v === undefined) return '-'
          return String(v)
        }

        const rowData = [
          { val: item.codProduto, colIdx: 0 },
          { val: item.produto, colIdx: 1 },
          { val: item.tipo, colIdx: 2 },
          { val: item.saldoInicial, colIdx: 3 },
          { val: item.contagem, colIdx: 4 },
          { val: item.quantidadeVendida, colIdx: 5 },
          { val: item.valorVendido, colIdx: 6 },
          { val: item.saldoFinal, colIdx: 7 },
          { val: item.novasConsignacoes, colIdx: 8 },
          { val: item.devolucoes, colIdx: 9 }, // RECOLHIDO -> Devoluções
        ]

        rowData.forEach((cell) => {
          const col: any = cols[cell.colIdx]
          const xPos = col.align === 'right' ? col.x + col.width : col.x
          drawText(formatVal(cell.val), xPos, y, {
            size: 8,
            align: col.align,
            maxWidth: col.width,
          })
        })
        y -= 12
      }

      drawLine(y)
    } else if (
      reportType === 'cash-summary' ||
      reportType === 'employee-cash-summary'
    ) {
      // Re-inserting cash summary logic
      const {
        summaryData,
        receipts,
        expenses,
        totalRecebido,
        totalDespesas,
        totalSaldo,
        saldoDeAcerto,
        periodo,
        employee,
        date,
      } = body

      drawText('FACIL VENDAS', width / 2, y, {
        size: isThermal ? 14 : 18,
        font: fontBold,
        align: 'center',
      })
      y -= 20
      drawText('RESUMO GERAL DO CAIXA', width / 2, y, {
        size: isThermal ? 12 : 14,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      drawText(
        `Gerado em: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
        margins.left,
        y,
        { size: 9 },
      )
      y -= 12
      drawText(
        `Rota: ${periodo.rotaId} (${safeFormatDate(periodo.inicio)} - ${periodo.fim ? safeFormatDate(periodo.fim) : 'Atual'})`,
        margins.left,
        y,
        { size: 9 },
      )
      y -= 15

      if (employee) {
        drawText(`Funcionario: ${employee.name}`, margins.left, y, {
          size: 10,
          font: fontBold,
        })
        y -= 15
      }

      drawLine(y)
      y -= 15

      drawText('TOTAL GERAL', width / 2, y, {
        size: 11,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      drawText('Entradas:', margins.left, y, { size: 10 })
      drawText(
        `R$ ${formatCurrency(totalRecebido)}`,
        width - margins.right,
        y,
        { size: 10, align: 'right', color: rgb(0, 0.5, 0) },
      )
      y -= 15

      drawText('Saidas (Caixa):', margins.left, y, { size: 10 })
      drawText(
        `R$ ${formatCurrency(totalDespesas)}`,
        width - margins.right,
        y,
        { size: 10, align: 'right', color: rgb(0.8, 0, 0) },
      )
      y -= 15

      drawText('Saldo Final:', margins.left, y, { size: 11, font: fontBold })
      drawText(`R$ ${formatCurrency(totalSaldo)}`, width - margins.right, y, {
        size: 11,
        align: 'right',
        font: fontBold,
      })
      y -= 15

      if (saldoDeAcerto !== undefined) {
        drawText('Saldo do Acerto:', margins.left, y, {
          size: 11,
          font: fontBold,
        })
        drawText(
          `R$ ${formatCurrency(saldoDeAcerto)}`,
          width - margins.right,
          y,
          { size: 11, align: 'right', font: fontBold, color: rgb(0, 0, 0.8) },
        )
        y -= 20
      }

      drawLine(y)
      y -= 15

      if (receipts) {
        checkPageBreak(80)
        drawText('DETALHAMENTO DAS ENTRADAS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        const totalDinheiro = receipts
          .filter((r: any) => r.forma === 'Dinheiro')
          .reduce((a: number, b: any) => a + b.valor, 0)
        const totalPix = receipts
          .filter((r: any) => r.forma === 'Pix')
          .reduce((a: number, b: any) => a + b.valor, 0)
        const totalCheque = receipts
          .filter((r: any) => r.forma === 'Cheque')
          .reduce((a: number, b: any) => a + b.valor, 0)

        drawText('Dinheiro:', margins.left, y, { size: 9 })
        drawText(
          `R$ ${formatCurrency(totalDinheiro)}`,
          width - margins.right,
          y,
          { size: 9, align: 'right' },
        )
        y -= 12

        drawText('Cheque:', margins.left, y, { size: 9 })
        drawText(
          `R$ ${formatCurrency(totalCheque)}`,
          width - margins.right,
          y,
          { size: 9, align: 'right' },
        )
        y -= 12

        drawText('Pix:', margins.left, y, { size: 9 })
        drawText(`R$ ${formatCurrency(totalPix)}`, width - margins.right, y, {
          size: 9,
          align: 'right',
        })
        y -= 15
        drawLine(y)
        y -= 15
      }

      if (receipts && receipts.length > 0) {
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
          const line = `${safeFormatDate(r.data)} - ${clientName.substring(0, isThermal ? 20 : 40)}`

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
          const empInitials = exp.funcionarioNome
            ? exp.funcionarioNome
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .substring(0, 3)
            : ''
          const desc = exp.detalhamento || exp.grupo
          const line = `${safeFormatDate(exp.data)} - ${desc.substring(0, isThermal ? 20 : 40)} (${empInitials})`
          drawText(line, margins.left, y, { size: 8 })
          drawText(formatCurrency(exp.valor), width - margins.right, y, {
            size: 8,
            align: 'right',
            color: exp.saiuDoCaixa ? rgb(0.8, 0, 0) : rgb(0.5, 0.5, 0.5),
          })
          y -= 10
        }
      }
    } else if (reportType === 'closing-confirmation') {
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

      y -= 10
      drawLine(y)
      y -= 20

      if (receipts && receipts.length > 0) {
        checkPageBreak(100)
        drawText('RESUMO DE ENTRADAS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15
        const grouped = {}
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
      // Acerto PDF logic (Recibo included)
      const {
        client,
        employee,
        items,
        date,
        acertoTipo,
        totalVendido,
        valorDesconto,
        valorAcerto,
        valorPago,
        debito,
        payments,
        monthlyAverage,
        orderNumber,
        issuerName,
        history,
        signature,
        isReceipt,
        clientMunicipio,
        lastOrder,
        lastAcertoDate,
      } = body

      const title = isReceipt
        ? 'RECIBO DE PAGAMENTO'
        : `PEDIDO ${orderNumber || 'PREVIEW'}`

      drawText('FACIL VENDAS', width / 2, y, {
        size: isThermal ? 16 : 20,
        font: fontBold,
        align: 'center',
      })
      y -= 25
      drawText(title, width / 2, y, {
        size: isThermal ? 14 : 16,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y)
      y -= 15

      drawText(
        `Cliente: ${client.CODIGO} - ${client['NOME CLIENTE']}`,
        margins.left,
        y,
        { size: 10, font: fontBold },
      )
      y -= 15
      drawText(
        `End: ${client['ENDEREÇO'] || '-'}, ${client['BAIRRO'] || '-'}`,
        margins.left,
        y,
        { size: 9 },
      )
      y -= 12
      drawText(
        `${clientMunicipio || client['MUNICÍPIO'] || '-'}`,
        margins.left,
        y,
        { size: 9 },
      )
      y -= 15
      drawText(
        `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
        margins.left,
        y,
        { size: 10 },
      )
      y -= 15
      if (employee) {
        drawText(
          `Vendedor: ${employee.nome_completo || employee.name}`,
          margins.left,
          y,
          { size: 10 },
        )
        y -= 15
      }
      drawLine(y)
      y -= 15

      // ITEMS SECTION (Hide Price Column)
      if (items && items.length > 0 && !isReceipt) {
        if (isThermal) {
          drawText('ITENS DO PEDIDO', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 20

          for (const item of items) {
            if (
              item.saldoInicial > 0 ||
              item.quantVendida > 0 ||
              item.valorVendido > 0 ||
              item.contagem > 0 ||
              item.saldoFinal > 0
            ) {
              checkPageBreak(120)
              // Hidden Price column as per requirement
              drawText(`${item.produtoNome}`, margins.left, y, {
                size: 10,
                font: fontBold,
                maxWidth: width - 20,
              })
              y -= 14
              drawText('Saldo Inicial:', margins.left, y, { size: 9 })
              drawText(item.saldoInicial.toString(), width - margins.right, y, {
                size: 9,
                align: 'right',
              })
              y -= 14
              drawText('Contagem:', margins.left, y, { size: 9 })
              drawText(item.contagem.toString(), width - margins.right, y, {
                size: 9,
                align: 'right',
              })
              y -= 14
              drawText('Qtd. Vendida:', margins.left, y, { size: 9 })
              drawText(item.quantVendida.toString(), width - margins.right, y, {
                size: 9,
                align: 'right',
                font: fontBold,
              })
              y -= 14
              drawText('Saldo Final:', margins.left, y, { size: 9 })
              drawText(item.saldoFinal.toString(), width - margins.right, y, {
                size: 9,
                align: 'right',
              })
              y -= 14
              drawText('Total:', margins.left, y, { size: 9, font: fontBold })
              drawText(
                `R$ ${formatCurrency(item.valorVendido)}`,
                width - margins.right,
                y,
                { size: 9, align: 'right', font: fontBold },
              )
              y -= 18
              page.drawLine({
                start: { x: margins.left, y: y + 8 },
                end: { x: width - margins.right, y: y + 8 },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8),
              })
            }
          }
        } else {
          // A4 Layout
          drawText('ITENS DO PEDIDO', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15
          // Updated Columns (Without Price)
          const colX = {
            prod: 40,
            si: 300,
            cont: 350,
            qtd: 400,
            val: 450,
            sf: 520,
          }
          drawText('PRODUTO', colX.prod, y, { size: 8, font: fontBold })
          drawText('S. INICIAL', colX.si, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('CONTAGEM', colX.cont, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('QTD VEND.', colX.qtd, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('V. VENDIDO', colX.val, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('S. FINAL', width - margins.right, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          y -= 5
          drawLine(y)
          y -= 12
          for (const item of items) {
            if (
              item.saldoInicial > 0 ||
              item.quantVendida > 0 ||
              item.valorVendido > 0 ||
              item.contagem > 0 ||
              item.saldoFinal > 0
            ) {
              checkPageBreak(20)
              drawText(item.produtoNome.substring(0, 50), colX.prod, y, {
                size: 8,
              })
              drawText(item.saldoInicial.toString(), colX.si, y, {
                size: 8,
                align: 'right',
              })
              drawText(item.contagem.toString(), colX.cont, y, {
                size: 8,
                align: 'right',
              })
              drawText(item.quantVendida.toString(), colX.qtd, y, {
                size: 8,
                align: 'right',
              })
              drawText(formatCurrency(item.valorVendido), colX.val, y, {
                size: 8,
                align: 'right',
              })
              drawText(item.saldoFinal.toString(), width - margins.right, y, {
                size: 8,
                align: 'right',
              })
              y -= 12
            }
          }
        }
        drawLine(y)
        y -= 15
      }

      if (!isReceipt) {
        checkPageBreak(80)
        drawText('Total Vendido:', margins.left, y, { size: 10 })
        drawText(
          `R$ ${formatCurrency(totalVendido)}`,
          width - margins.right,
          y,
          { size: 10, align: 'right' },
        )
        y -= 15
        if (valorDesconto > 0) {
          drawText('Desconto:', margins.left, y, { size: 10 })
          // REMOVE NEGATIVE SIGN
          drawText(
            `R$ ${formatCurrency(valorDesconto)}`,
            width - margins.right,
            y,
            { size: 10, align: 'right', color: rgb(1, 0, 0) },
          )
          y -= 15
        }
        drawText('TOTAL A PAGAR:', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        drawText(
          `R$ ${formatCurrency(valorAcerto)}`,
          width - margins.right,
          y,
          { size: 12, font: fontBold, align: 'right' },
        )
        y -= 20
        drawLine(y)
        y -= 15
      }

      // PAYMENTS SECTION - Filter > 0
      const activePayments = payments
        ? payments.filter((p: any) => p.paidValue > 0)
        : []

      if (activePayments.length > 0) {
        checkPageBreak(60)
        drawText('PAGAMENTOS', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15
        for (const p of activePayments) {
          checkPageBreak(20)
          const pMethod = p.method || 'Pagamento'
          const pValue = p.paidValue || 0
          drawText(pMethod, margins.left, y, { size: 10 })
          drawText(`R$ ${formatCurrency(pValue)}`, width - margins.right, y, {
            size: 10,
            align: 'right',
          })
          y -= 15
        }
        drawLine(y)
        y -= 15
      }

      // NEW SECTION: A PAGAR
      if (payments && payments.length > 0) {
        checkPageBreak(60)
        drawText('A PAGAR', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const p of payments) {
          // If detailed installments exist
          if (p.details && p.details.length > 0) {
            for (const detail of p.details) {
              if (checkPageBreak(20)) y -= 10
              const label = `${p.method} (${detail.number}/${p.installments}) - ${safeFormatDate(detail.dueDate)}`
              const val = detail.value || 0 // Full value of installment
              drawText(label, margins.left, y, { size: 9 })
              drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
                size: 9,
                align: 'right',
              })
              y -= 15
            }
          } else {
            // Fallback for single payment without details
            if (checkPageBreak(20)) y -= 10
            const label = `${p.method} (1/1) - ${safeFormatDate(p.dueDate)}`
            const val = p.value || 0
            drawText(label, margins.left, y, { size: 9 })
            drawText(`R$ ${formatCurrency(val)}`, width - margins.right, y, {
              size: 9,
              align: 'right',
            })
            y -= 15
          }
        }
        drawLine(y)
        y -= 15
      }

      checkPageBreak(60)
      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText('Valor Total Pago:', margins.left, y, { size: 10 })
      drawText(`R$ ${formatCurrency(valorPago)}`, width - margins.right, y, {
        size: 10,
        align: 'right',
        font: fontBold,
        color: rgb(0, 0.5, 0),
      })
      y -= 15
      if (debito > 0.01) {
        drawText('RESTANTE (DEBITO):', margins.left, y, {
          size: 11,
          font: fontBold,
          color: rgb(0.8, 0, 0),
        })
        drawText(`R$ ${formatCurrency(debito)}`, width - margins.right, y, {
          size: 11,
          align: 'right',
          font: fontBold,
          color: rgb(0.8, 0, 0),
        })
        y -= 20
      }
      drawLine(y)
      y -= 20

      if (!isReceipt) {
        const recentHistory =
          history && history.length > 0 ? history.slice(0, 10) : []
        if (recentHistory.length > 0) {
          checkPageBreak(100)
          if (isThermal) {
            drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
              size: 10,
              font: fontBold,
              align: 'center',
            })
            y -= 20
            for (const h of recentHistory) {
              checkPageBreak(120)
              const lines = [
                { l: 'Data:', v: safeFormatDate(h.data) },
                {
                  l: 'Venda:',
                  v: `R$ ${formatCurrency(h.valorVendaTotal)}`,
                },
                {
                  l: 'Desconto:',
                  v: `R$ ${formatCurrency(h.desconto || 0)}`,
                },
                { l: 'A pagar:', v: `R$ ${formatCurrency(h.saldoAPagar)}` },
                { l: 'Pago:', v: `R$ ${formatCurrency(h.valorPago)}` },
                {
                  l: 'Débito:',
                  v: `R$ ${formatCurrency(h.debito)}`,
                  bold: true,
                  color: h.debito > 0 ? rgb(0.8, 0, 0) : undefined,
                },
                { l: 'Vendedor:', v: h.vendedor || '-' },
                {
                  l: 'Média Mensal:',
                  v: `R$ ${formatCurrency(h.mediaMensal || 0)}`,
                },
                { l: 'Pedido:', v: `#${h.id}` },
              ]
              for (const line of lines) {
                drawText(line.l, margins.left, y, { size: 9 })
                drawText(line.v, width - margins.right, y, {
                  size: 9,
                  align: 'right',
                  font: line.bold ? fontBold : fontRegular,
                  color: line.color || rgb(0, 0, 0),
                })
                y -= 12
              }
              y -= 5
              page.drawLine({
                start: { x: margins.left, y: y + 2 },
                end: { x: width - margins.right, y: y + 2 },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8),
              })
              y -= 10
            }
          } else {
            // A4 History
            drawText('Resumo de Acertos (Histórico)', width / 2, y, {
              size: 10,
              font: fontBold,
              align: 'center',
            })
            y -= 15
            const colH = {
              ped: 40,
              dt: 80,
              mm: 160,
              sap: 240,
              vp: 320,
              deb: 400,
              vend: 480,
            }
            drawText('PEDIDO', colH.ped, y, { size: 8, font: fontBold })
            drawText('DATA', colH.dt, y, { size: 8, font: fontBold })
            drawText('MÉDIA', colH.mm, y, {
              size: 8,
              font: fontBold,
              align: 'right',
            })
            drawText('A PAGAR', colH.sap, y, {
              size: 8,
              font: fontBold,
              align: 'right',
            })
            drawText('PAGO', colH.vp, y, {
              size: 8,
              font: fontBold,
              align: 'right',
            })
            drawText('DÉBITO', colH.deb, y, {
              size: 8,
              font: fontBold,
              align: 'right',
            })
            drawText('VENDEDOR', width - margins.right, y, {
              size: 8,
              font: fontBold,
              align: 'right',
            })
            y -= 5
            drawLine(y)
            y -= 12
            for (const h of recentHistory) {
              checkPageBreak(20)
              drawText(h.id.toString(), colH.ped, y, { size: 8 })
              drawText(safeFormatDate(h.data), colH.dt, y, { size: 8 })
              drawText(formatCurrency(h.mediaMensal || 0), colH.mm, y, {
                size: 8,
                align: 'right',
              })
              drawText(formatCurrency(h.saldoAPagar), colH.sap, y, {
                size: 8,
                align: 'right',
              })
              drawText(formatCurrency(h.valorPago), colH.vp, y, {
                size: 8,
                align: 'right',
              })
              drawText(formatCurrency(h.debito), colH.deb, y, {
                size: 8,
                align: 'right',
                color: h.debito > 0 ? rgb(0.8, 0, 0) : rgb(0, 0, 0),
              })
              drawText(
                (h.vendedor || '-').substring(0, 15),
                width - margins.right,
                y,
                { size: 8, align: 'right' },
              )
              y -= 12
            }
          }
          y -= 10
          drawLine(y)
          y -= 20
        }
      }

      if (signature) {
        checkPageBreak(100)
        if (!isThermal && y > 150) {
          y = 150
        }
        try {
          const pngImage = await pdfDoc.embedPng(signature)
          const imgDims = pngImage.scale(0.25)
          y -= imgDims.height + 10
          page.drawImage(pngImage, {
            x: width / 2 - imgDims.width / 2,
            y: y,
            width: imgDims.width,
            height: imgDims.height,
          })
          y -= 10
        } catch {
          // Ignore sig error
        }
      } else {
        if (!isThermal && y > 100) y = 100
        y -= 40
      }
      drawLine(y)
      y -= 15
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 10,
        align: 'center',
      })
      y -= 15
      if (issuerName) {
        drawText(`Emitido por: ${issuerName}`, width / 2, y, {
          size: 8,
          align: 'center',
          color: rgb(0.5, 0.5, 0.5),
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
