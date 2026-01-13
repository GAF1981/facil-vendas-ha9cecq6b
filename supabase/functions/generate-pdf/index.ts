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
      // Basic setup for thermal - dynamic height estimation
      let estimatedHeight = 800 // Default
      if (
        reportType === 'cash-summary' ||
        reportType === 'employee-cash-summary'
      ) {
        const summaryCount = body.summaryData ? body.summaryData.length : 0
        const expensesCount = body.expenses ? body.expenses.length : 0
        estimatedHeight = 600 + summaryCount * 50 + expensesCount * 60
      }

      page = pdfDoc.addPage([226, Math.max(842, estimatedHeight)])
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
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
        rotate = undefined,
      } = options

      const finalFont = isThermal ? fontBold : font
      const finalColor = isThermal ? rgb(0, 0, 0) : color

      const cleanText = removeAccents(text || '')
      const textWidth = finalFont.widthOfTextAtSize(cleanText, size)
      let xPos = x
      if (!rotate) {
        if (align === 'right') xPos = x - textWidth
        if (align === 'center') xPos = x - textWidth / 2
      }
      page.drawText(cleanText, {
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

    if (reportType === 'closing-confirmation') {
      const { fechamento, date } = body
      const empName = fechamento.funcionario?.nome_completo || 'N/D'

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
        {
          size: 10,
        },
      )
      y -= 15
      drawText(`Funcionario: ${empName}`, margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15
      drawText(`Rota ID: ${fechamento.rota_id}`, margins.left, y, { size: 10 })
      y -= 20
      drawLine(y)
      y -= 20

      // Totals
      const rows = [
        { l: 'Venda Total', v: fechamento.venda_total },
        { l: 'Desconto Total', v: fechamento.desconto_total },
        { l: 'Valor a Receber', v: fechamento.valor_a_receber, bold: true },
        { l: 'Dinheiro', v: fechamento.valor_dinheiro },
        { l: 'Pix', v: fechamento.valor_pix },
        { l: 'Cheque', v: fechamento.valor_cheque },
        { l: 'Despesas', v: fechamento.valor_despesas, color: rgb(1, 0, 0) },
      ]

      for (const row of rows) {
        drawText(row.l, margins.left, y, {
          size: 10,
          font: row.bold ? fontBold : fontRegular,
        })
        drawText(`R$ ${formatCurrency(row.v)}`, width - margins.right, y, {
          size: 10,
          align: 'right',
          font: row.bold ? fontBold : fontRegular,
          color: row.color,
        })
        y -= 15
      }

      y -= 10
      drawLine(y)
      y -= 30

      // Signature area
      if (!isThermal) {
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
    } else if (
      reportType === 'cash-summary' ||
      reportType === 'employee-cash-summary'
    ) {
      const {
        summaryData,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        receipts,
        expenses,
        totalRecebido,
        totalDespesas,
        totalSaldo,
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
        {
          size: 9,
        },
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

      // OVERALL TOTALS
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
      y -= 20
      drawLine(y)
      y -= 15

      // PER EMPLOYEE SUMMARY (Only if generic report)
      if (
        reportType === 'cash-summary' &&
        summaryData &&
        summaryData.length > 0
      ) {
        checkPageBreak(100)
        drawText('RESUMO POR FUNCIONARIO', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        y -= 15

        for (const row of summaryData) {
          if (checkPageBreak(40)) y -= 10
          drawText(row.funcionarioNome.substring(0, 20), margins.left, y, {
            size: 9,
            font: fontBold,
          })
          y -= 12
          drawText(
            `Rec: ${formatCurrency(row.totalRecebido)} | Desp: ${formatCurrency(row.totalDespesas)}`,
            margins.left,
            y,
            { size: 9 },
          )
          drawText(
            `Saldo: ${formatCurrency(row.saldo)}`,
            width - margins.right,
            y,
            { size: 9, align: 'right', font: fontBold },
          )
          y -= 15
        }
        y -= 10
        drawLine(y)
        y -= 15
      }

      // EXPENSES LIST
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
          const line = `${safeFormatDate(exp.data)} - ${desc.substring(0, 20)} (${empInitials})`

          drawText(line, margins.left, y, { size: 8 })
          drawText(formatCurrency(exp.valor), width - margins.right, y, {
            size: 8,
            align: 'right',
            color: exp.saiuDoCaixa ? rgb(0.8, 0, 0) : rgb(0.5, 0.5, 0.5),
          })
          y -= 10
        }
      }
    } else {
      // Default to Acerto/Receipt Logic (existing code)
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
        clientMunicipio,
        lastAcertoDate,
        lastOrder,
        monthlyAverage,
      } = body

      // ... (Paste existing Acerto logic here, wrapped in else block)
      // Since I am overwriting the file, I must include the FULL existing logic + new logic.
      // I will copy the logic from the previously provided file in context and adapt.

      if (isThermal) {
        if (preview) {
          drawText('PREVIA DE VISUALIZACAO', width / 2, y, {
            size: 12,
            font: fontBold,
            align: 'center',
          })
          y -= 20
        }

        drawText('FACIL VENDAS', width / 2, y, {
          size: 14,
          font: fontBold,
          align: 'center',
        })
        y -= 15
        const title = isReceipt ? 'RECIBO' : acertoTipo.toUpperCase()
        drawText(title, width / 2, y, {
          size: 12,
          font: fontBold,
          align: 'center',
        })
        y -= 10
        drawLine(y)
        y -= 15

        if (orderNumber) {
          drawText(`PEDIDO: ${orderNumber}`, margins.left, y, {
            size: 10,
            font: fontBold,
          })
          y -= 12
        }
        drawText(
          `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
          margins.left,
          y,
          { size: 9 },
        )
        y -= 12
        drawText(
          `Vendedor: ${employee.nome_completo.substring(0, 25)}`,
          margins.left,
          y,
          { size: 9 },
        )
        y -= 10
        drawLine(y)
        y -= 15

        drawText(
          `CLIENTE: ${client['NOME CLIENTE'].substring(0, 30)}`,
          margins.left,
          y,
          { size: 10, font: fontBold },
        )
        y -= 12

        if (client['RAZÃO SOCIAL']) {
          drawText(client['RAZÃO SOCIAL'].substring(0, 30), margins.left, y, {
            size: 9,
          })
          y -= 12
        }

        drawText(`Codigo: ${client.CODIGO}`, margins.left, y, { size: 9 })
        y -= 12

        const doc = client.CNPJ || client.CPF || '-'
        if (doc !== '-') {
          drawText(`CNPJ/CPF: ${doc}`, margins.left, y, { size: 9 })
          y -= 12
        }

        const fullAddr = `${client.ENDEREÇO || '-'}${client.BAIRRO ? ' - ' + client.BAIRRO : ''}`
        if (fullAddr.length > 35) {
          drawText(`End: ${fullAddr.substring(0, 35)}`, margins.left, y, {
            size: 9,
          })
          y -= 12
          drawText(`${fullAddr.substring(35, 70)}`, margins.left + 20, y, {
            size: 9,
          })
        } else {
          drawText(`End: ${fullAddr}`, margins.left, y, { size: 9 })
        }
        y -= 12

        const city = clientMunicipio || client.MUNICÍPIO || client.city || '-'
        drawText(`Cidade: ${city.substring(0, 30)}`, margins.left, y, {
          size: 9,
        })
        y -= 12

        y -= 5
        drawLine(y)
        y -= 15

        if (items && items.length > 0) {
          drawText('ITENS', width / 2, y, {
            size: 11,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const item of items) {
            if (checkPageBreak(120)) y -= 10
            const pName = item.produtoNome || ''

            drawText(pName.substring(0, 35), margins.left, y, {
              size: 9,
              font: fontBold,
            })
            y -= 12

            const fields = [
              { label: 'Saldo Inicial', value: item.saldoInicial },
              { label: 'Qtd. Vendida', value: item.quantVendida },
              { label: 'Saldo Final', value: item.saldoFinal },
              {
                label: 'Valor Unitário',
                value: `R$ ${formatCurrency(item.precoUnitario)}`,
              },
              {
                label: 'Total',
                value: `R$ ${formatCurrency(item.valorVendido)}`,
              },
            ]

            for (const field of fields) {
              drawText(`${field.label}: ${field.value}`, margins.left, y, {
                size: 9,
                font: fontBold,
              })
              y -= 12
            }
            y -= 5
            drawLine(y)
            y -= 12
          }
        }

        checkPageBreak(170)
        drawText('RESUMO', width / 2, y, {
          size: 11,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        const summaryFields = [
          { label: 'Venda Total:', value: totalVendido, color: rgb(0, 0, 0) },
          { label: 'Desconto:', value: valorDesconto, color: rgb(0, 0, 0) },
          { label: 'Saldo a Pagar:', value: valorAcerto, color: rgb(0, 0, 0) },
          { label: 'Valor Pago:', value: valorPago, color: rgb(0, 0, 0) },
          { label: 'Valor do Debito:', value: debito, color: rgb(0, 0, 0) },
          {
            label: 'Média Mensal:',
            value: monthlyAverage || 0,
            color: rgb(0, 0, 0),
          },
        ]

        for (const field of summaryFields) {
          drawText(field.label, margins.left, y, {
            size: 10,
            font: fontBold,
          })
          drawText(formatCurrency(field.value), width - margins.right, y, {
            size: 10,
            font: fontBold,
            align: 'right',
            color: field.color,
          })
          y -= 15
        }

        y -= 5
        drawLine(y)
        y -= 15

        if (payments && payments.length > 0) {
          checkPageBreak(60)
          drawText('PAGAMENTOS', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const p of payments) {
            const detailsList =
              p.details && p.details.length > 0
                ? p.details
                : [{ number: 1, value: p.value, dueDate: p.dueDate }]

            for (const inst of detailsList) {
              if (checkPageBreak(25)) y -= 10
              const label = `${p.method} (${inst.number}/${p.installments})`
              drawText(label, margins.left, y, { size: 9, font: fontBold })
              drawText(formatCurrency(inst.value), width - margins.right, y, {
                size: 9,
                font: fontBold,
                align: 'right',
              })
              y -= 10
              drawText(
                `Venc: ${safeFormatDate(inst.dueDate)}`,
                margins.left + 10,
                y,
                { size: 9, font: fontBold },
              )
              y -= 12
            }
          }
          drawLine(y)
          y -= 15
        }

        if (history && history.length > 0) {
          checkPageBreak(150)
          drawText('HISTORICO (ULTIMOS)', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const h of history) {
            if (checkPageBreak(160)) y -= 10
            const discountVal =
              h.desconto !== undefined
                ? h.desconto
                : h.valorVendaTotal > h.saldoAPagar
                  ? h.valorVendaTotal - h.saldoAPagar
                  : 0

            const fields = [
              { label: 'Data', value: safeFormatDate(h.data) },
              {
                label: 'Venda',
                value: `R$ ${formatCurrency(h.valorVendaTotal)}`,
              },
              { label: 'Desconto', value: `R$ ${formatCurrency(discountVal)}` },
              {
                label: 'A pagar',
                value: `R$ ${formatCurrency(h.saldoAPagar)}`,
              },
              { label: 'Pago', value: `R$ ${formatCurrency(h.valorPago)}` },
              { label: 'Débito', value: `R$ ${formatCurrency(h.debito)}` },
              { label: 'Vendedor', value: h.vendedor || '-' },
              { label: 'Pedido', value: h.id || '-' },
            ]

            for (const field of fields) {
              drawText(`${field.label}: ${field.value}`, margins.left, y, {
                size: 9,
                font: fontBold,
              })
              y -= 12
            }
            y -= 5
            drawLine(y)
            y -= 12
          }
        }

        checkPageBreak(120)
        y -= 30
        drawText('Assinatura do Cliente', width / 2, y, {
          size: 9,
          font: fontBold,
          align: 'center',
        })
        y -= 50
        drawLine(y + 40)

        if (signature) {
          try {
            const base64Data = signature.split(',')[1]
            const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
              c.charCodeAt(0),
            )
            const image = await pdfDoc.embedPng(imageBytes)
            const imageDims = image.scale(0.3)
            page.drawImage(image, {
              x: (width - imageDims.width) / 2,
              y: y + 5,
              width: imageDims.width,
              height: imageDims.height,
            })
          } catch (e) {
            console.error(e)
          }
        }
      } else {
        // A4 Layout
        if (preview) {
          drawText('PDF para visualização', width / 2, y + 20, {
            size: 14,
            font: fontBold,
            align: 'center',
            color: rgb(1, 0, 0),
          })
          y -= 10
        }

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

        drawText(
          `Data: ${safeFormatDate(date)} ${safeFormatTime(date)}`,
          margins.left,
          y,
          { size: 10 },
        )

        if (orderNumber) {
          drawText(`PEDIDO: ${orderNumber}`, margins.left + 180, y, {
            size: 10,
            font: fontBold,
          })
        }

        drawText(
          `Vendedor: ${employee.nome_completo}`,
          width - margins.right,
          y,
          { size: 10, align: 'right' },
        )
        y -= 15

        const boxHeight = 85
        page.drawRectangle({
          x: margins.left,
          y: y - boxHeight,
          width: width - margins.left - margins.right,
          height: boxHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        })
        const textY = y - 15
        drawText(
          `Cliente: ${client['NOME CLIENTE']} (Cod: ${client.CODIGO})`,
          margins.left + 10,
          textY,
          { size: 10, font: fontBold },
        )

        const city = clientMunicipio || client.MUNICÍPIO || client.city || '-'
        drawText(`Municipio: ${city}`, width - margins.right - 10, textY, {
          size: 10,
          align: 'right',
        })

        drawText(
          `CNPJ/CPF: ${client.CNPJ || '-'}`,
          margins.left + 10,
          textY - 15,
          { size: 9 },
        )
        drawText(
          `Telefone: ${client['FONE 1'] || '-'}`,
          margins.left + 10,
          textY - 30,
          { size: 9 },
        )
        drawText(
          `Endereço: ${client.ENDEREÇO || '-'}, ${client.BAIRRO || ''}`,
          margins.left + 10,
          textY - 45,
          { size: 9 },
        )

        if (lastAcertoDate) {
          drawText(
            `Data ultimo acerto: ${safeFormatDate(lastAcertoDate)}`,
            width - margins.right - 10,
            textY - 15,
            { size: 9, align: 'right' },
          )
        } else if (lastOrder) {
          drawText(
            `Data ultimo acerto: ${safeFormatDate(lastOrder.date)}`,
            width - margins.right - 10,
            textY - 15,
            { size: 9, align: 'right' },
          )
        }

        y -= boxHeight + 20

        if (items && items.length > 0) {
          drawText('ITENS DO PEDIDO', margins.left, y, {
            size: 12,
            font: fontBold,
          })
          y -= 15

          const colX = {
            prod: margins.left,
            sIni: 310,
            cont: 380,
            qtd: 430,
            total: 490,
            sFin: 555,
          }

          drawText('Produto', colX.prod, y, { size: 8, font: fontBold })
          drawText('Saldo Inicial', colX.sIni, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Contagem', colX.cont, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Qtd', colX.qtd, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Total', colX.total, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Saldo Final', colX.sFin, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })

          y -= 5
          page.drawLine({
            start: { x: margins.left, y },
            end: { x: width - margins.right, y },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          })
          y -= 12

          for (const item of items) {
            if (checkPageBreak(20)) y -= 20
            drawText(item.produtoNome.substring(0, 30), colX.prod, y, {
              size: 8,
            })
            drawText(String(item.saldoInicial), colX.sIni, y, {
              size: 8,
              align: 'right',
            })
            drawText(String(item.contagem), colX.cont, y, {
              size: 8,
              align: 'right',
            })
            drawText(String(item.quantVendida), colX.qtd, y, {
              size: 8,
              align: 'right',
            })
            drawText(formatCurrency(item.valorVendido), colX.total, y, {
              size: 8,
              align: 'right',
            })
            drawText(String(item.saldoFinal), colX.sFin, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          }
          y -= 10
        }

        checkPageBreak(150)
        drawText('RESUMO DO ACERTO', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 15

        const summaryBoxHeight = 110
        page.drawRectangle({
          x: margins.left,
          y: y - summaryBoxHeight,
          width: width - margins.left - margins.right,
          height: summaryBoxHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        })

        const sumTextY = y - 15
        const leftColX = margins.left + 10
        const rightColX = width - margins.right - 10

        drawText(`Pedido: #${orderNumber || '-'}`, leftColX, sumTextY, {
          size: 9,
        })
        drawText(`Data: ${safeFormatDate(date)}`, leftColX + 100, sumTextY, {
          size: 9,
        })
        drawText(
          `Vendedor: ${employee.nome_completo}`,
          leftColX + 250,
          sumTextY,
          { size: 9 },
        )

        const financeY = sumTextY - 25
        const rows = [
          { l: 'Venda Total', v: totalVendido, bold: false },
          {
            l: 'Desconto',
            v: valorDesconto,
            bold: false,
            color: valorDesconto > 0 ? rgb(1, 0, 0) : undefined,
          },
          { l: 'Saldo a Pagar', v: valorAcerto, bold: true },
          { l: 'Valor Pago', v: valorPago, bold: false },
          {
            l: 'Valor do Débito',
            v: debito,
            bold: true,
            color: debito > 0 ? rgb(1, 0, 0) : undefined,
          },
        ]

        let currentY = financeY
        for (const row of rows) {
          drawText(row.l, leftColX, currentY, {
            size: 10,
            font: row.bold ? fontBold : fontRegular,
          })
          drawText(`R$ ${formatCurrency(row.v)}`, rightColX, currentY, {
            size: 10,
            font: row.bold ? fontBold : fontRegular,
            align: 'right',
            color: row.color,
          })
          currentY -= 15
        }

        y -= summaryBoxHeight + 20

        if (payments && payments.length > 0) {
          checkPageBreak(60)
          drawText('FORMAS DE PAGAMENTO', margins.left, y, {
            size: 10,
            font: fontBold,
          })
          y -= 15
          drawText('Metodo', margins.left, y, { size: 9, font: fontBold })
          drawText('Valor', margins.left + 150, y, { size: 9, font: fontBold })
          drawText('Vencimento', margins.left + 250, y, {
            size: 9,
            font: fontBold,
          })
          y -= 12

          for (const p of payments) {
            const detailsList =
              p.details && p.details.length > 0
                ? p.details
                : [{ number: 1, value: p.value, dueDate: p.dueDate }]

            for (const inst of detailsList) {
              if (checkPageBreak(20)) y -= 20
              const desc = `${p.method} (${inst.number || 1}/${p.installments})`
              drawText(desc, margins.left, y, { size: 9 })
              drawText(
                `R$ ${formatCurrency(inst.value)}`,
                margins.left + 150,
                y,
                { size: 9 },
              )
              drawText(safeFormatDate(inst.dueDate), margins.left + 250, y, {
                size: 9,
              })
              y -= 12
            }
          }
          y -= 20
        }

        if (history && history.length > 0) {
          checkPageBreak(200)
          drawText('Resumo de Acertos (Histórico)', margins.left, y, {
            size: 11,
            font: fontBold,
          })
          y -= 15

          const histColX = {
            pedido: margins.left,
            data: 90,
            vendedor: 160,
            media: 320,
            saldo: 395,
            pago: 470,
            debito: 555,
          }

          drawText('Pedido', histColX.pedido, y, { size: 9, font: fontBold })
          drawText('Data', histColX.data, y, { size: 9, font: fontBold })
          drawText('Vendedor', histColX.vendedor, y, {
            size: 9,
            font: fontBold,
          })
          drawText('Média Mensal', histColX.media, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          drawText('Saldo a Pagar', histColX.saldo, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          drawText('Valor Pago', histColX.pago, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          drawText('Débito', histColX.debito, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })

          y -= 5
          page.drawLine({
            start: { x: margins.left, y },
            end: { x: width - margins.right, y },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          })
          y -= 12

          for (const h of history) {
            if (checkPageBreak(20)) y -= 20
            drawText(String(h.id || '-'), histColX.pedido, y, { size: 9 })
            drawText(safeFormatDate(h.data), histColX.data, y, { size: 9 })
            drawText(
              (h.vendedor || '-').substring(0, 20),
              histColX.vendedor,
              y,
              { size: 9 },
            )
            drawText(formatCurrency(h.mediaMensal || 0), histColX.media, y, {
              size: 9,
              align: 'right',
            })
            drawText(formatCurrency(h.saldoAPagar), histColX.saldo, y, {
              size: 9,
              align: 'right',
            })
            drawText(formatCurrency(h.valorPago), histColX.pago, y, {
              size: 9,
              align: 'right',
            })
            const debitoColor = h.debito > 0 ? rgb(1, 0, 0) : rgb(0, 0, 0)
            drawText(formatCurrency(h.debito), histColX.debito, y, {
              size: 9,
              align: 'right',
              color: debitoColor,
              font: h.debito > 0 ? fontBold : fontRegular,
            })
            y -= 12
          }
        }

        y -= 20
        checkPageBreak(100)
        y -= 30
        const sigLineLength = 250
        const centerX = width / 2
        const startX = centerX - sigLineLength / 2
        const endX = centerX + sigLineLength / 2

        page.drawLine({
          start: { x: startX, y },
          end: { x: endX, y },
          thickness: 1,
        })
        drawText('Assinatura do Cliente', centerX, y - 15, {
          size: 9,
          align: 'center',
        })

        if (signature) {
          try {
            const base64Data = signature.split(',')[1]
            const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
              c.charCodeAt(0),
            )
            const image = await pdfDoc.embedPng(imageBytes)
            const imageDims = image.scale(0.4)
            page.drawImage(image, {
              x: centerX - imageDims.width / 2,
              y: y + 5,
              width: imageDims.width,
              height: imageDims.height,
            })
          } catch (e) {
            console.error(e)
          }
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
