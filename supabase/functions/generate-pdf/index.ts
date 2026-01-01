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
      valorDesconto,
      valorAcerto,
      valorPago,
      debito,
      payments,
      history,
      monthlyAverage,
      preview,
      signature,
      orderNumber,
      isReceipt, // Flag for Receipt Mode
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
      // Alignment logic only applied if no rotation
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
          color: rgb(1, 0, 0), // Red
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
    drawText(`Vendedor: ${employee.nome_completo}`, width - margins.right, y, {
      size: 10,
      align: 'right',
    })
    y -= 15

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

    // Skip items table for Receipt Mode to save space if not needed,
    // BUT user story implies "detailing payment methods and order history" for receipt.
    // Usually a receipt doesn't need line items of the sale unless it IS the sale receipt.
    // The previous implementation included items. I'll keep it for Acerto,
    // but maybe skip for "Confirmação Recebimento" if items are not passed (they might be empty).
    if (items && items.length > 0) {
      // Products Table
      drawText('ITENS DO PEDIDO', margins.left, y, { size: 12, font: fontBold })
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

    y -= 20

    // Signature Section
    if (signature) {
      checkPageBreak(100)
      drawText('ASSINATURA DO CLIENTE', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 10
      // Decode Base64 and embed
      try {
        const base64Data = signature.split(',')[1]
        const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
          c.charCodeAt(0),
        )
        const image = await pdfDoc.embedPng(imageBytes)
        const imageDims = image.scale(0.5)

        y -= imageDims.height
        page.drawImage(image, {
          x: margins.left,
          y: y,
          width: imageDims.width,
          height: imageDims.height,
        })
        y -= 10
      } catch (e) {
        drawText('(Erro ao carregar assinatura)', margins.left, y, {
          size: 8,
          color: rgb(1, 0, 0),
        })
        y -= 20
      }
    }

    if (history && history.length > 0) {
      checkPageBreak(150)
      drawText('RESUMO DE ACERTOS (HISTÓRICO)', margins.left, y, {
        size: 10,
        font: fontBold,
      })
      y -= 15

      // Adjusted columns to include "Pedido"
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
