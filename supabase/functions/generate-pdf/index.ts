import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { corsHeaders } from '../_shared/cors.ts'

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const formatCurrency = (value: number) => {
  return value.toFixed(2).replace('.', ',')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      client,
      employee,
      items,
      date,
      acertoTipo,
      totalVendido,
      totalRecolhido,
      totalNovasConsignacoes,
      valorDesconto,
      valorAcerto,
      valorPago,
      debito,
      payments,
    } = await req.json()

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
      } = {},
    ) => {
      const {
        size = 10,
        font = fontRegular,
        align = 'left',
        color = rgb(0, 0, 0),
      } = options
      const cleanText = removeAccents(text || '')
      const textWidth = font.widthOfTextAtSize(cleanText, size)
      let xPos = x
      if (align === 'right') xPos = x - textWidth
      if (align === 'center') xPos = x - textWidth / 2

      page.drawText(cleanText, { x: xPos, y: yPos, size, font, color })
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

    // Header
    drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
    drawText(`Comprovante de ${acertoTipo}`, width - margins.right, y, {
      size: 14,
      font: fontBold,
      align: 'right',
    })
    y -= 25

    const dateStr = new Date(date).toLocaleString('pt-BR')
    drawText(`Data: ${dateStr}`, margins.left, y, { size: 10 })
    drawText(`Vendedor: ${employee.nome_completo}`, width - margins.right, y, {
      size: 10,
      align: 'right',
    })
    y -= 20

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

    // Products Table
    drawText('ITENS DO PEDIDO', margins.left, y, { size: 12, font: fontBold })
    y -= 15

    // Table Headers
    const colX = {
      prod: margins.left,
      saldoIni: 280,
      cont: 330,
      venda: 380,
      preco: 430,
      total: 490,
      saldoFin: 550,
    }

    drawText('Produto', colX.prod, y, { size: 8, font: fontBold })
    drawText('S.Ini', colX.saldoIni, y, {
      size: 8,
      font: fontBold,
      align: 'right',
    })
    drawText('Q.Vend', colX.venda, y, {
      size: 8,
      font: fontBold,
      align: 'right',
    })
    drawText('Unit', colX.preco, y, {
      size: 8,
      font: fontBold,
      align: 'right',
    })
    drawText('Total', colX.total, y, {
      size: 8,
      font: fontBold,
      align: 'right',
    })
    drawText('S.Fin', colX.saldoFin, y, {
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
    y -= 15

    // Items Loop
    for (const item of items) {
      if (checkPageBreak(20)) {
        // Redraw Headers on new page
        drawText('Produto', colX.prod, y, { size: 8, font: fontBold })
        y -= 15
      }

      const name = (item.produtoNome || '').substring(0, 40)
      drawText(`${item.produtoCodigo || '-'} ${name}`, colX.prod, y, {
        size: 8,
      })
      drawText(String(item.saldoInicial), colX.saldoIni, y, {
        size: 8,
        align: 'right',
      })
      drawText(String(item.quantVendida), colX.venda, y, {
        size: 8,
        align: 'right',
      })
      drawText(formatCurrency(item.precoUnitario), colX.preco, y, {
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

    // Financial Summary
    checkPageBreak(120)

    const summaryY = y
    // Left Column: Values
    drawText('RESUMO FINANCEIRO', margins.left, y, {
      size: 10,
      font: fontBold,
    })
    y -= 15
    drawText('Total Vendido:', margins.left, y, { size: 9 })
    drawText(`R$ ${formatCurrency(totalVendido)}`, margins.left + 100, y, {
      size: 9,
      align: 'right',
    })
    y -= 12

    if (valorDesconto > 0) {
      drawText('Desconto:', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(valorDesconto)}`, margins.left + 100, y, {
        size: 9,
        align: 'right',
        color: rgb(1, 0, 0),
      })
      y -= 12
    }

    drawText('Total a Pagar:', margins.left, y, { size: 9, font: fontBold })
    drawText(`R$ ${formatCurrency(valorAcerto)}`, margins.left + 100, y, {
      size: 9,
      font: fontBold,
      align: 'right',
    })
    y -= 12

    drawText('Valor Pago:', margins.left, y, { size: 9 })
    drawText(`R$ ${formatCurrency(valorPago)}`, margins.left + 100, y, {
      size: 9,
      align: 'right',
    })
    y -= 12

    if (debito > 0) {
      drawText('Debito Restante:', margins.left, y, { size: 9 })
      drawText(`R$ ${formatCurrency(debito)}`, margins.left + 100, y, {
        size: 9,
        align: 'right',
        color: rgb(1, 0, 0),
      })
      y -= 12
    }

    // Right Column: Stock Values
    let rightY = summaryY - 15
    const rightX = 300

    drawText('MOVIMENTACAO DE ESTOQUE (Valores)', rightX, rightY + 15, {
      size: 10,
      font: fontBold,
    })

    drawText('Novas Consignacoes:', rightX, rightY, { size: 9 })
    drawText(
      `R$ ${formatCurrency(totalNovasConsignacoes)}`,
      rightX + 130,
      rightY,
      { size: 9, align: 'right' },
    )
    rightY -= 12

    drawText('Recolhido:', rightX, rightY, { size: 9 })
    drawText(`R$ ${formatCurrency(totalRecolhido)}`, rightX + 130, rightY, {
      size: 9,
      align: 'right',
    })

    y = Math.min(y, rightY) - 20

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
            const dateInst = new Date(inst.dueDate).toLocaleDateString('pt-BR')
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
