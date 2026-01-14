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
        const receiptsCount = body.receipts ? body.receipts.length : 0
        // Increase estimate for detailed lists
        estimatedHeight =
          600 + summaryCount * 50 + expensesCount * 40 + receiptsCount * 40
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

    if (
      reportType === 'cash-summary' ||
      reportType === 'employee-cash-summary'
    ) {
      const {
        summaryData,
        receipts,
        expenses,
        totalRecebido,
        totalDespesas,
        totalSaldo,
        saldoDeAcerto, // New field
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
          {
            size: 11,
            align: 'right',
            font: fontBold,
            color: rgb(0, 0, 0.8),
          },
        )
        y -= 20
      }

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

      // PAYMENT METHODS SUMMARY
      if (receipts && receipts.length > 0) {
        checkPageBreak(100)
        drawText('FORMAS DE PAGAMENTO (Detalhado)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Group by Payment Method
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
    } else if (reportType === 'closing-confirmation') {
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
