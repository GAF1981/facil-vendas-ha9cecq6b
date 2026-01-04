import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatCurrency = (value: number) => {
  return value.toFixed(2).replace('.', ',')
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    // Expecting YYYY-MM-DD
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    // Fallback
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString || '-'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { reportType } = body

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const margins = { top: 50, bottom: 50, left: 40, right: 40 }
    let y = height - margins.top

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
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
        rotate = undefined,
      } = options
      const cleanText = removeAccents(text || '')
      const textWidth = font.widthOfTextAtSize(cleanText, size)
      let xPos = x
      if (!rotate) {
        if (align === 'right') xPos = x - textWidth
        if (align === 'center') xPos = x - textWidth / 2
      }
      page.drawText(cleanText, { x: xPos, y: yPos, size, font, color, rotate })
      return textWidth
    }

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        page = pdfDoc.addPage()
        y = height - margins.top
        return true
      }
      return false
    }

    // --- CLOSING CONFIRMATION ---
    if (reportType === 'closing-confirmation') {
      const { data, date } = body

      drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
      drawText('COMPROVANTE DE FECHAMENTO', width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 25

      drawText(`Data Emissao: ${safeFormatDate(date)}`, margins.left, y, {
        size: 10,
      })
      y -= 20

      // Info Box
      const boxHeight = 80
      page.drawRectangle({
        x: margins.left,
        y: y - boxHeight,
        width: width - margins.left - margins.right,
        height: boxHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })

      const infoY = y - 20
      drawText(`Rota: #${data.rota_id}`, margins.left + 10, infoY, {
        size: 12,
        font: fontBold,
      })
      drawText(
        `Funcionario: ${data.funcionario?.nome_completo || 'N/D'}`,
        margins.left + 10,
        infoY - 20,
        { size: 10 },
      )

      if (data.responsavel?.nome_completo) {
        drawText(
          `Responsavel (Conferencia): ${data.responsavel.nome_completo}`,
          margins.left + 10,
          infoY - 40,
          { size: 10 },
        )
      }

      drawText(
        `Status: ${data.status.toUpperCase()}`,
        width - margins.right - 10,
        infoY,
        { size: 12, font: fontBold, align: 'right', color: rgb(0, 0.5, 0) },
      )

      y -= boxHeight + 30

      // Financials
      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 12,
        font: fontBold,
      })
      y -= 20

      drawText('Venda Total:', margins.left, y, { size: 10 })
      drawText(
        `R$ ${formatCurrency(data.venda_total)}`,
        width - margins.right,
        y,
        { size: 10, align: 'right', font: fontBold },
      )
      y -= 15

      drawText('Descontos:', margins.left, y, { size: 10 })
      drawText(
        `R$ ${formatCurrency(data.desconto_total)}`,
        width - margins.right,
        y,
        { size: 10, align: 'right', color: rgb(0.8, 0, 0) },
      )
      y -= 15

      drawText('A Receber (Divida):', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      drawText(
        `R$ ${formatCurrency(data.valor_a_receber)}`,
        width - margins.right,
        y,
        { size: 10, align: 'right', font: fontBold, color: rgb(0.8, 0, 0) },
      )
      y -= 30

      // Conference
      drawText('CONFERENCIA DE VALORES', margins.left, y, {
        size: 12,
        font: fontBold,
      })
      y -= 5
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: width - margins.right, y },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      y -= 20

      const drawRow = (
        label: string,
        value: number,
        approved: boolean,
        colorOverride?: any,
      ) => {
        drawText(label, margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(value)}`, width / 2, y, {
          size: 10,
          align: 'right',
          font: fontBold,
          color: colorOverride,
        })
        drawText(
          approved ? '[ APROVADO ]' : '[ REPROVADO ]',
          width - margins.right,
          y,
          {
            size: 10,
            align: 'right',
            font: fontBold,
            color: approved ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0),
          },
        )
        y -= 20
      }

      drawRow('Dinheiro Entregue', data.valor_dinheiro, data.dinheiro_aprovado)
      drawRow(
        'PIX Confirmado',
        data.valor_pix,
        data.pix_aprovado,
        rgb(0.5, 0, 0.5),
      )
      drawRow(
        'Cheques',
        data.valor_cheque,
        data.cheque_aprovado,
        rgb(0, 0, 0.8),
      )

      if (data.valor_despesas > 0) {
        drawRow(
          'Despesas (Saidas)',
          data.valor_despesas,
          data.despesas_aprovadas,
          rgb(0.8, 0, 0),
        )
      }

      y -= 40

      // Signatures
      const sigLineLength = 200
      const sigY = y
      const sigTextY = y - 15

      // Left Signature
      page.drawLine({
        start: { x: margins.left, y: sigY },
        end: { x: margins.left + sigLineLength, y: sigY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      drawText(
        'Assinatura do Responsavel',
        margins.left + sigLineLength / 2,
        sigTextY,
        { size: 9, align: 'center' },
      )

      // Right Signature
      page.drawLine({
        start: { x: width - margins.right - sigLineLength, y: sigY },
        end: { x: width - margins.right, y: sigY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      drawText(
        'Assinatura do Funcionario',
        width - margins.right - sigLineLength / 2,
        sigTextY,
        { size: 9, align: 'center' },
      )
    } else if (
      reportType === 'cash-summary' ||
      reportType === 'employee-cash-summary'
    ) {
      // ... (Existing code for other reports)
      const {
        summaryData,
        receipts,
        expenses,
        totalRecebido,
        totalDespesas,
        totalSaldo,
        periodo,
        date,
        employee,
      } = body

      const title =
        reportType === 'employee-cash-summary'
          ? `RELATORIO DE CAIXA - ${employee?.name.toUpperCase()}`
          : 'RESUMO GERAL DE CAIXA'

      // Header
      drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
      drawText(title, width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 25

      drawText(`Data Emissao: ${safeFormatDate(date)}`, margins.left, y, {
        size: 10,
      })
      y -= 15
      drawText(
        `Periodo Rota #${periodo.rotaId}: ${safeFormatDate(periodo.inicio)} - ${periodo.fim ? safeFormatDate(periodo.fim) : 'Atual'}`,
        margins.left,
        y,
        { size: 10 },
      )
      y -= 30

      // Totals Box
      const boxHeight = 80
      page.drawRectangle({
        x: margins.left,
        y: y - boxHeight,
        width: width - margins.left - margins.right,
        height: boxHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })

      const textY = y - 20
      drawText('TOTAL DO PERIODO', width / 2, textY, {
        size: 12,
        font: fontBold,
        align: 'center',
      })

      const col1X = margins.left + 50
      const col2X = width / 2
      const col3X = width - margins.right - 50

      const valY = textY - 30

      drawText('Total Recebido', col1X, valY + 10, {
        size: 10,
        align: 'center',
        color: rgb(0, 0.5, 0),
      })
      drawText(`R$ ${formatCurrency(totalRecebido)}`, col1X, valY - 5, {
        size: 12,
        font: fontBold,
        align: 'center',
        color: rgb(0, 0.5, 0),
      })

      drawText('Total Despesas', col2X, valY + 10, {
        size: 10,
        align: 'center',
        color: rgb(0.8, 0, 0),
      })
      drawText(`R$ ${formatCurrency(totalDespesas)}`, col2X, valY - 5, {
        size: 12,
        font: fontBold,
        align: 'center',
        color: rgb(0.8, 0, 0),
      })

      drawText('Saldo Final', col3X, valY + 10, {
        size: 10,
        align: 'center',
        color: rgb(0, 0, 0.8),
      })
      drawText(`R$ ${formatCurrency(totalSaldo)}`, col3X, valY - 5, {
        size: 12,
        font: fontBold,
        align: 'center',
        color: rgb(0, 0, 0.8),
      })

      y -= boxHeight + 30

      // If general summary, show summary table
      if (
        reportType === 'cash-summary' &&
        summaryData &&
        summaryData.length > 0
      ) {
        drawText('BALANCO POR FUNCIONARIO', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 15

        const colX = {
          name: margins.left,
          rec: 250,
          exp: 350,
          bal: 450,
        }

        const drawSummaryHeaders = (currY: number) => {
          drawText('Funcionario', colX.name, currY, {
            size: 10,
            font: fontBold,
          })
          drawText('Recebido', colX.rec, currY, {
            size: 10,
            font: fontBold,
            align: 'right',
          })
          drawText('Despesas', colX.exp, currY, {
            size: 10,
            font: fontBold,
            align: 'right',
          })
          drawText('Saldo', colX.bal, currY, {
            size: 10,
            font: fontBold,
            align: 'right',
          })
          return currY - 15
        }

        y = drawSummaryHeaders(y)
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 1,
          color: rgb(0, 0, 0),
        })
        y -= 15

        for (const row of summaryData) {
          if (checkPageBreak(20)) {
            y = drawSummaryHeaders(y)
            page.drawLine({
              start: { x: margins.left, y },
              end: { x: width - margins.right, y },
              thickness: 1,
              color: rgb(0, 0, 0),
            })
            y -= 15
          }

          drawText(row.funcionarioNome, colX.name, y, { size: 10 })
          drawText(`R$ ${formatCurrency(row.totalRecebido)}`, colX.rec, y, {
            size: 10,
            align: 'right',
            color: rgb(0, 0.5, 0),
          })
          drawText(`R$ ${formatCurrency(row.totalDespesas)}`, colX.exp, y, {
            size: 10,
            align: 'right',
            color: rgb(0.8, 0, 0),
          })
          drawText(`R$ ${formatCurrency(row.saldo)}`, colX.bal, y, {
            size: 10,
            font: fontBold,
            align: 'right',
            color: row.saldo >= 0 ? rgb(0, 0, 0.8) : rgb(0.8, 0, 0),
          })

          y -= 20
        }
        y -= 20
      }

      // Detailed Receipts Table
      checkPageBreak(60)
      drawText('DETALHAMENTO DE RECEITAS (ENTRADAS)', margins.left, y, {
        size: 12,
        font: fontBold,
      })
      y -= 15

      const recColX = {
        date: margins.left,
        client: margins.left + 90,
        desc: margins.left + 250,
        val: width - margins.right,
      }

      const drawReceiptHeaders = (currY: number) => {
        drawText('Data/Hora', recColX.date, currY, { size: 9, font: fontBold })
        drawText('Cliente', recColX.client, currY, { size: 9, font: fontBold })
        drawText('Forma/Func.', recColX.desc, currY, {
          size: 9,
          font: fontBold,
        })
        drawText('Valor', recColX.val, currY, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        return currY - 10
      }

      y = drawReceiptHeaders(y)
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: width - margins.right, y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      })
      y -= 15

      if (receipts && receipts.length > 0) {
        for (const rec of receipts) {
          if (checkPageBreak(20)) {
            y = drawReceiptHeaders(y)
            page.drawLine({
              start: { x: margins.left, y },
              end: { x: width - margins.right, y },
              thickness: 0.5,
              color: rgb(0.5, 0.5, 0.5),
            })
            y -= 15
          }

          drawText(safeFormatDate(rec.data), recColX.date, y, { size: 8 })
          drawText(rec.clienteNome.substring(0, 30), recColX.client, y, {
            size: 8,
          })
          drawText(
            `${rec.forma}${rec.funcionarioNome ? ` - ${rec.funcionarioNome.split(' ')[0]}` : ''}`,
            recColX.desc,
            y,
            { size: 8 },
          )
          drawText(formatCurrency(rec.valor), recColX.val, y, {
            size: 8,
            align: 'right',
            color: rgb(0, 0.5, 0),
          })
          y -= 12
        }
      } else {
        drawText('Nenhum recebimento registrado.', margins.left, y, {
          size: 9,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 15
      }

      y -= 20

      // Detailed Expenses Table
      checkPageBreak(60)
      drawText('DETALHAMENTO DE DESPESAS (SAIDAS)', margins.left, y, {
        size: 12,
        font: fontBold,
      })
      y -= 15

      const expColX = {
        date: margins.left,
        group: margins.left + 60,
        detail: margins.left + 160,
        val: width - margins.right,
      }

      const drawExpenseHeaders = (currY: number) => {
        drawText('Data', expColX.date, currY, { size: 9, font: fontBold })
        drawText('Grupo', expColX.group, currY, { size: 9, font: fontBold })
        drawText('Detalhamento', expColX.detail, currY, {
          size: 9,
          font: fontBold,
        })
        drawText('Valor', expColX.val, currY, {
          size: 9,
          font: fontBold,
          align: 'right',
        })
        return currY - 10
      }

      y = drawExpenseHeaders(y)
      page.drawLine({
        start: { x: margins.left, y },
        end: { x: width - margins.right, y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      })
      y -= 15

      if (expenses && expenses.length > 0) {
        for (const exp of expenses) {
          if (checkPageBreak(20)) {
            y = drawExpenseHeaders(y)
            page.drawLine({
              start: { x: margins.left, y },
              end: { x: width - margins.right, y },
              thickness: 0.5,
              color: rgb(0.5, 0.5, 0.5),
            })
            y -= 15
          }

          const shortDate = formatDate(exp.data.split('T')[0])

          drawText(shortDate, expColX.date, y, { size: 8 })
          drawText(exp.grupo, expColX.group, y, { size: 8 })

          let detailText = exp.detalhamento
          if (exp.funcionarioNome) {
            detailText += ` (${exp.funcionarioNome.split(' ')[0]})`
          }
          drawText(detailText.substring(0, 40), expColX.detail, y, { size: 8 })

          drawText(formatCurrency(exp.valor), expColX.val, y, {
            size: 8,
            align: 'right',
            color: rgb(0.8, 0, 0),
          })
          y -= 12
        }
      } else {
        drawText('Nenhuma despesa registrada.', margins.left, y, {
          size: 9,
          color: rgb(0.5, 0.5, 0.5),
        })
        y -= 15
      }
    } else {
      // --- RECEIPT / ACERTO LOGIC (Existing) ---
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
        history,
        preview,
        signature,
        orderNumber,
        isReceipt,
        issuerName,
      } = body

      // PDF Preview Warning
      if (preview) {
        drawText(
          "esse 'PDF é somente para visualização e confirmação do pedido'",
          width / 2,
          y + 20,
          {
            size: 14,
            font: fontBold,
            align: 'center',
            color: rgb(1, 0, 0),
          },
        )
        y -= 10
      }

      // Header
      const title = isReceipt
        ? 'RECIBO DE PAGAMENTO'
        : `Comprovante de ${acertoTipo}`
      drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
      drawText(title, width - margins.right, y, {
        size: 14,
        font: fontBold,
        align: 'right',
      })
      y -= 25

      const dateStr = new Date(date).toLocaleString('pt-BR')
      drawText(`Data: ${dateStr}`, margins.left, y, { size: 10 })

      // Enhanced Header: Vendedor AND Issuer
      drawText(
        `Vendedor: ${employee.nome_completo}`,
        width - margins.right,
        y,
        {
          size: 10,
          align: 'right',
        },
      )
      y -= 12

      if (issuerName) {
        drawText(`Emissor: ${issuerName}`, width - margins.right, y, {
          size: 9,
          align: 'right',
          color: rgb(0.4, 0.4, 0.4),
        })
      }
      y -= 10

      // Order Number in Header
      if (orderNumber) {
        drawText(`NUMERO DO PEDIDO: ${orderNumber}`, margins.left, y, {
          size: 10,
          font: fontBold,
        })
        y -= 20
      } else {
        y -= 5
      }

      // Client Info Box
      checkPageBreak(80)
      const boxHeight = 70
      page.drawRectangle({
        x: margins.left,
        y: y - boxHeight,
        width: width - margins.left - margins.right,
        height: boxHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      })

      const textY = y - 15
      drawText('DADOS DO CLIENTE', margins.left + 10, textY, {
        size: 10,
        font: fontBold,
      })
      drawText(
        `Nome: ${client['NOME CLIENTE']} (Cod: ${client.CODIGO})`,
        margins.left + 10,
        textY - 15,
        { size: 9 },
      )
      drawText(
        `Endereco: ${client.ENDEREÇO || '-'}`,
        margins.left + 10,
        textY - 30,
        { size: 9 },
      )
      drawText(
        `Cidade: ${client.MUNICÍPIO || '-'} - ${client.BAIRRO || '-'}`,
        margins.left + 10,
        textY - 45,
        { size: 9 },
      )
      drawText(
        `Contato: ${client['CONTATO 1'] || '-'} / ${client['FONE 1'] || '-'}`,
        width / 2,
        textY - 15,
        { size: 9 },
      )

      y -= boxHeight + 20

      if (items && items.length > 0) {
        drawText('ITENS DO PEDIDO', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 15

        // Table Headers
        const colX = {
          prod: margins.left,
          tipo: 220,
          saldoIni: 300,
          cont: 355,
          venda: 415,
          total: 485,
          saldoFin: 555,
        }

        const headerHeight = 60

        const drawHeaders = (currentY: number) => {
          drawText('Produto', colX.prod, currentY, { size: 8, font: fontBold })
          drawText('Tipo', colX.tipo, currentY, { size: 8, font: fontBold })

          const headers = [
            { text: 'Saldo Inicial', x: colX.saldoIni },
            { text: 'Contagem', x: colX.cont },
            { text: 'Qtd. Vendida', x: colX.venda },
            { text: 'Valor Total', x: colX.total },
            { text: 'Saldo Final', x: colX.saldoFin },
          ]

          headers.forEach((h) => {
            drawText(h.text, h.x - 12, currentY, {
              size: 8,
              font: fontBold,
              rotate: degrees(90),
            })
          })
        }

        y -= headerHeight
        drawHeaders(y)

        y -= 5
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        })
        y -= 15

        for (const item of items) {
          if (checkPageBreak(20)) {
            y -= headerHeight
            drawHeaders(y)
            y -= 10
            page.drawLine({
              start: { x: margins.left, y },
              end: { x: width - margins.right, y },
              thickness: 1,
              color: rgb(0.8, 0.8, 0.8),
            })
            y -= 15
          }

          const name = (item.produtoNome || '').substring(0, 35)
          drawText(`${item.produtoCodigo || '-'} ${name}`, colX.prod, y, {
            size: 8,
          })

          drawText((item.tipo || '-').substring(0, 10), colX.tipo, y, {
            size: 8,
          })

          drawText(String(item.saldoInicial), colX.saldoIni, y, {
            size: 8,
            align: 'right',
          })
          drawText(String(item.contagem), colX.cont, y, {
            size: 8,
            align: 'right',
          })
          drawText(String(item.quantVendida), colX.venda, y, {
            size: 8,
            align: 'right',
          })
          drawText(formatCurrency(item.valorVendido), colX.total, y, {
            size: 8,
            align: 'right',
          })
          drawText(String(item.saldoFinal), colX.saldoFin, y, {
            size: 8,
            align: 'right',
          })

          y -= 12
        }

        y -= 10
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 1,
          color: rgb(0, 0, 0),
        })
        y -= 20
      }

      // Financial Summary
      checkPageBreak(120)

      const valueX = margins.left + 140

      drawText('RESUMO FINANCEIRO', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText('Total Vendido:', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(totalVendido)}`, valueX, y, {
        size: 9,
        align: 'right',
      })
      y -= 12

      if (valorDesconto > 0) {
        drawText('Desconto:', margins.left, y, { size: 9 })
        drawText(`R$ ${formatCurrency(valorDesconto)}`, valueX, y, {
          size: 9,
          align: 'right',
          color: rgb(1, 0, 0),
        })
        y -= 12
      }

      drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, valueX, y, {
        size: 9,
        font: fontBold,
        align: 'right',
      })
      y -= 12

      drawText('Valor Pago:', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(valorPago)}`, valueX, y, {
        size: 9,
        align: 'right',
      })
      y -= 12

      if (debito > 0) {
        drawText('Debito Restante:', margins.left, y, { size: 9 })
        drawText(`R$ ${formatCurrency(debito)}`, valueX, y, {
          size: 9,
          align: 'right',
          color: rgb(1, 0, 0),
        })
        y -= 12
      }

      y -= 20

      // Payments Detail
      checkPageBreak(100)
      drawText('DETALHES DO PAGAMENTO', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15

      if (payments && payments.length > 0) {
        for (const pay of payments) {
          if (checkPageBreak(20)) {
            drawText('DETALHES DO PAGAMENTO (cont.)', margins.left, y, {
              size: 10,
              font: fontBold,
            })
            y -= 15
          }

          drawText(
            `${pay.method} - R$ ${formatCurrency(pay.value)} (${pay.installments}x)`,
            margins.left,
            y,
            { size: 9, font: fontBold },
          )
          y -= 12

          if (pay.details && pay.details.length > 0) {
            for (const inst of pay.details) {
              checkPageBreak(15)
              const dateInst = new Date(inst.dueDate).toLocaleDateString(
                'pt-BR',
              )
              drawText(
                `Parcela ${inst.number}: R$ ${formatCurrency(inst.value)} - Venc: ${dateInst}`,
                margins.left + 20,
                y,
                { size: 8, color: rgb(0.4, 0.4, 0.4) },
              )
              y -= 10
            }
            y -= 5
          } else if (pay.installments === 1) {
            const dateInst = new Date(pay.dueDate).toLocaleDateString('pt-BR')
            drawText(`Vencimento: ${dateInst}`, margins.left + 20, y, {
              size: 8,
              color: rgb(0.4, 0.4, 0.4),
            })
            y -= 15
          }
        }
      } else {
        drawText('Nenhum pagamento registrado.', margins.left, y, { size: 9 })
      }

      y -= 40

      // Signatures Section (Always visible)
      checkPageBreak(120)

      const sigLineLength = 200
      const sigY = y
      const sigTextY = y - 15

      // Client Signature Line (Left)
      page.drawLine({
        start: { x: margins.left, y: sigY },
        end: { x: margins.left + sigLineLength, y: sigY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      drawText(
        'Assinatura do Cliente',
        margins.left + sigLineLength / 2,
        sigTextY,
        {
          size: 9,
          align: 'center',
        },
      )

      // Employee Signature Line (Right)
      page.drawLine({
        start: { x: width - margins.right - sigLineLength, y: sigY },
        end: { x: width - margins.right, y: sigY },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
      drawText(
        'Assinatura do Funcionário',
        width - margins.right - sigLineLength / 2,
        sigTextY,
        {
          size: 9,
          align: 'center',
        },
      )

      // Overlay Client Signature Image if present
      if (signature) {
        try {
          const base64Data = signature.split(',')[1]
          const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0),
          )
          const image = await pdfDoc.embedPng(imageBytes)
          const imageDims = image.scale(0.4)

          const imgX = margins.left + (sigLineLength - imageDims.width) / 2
          const imgY = sigY + 5

          page.drawImage(image, {
            x: imgX,
            y: imgY,
            width: imageDims.width,
            height: imageDims.height,
          })
        } catch (e) {
          console.error('Error embedding signature image:', e)
        }
      }

      y -= 50

      if (history && history.length > 0) {
        checkPageBreak(150)
        drawText('RESUMO DE ACERTOS (HISTÓRICO)', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        y -= 15

        const histX = {
          id: margins.left,
          data: margins.left + 40,
          vend: margins.left + 90,
          media: margins.left + 260,
          venda: margins.left + 330,
          saldo: margins.left + 400,
          pago: margins.left + 470,
          debito: margins.left + 540,
        }

        drawText('Pedido', histX.id, y, { size: 7, font: fontBold })
        drawText('Data', histX.data, y, { size: 7, font: fontBold })
        drawText('Vendedor', histX.vend, y, { size: 7, font: fontBold })
        drawText('Média', histX.media, y, {
          size: 7,
          font: fontBold,
          align: 'right',
        })
        drawText('Venda', histX.venda, y, {
          size: 7,
          font: fontBold,
          align: 'right',
        })
        drawText('Saldo', histX.saldo, y, {
          size: 7,
          font: fontBold,
          align: 'right',
        })
        drawText('Pago', histX.pago, y, {
          size: 7,
          font: fontBold,
          align: 'right',
        })
        drawText('Débito', histX.debito, y, {
          size: 7,
          font: fontBold,
          align: 'right',
        })

        y -= 5
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: width - margins.right, y },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
        })
        y -= 10

        for (const row of history) {
          if (checkPageBreak(15)) {
            drawText('RESUMO DE ACERTOS (HISTÓRICO) (cont.)', margins.left, y, {
              size: 8,
              font: fontBold,
            })
            y -= 15
          }

          drawText(String(row.id || '-'), histX.id, y, { size: 7 })
          drawText(formatDate(row.data), histX.data, y, { size: 7 })

          drawText((row.vendedor || '-').substring(0, 30), histX.vend, y, {
            size: 7,
          })

          drawText(
            row.mediaMensal !== null ? formatCurrency(row.mediaMensal) : '-',
            histX.media,
            y,
            {
              size: 7,
              align: 'right',
              color: rgb(0.5, 0.5, 0.5),
            },
          )

          drawText(formatCurrency(row.valorVendaTotal), histX.venda, y, {
            size: 7,
            align: 'right',
          })
          drawText(formatCurrency(row.saldoAPagar), histX.saldo, y, {
            size: 7,
            align: 'right',
            color: rgb(0, 0.2, 0.8),
          })
          drawText(formatCurrency(row.valorPago), histX.pago, y, {
            size: 7,
            align: 'right',
            color: rgb(0, 0.5, 0),
          })

          const debitoVal = Math.max(0, row.debito)
          drawText(formatCurrency(debitoVal), histX.debito, y, {
            size: 7,
            align: 'right',
            color: debitoVal > 0.01 ? rgb(0.8, 0, 0) : rgb(0.6, 0.6, 0.6),
          })

          y -= 10
        }
      }
    }

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
