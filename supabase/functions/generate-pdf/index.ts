import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
      // Thermal 80mm Setup (~226 points width)
      const itemsCount = body.items ? body.items.length : 0
      const paymentsCount = body.payments
        ? body.payments.reduce(
            (acc: number, p: any) => acc + (p.details ? p.details.length : 1),
            0,
          )
        : 0
      const historyCount = body.history ? body.history.length : 0

      // Height calculation adjusted for Card Layout (more lines per item)
      // Header(150) + Client(200) + Items(count * 70) + Totals(150) + Payments(count * 40) + History(count * 25) + Footer(100)
      const estimatedHeight =
        800 + itemsCount * 70 + paymentsCount * 40 + historyCount * 25

      page = pdfDoc.addPage([226, Math.max(842, estimatedHeight)])
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 20, bottom: 20, left: 10, right: 10 }
      y = height - margins.top
    } else {
      // A4 Setup
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 50, bottom: 50, left: 40, right: 40 }
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

      // Force Bold and Black for Thermal as requested for maximum legibility
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

    const checkPageBreak = (spaceNeeded: number) => {
      if (y - spaceNeeded < margins.bottom) {
        if (isThermal) {
          page = pdfDoc.addPage([width, height]) // Keep same dynamic size
        } else {
          page = pdfDoc.addPage()
        }
        y = height - margins.top
        return true
      }
      return false
    }

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: margins.left, y: yPos },
        end: { x: width - margins.right, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      })
    }

    if (
      reportType !== 'closing-confirmation' &&
      reportType !== 'cash-summary' &&
      reportType !== 'employee-cash-summary'
    ) {
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
      } = body

      if (isThermal) {
        // --- THERMAL 80mm LAYOUT (CARD BASED) ---

        if (preview) {
          drawText('PREVIA DE VISUALIZACAO', width / 2, y, {
            size: 12,
            font: fontBold,
            align: 'center',
          })
          y -= 20
        }

        // Header
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

        // Order Info
        if (orderNumber) {
          drawText(`PEDIDO: ${orderNumber}`, margins.left, y, {
            size: 10,
            font: fontBold,
          })
          y -= 12
        }
        drawText(`Data: ${safeFormatDate(date)}`, margins.left, y, { size: 9 })
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

        // Client Info (Vertical Expansion)
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

        const phone = client['FONE 1'] || client['FONE 2'] || '-'
        if (phone !== '-') {
          drawText(`Tel: ${phone}`, margins.left, y, { size: 9 })
          y -= 12
        }

        const address = client.ENDEREÇO || '-'
        const bairro = client.BAIRRO || ''
        const fullAddr = `${address}${bairro ? ' - ' + bairro : ''}`

        // Address Wrapping
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

        // Last Acerto
        const lastDate = lastAcertoDate || (lastOrder ? lastOrder.date : null)
        if (lastDate) {
          drawText(
            `Ultimo Acerto: ${safeFormatDate(lastDate)}`,
            margins.left,
            y,
            { size: 9 },
          )
          y -= 12
        }

        y -= 5
        drawLine(y)
        y -= 15

        // ITEMS - CARD LAYOUT
        if (items && items.length > 0) {
          drawText('ITENS', width / 2, y, {
            size: 11,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const item of items) {
            if (checkPageBreak(70)) y -= 10

            // Product Name (Wrapping Logic)
            const pName = item.produtoNome || ''
            const maxLen = 35
            let currentNameY = y

            if (pName.length > maxLen) {
              const line1 = pName.substring(0, maxLen)
              const line2 = pName.substring(maxLen, maxLen * 2)
              drawText(line1, margins.left, currentNameY, {
                size: 9,
                font: fontBold,
              })
              currentNameY -= 10
              drawText(line2, margins.left, currentNameY, {
                size: 9,
                font: fontBold,
              })
              currentNameY -= 12
            } else {
              drawText(pName, margins.left, currentNameY, {
                size: 9,
                font: fontBold,
              })
              currentNameY -= 12
            }
            y = currentNameY

            // Row 1: S. Inicial | Contagem
            drawText(`S. Ini: ${item.saldoInicial}`, margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(`Cont: ${item.contagem}`, width - margins.right, y, {
              size: 9,
              font: fontBold,
              align: 'right',
            })
            y -= 12

            // Row 2: S. Final | Qtd Vendida
            drawText(`S. Fin: ${item.saldoFinal}`, margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(
              `Qtd Vend: ${item.quantVendida}`,
              width - margins.right,
              y,
              { size: 9, font: fontBold, align: 'right' },
            )
            y -= 12

            // Row 3: Preço | Total
            drawText(
              `Unit: ${formatCurrency(item.precoUnitario)}`,
              margins.left,
              y,
              { size: 9, font: fontBold },
            )
            drawText(
              `Total: ${formatCurrency(item.valorVendido)}`,
              width - margins.right,
              y,
              { size: 9, font: fontBold, align: 'right' },
            )
            y -= 8

            drawLine(y)
            y -= 12
          }
        }

        // TOTALS - Vertical Stack
        checkPageBreak(100)
        drawText('RESUMO', width / 2, y, {
          size: 11,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        drawText('Total Vendido:', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        drawText(formatCurrency(totalVendido), width - margins.right, y, {
          size: 10,
          font: fontBold,
          align: 'right',
        })
        y -= 15

        if (valorDesconto > 0) {
          drawText('Desconto:', margins.left, y, { size: 10, font: fontBold })
          drawText(
            `-${formatCurrency(valorDesconto)}`,
            width - margins.right,
            y,
            { size: 10, font: fontBold, align: 'right' },
          )
          y -= 15
        }

        drawText('TOTAL A PAGAR:', margins.left, y, {
          size: 11,
          font: fontBold,
        })
        drawText(formatCurrency(valorAcerto), width - margins.right, y, {
          size: 11,
          font: fontBold,
          align: 'right',
        })
        y -= 15

        drawText('Valor Pago:', margins.left, y, { size: 10, font: fontBold })
        drawText(formatCurrency(valorPago), width - margins.right, y, {
          size: 10,
          font: fontBold,
          align: 'right',
        })
        y -= 15

        if (debito > 0) {
          drawText('RESTANTE (DEBITO):', margins.left, y, {
            size: 10,
            font: fontBold,
          })
          drawText(formatCurrency(debito), width - margins.right, y, {
            size: 10,
            font: fontBold,
            align: 'right',
          })
        }
        y -= 10
        drawLine(y)
        y -= 15

        // PAYMENTS
        if (payments && payments.length > 0) {
          checkPageBreak(60)
          drawText('PAGAMENTOS', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const p of payments) {
            // Check for details first
            const detailsList =
              p.details && p.details.length > 0
                ? p.details
                : [
                    {
                      number: 1,
                      value: p.value,
                      dueDate: p.dueDate,
                    },
                  ]

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

        // HISTORY (Vertical List)
        if (history && history.length > 0) {
          checkPageBreak(100)
          drawText('HISTORICO (ULTIMOS)', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15
          // Simple Header
          drawText('Data', margins.left, y, { size: 9, font: fontBold })
          drawText('Venda', margins.left + 60, y, { size: 9, font: fontBold })
          drawText('Debito', width - margins.right, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          y -= 10

          for (const h of history) {
            if (checkPageBreak(15)) y -= 10
            drawText(safeFormatDate(h.data), margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(formatCurrency(h.valorVendaTotal), margins.left + 60, y, {
              size: 9,
              font: fontBold,
            })
            drawText(formatCurrency(h.debito), width - margins.right, y, {
              size: 9,
              font: fontBold,
              align: 'right',
            })
            y -= 12
          }
          drawLine(y)
          y -= 15
        }

        // SIGNATURES
        checkPageBreak(120)
        y -= 30
        drawText('Assinatura do Cliente', width / 2, y, {
          size: 9,
          font: fontBold,
          align: 'center',
        })
        y -= 50 // Space for signature
        drawLine(y + 40) // Line above text actually

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
        // --- A4 STANDARD LAYOUT (Unchanged logic, just keeping structure) ---
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

        // Header with Company/Client Info
        drawText('FACIL VENDAS', margins.left, y, { size: 18, font: fontBold })
        drawText(title, width - margins.right, y, {
          size: 14,
          font: fontBold,
          align: 'right',
        })
        y -= 25

        drawText(`Data: ${safeFormatDate(date)}`, margins.left, y, { size: 10 })

        if (orderNumber) {
          drawText(`PEDIDO: ${orderNumber}`, margins.left + 150, y, {
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

        // Client Box with Extra Info
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

        // Last Order Info
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

        // Items Table
        if (items && items.length > 0) {
          drawText('ITENS DO PEDIDO', margins.left, y, {
            size: 12,
            font: fontBold,
          })
          y -= 15

          const colX = {
            prod: margins.left,
            qtd: 350,
            unit: 420,
            total: width - margins.right,
          }

          drawText('Produto', colX.prod, y, { size: 9, font: fontBold })
          drawText('Qtd', colX.qtd, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          drawText('Unit.', colX.unit, y, {
            size: 9,
            font: fontBold,
            align: 'right',
          })
          drawText('Total', colX.total, y, {
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

          for (const item of items) {
            if (checkPageBreak(20)) y -= 20
            drawText(item.produtoNome.substring(0, 45), colX.prod, y, {
              size: 9,
            })
            drawText(String(item.quantVendida), colX.qtd, y, {
              size: 9,
              align: 'right',
            })
            drawText(formatCurrency(item.precoUnitario), colX.unit, y, {
              size: 9,
              align: 'right',
            })
            drawText(formatCurrency(item.valorVendido), colX.total, y, {
              size: 9,
              align: 'right',
            })
            y -= 12
          }
          y -= 10
        }

        // Financials
        checkPageBreak(100)
        const valX = width - margins.right
        drawText('Total Vendido:', margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(totalVendido)}`, valX, y, {
          size: 10,
          align: 'right',
        })
        y -= 15
        if (valorDesconto > 0) {
          drawText('Desconto:', margins.left, y, { size: 10 })
          drawText(`R$ ${formatCurrency(valorDesconto)}`, valX, y, {
            size: 10,
            align: 'right',
            color: rgb(1, 0, 0),
          })
          y -= 15
        }
        drawText('Total a Pagar:', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        drawText(`R$ ${formatCurrency(valorAcerto)}`, valX, y, {
          size: 10,
          font: fontBold,
          align: 'right',
        })
        y -= 15
        drawText('Valor Pago:', margins.left, y, { size: 10 })
        drawText(`R$ ${formatCurrency(valorPago)}`, valX, y, {
          size: 10,
          align: 'right',
        })
        y -= 15
        if (debito > 0) {
          drawText('Restante (Debito):', margins.left, y, { size: 10 })
          drawText(`R$ ${formatCurrency(debito)}`, valX, y, {
            size: 10,
            align: 'right',
            color: rgb(1, 0, 0),
          })
          y -= 15
        }
        y -= 20

        // Payments
        if (payments && payments.length > 0) {
          checkPageBreak(60)
          drawText('FORMAS DE PAGAMENTO', margins.left, y, {
            size: 10,
            font: fontBold,
          })
          y -= 15
          // Headers
          drawText('Metodo', margins.left, y, { size: 9, font: fontBold })
          drawText('Valor', margins.left + 150, y, { size: 9, font: fontBold })
          drawText('Vencimento', margins.left + 250, y, {
            size: 9,
            font: fontBold,
          })
          y -= 12

          for (const p of payments) {
            // Check for details first
            const detailsList =
              p.details && p.details.length > 0
                ? p.details
                : [
                    {
                      number: 1,
                      value: p.value,
                      dueDate: p.dueDate,
                    },
                  ]

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

        // Signatures
        checkPageBreak(100)
        y -= 40
        const sigLineLength = 200
        page.drawLine({
          start: { x: margins.left, y },
          end: { x: margins.left + sigLineLength, y },
          thickness: 1,
        })
        drawText(
          'Assinatura do Cliente',
          margins.left + sigLineLength / 2,
          y - 15,
          { size: 9, align: 'center' },
        )

        page.drawLine({
          start: { x: width - margins.right - sigLineLength, y },
          end: { x: width - margins.right, y },
          thickness: 1,
        })
        drawText(
          'Assinatura do Vendedor',
          width - margins.right - sigLineLength / 2,
          y - 15,
          { size: 9, align: 'center' },
        )

        if (signature) {
          try {
            const base64Data = signature.split(',')[1]
            const imageBytes = Uint8Array.from(atob(base64Data), (c) =>
              c.charCodeAt(0),
            )
            const image = await pdfDoc.embedPng(imageBytes)
            const imageDims = image.scale(0.4)
            page.drawImage(image, {
              x: margins.left + (sigLineLength - imageDims.width) / 2,
              y: y + 5,
              width: imageDims.width,
              height: imageDims.height,
            })
          } catch (e) {
            console.error(e)
          }
        }

        y -= 50

        // History Section
        if (history && history.length > 0) {
          checkPageBreak(200)
          drawText(
            'RESUMO DE ACERTOS (HISTORICO - Ultimos 10)',
            margins.left,
            y,
            {
              size: 11,
              font: fontBold,
            },
          )
          y -= 20

          const hCol = {
            pedido: margins.left,
            date: margins.left + 60,
            total: margins.left + 140,
            desc: margins.left + 220,
            pago: margins.left + 300,
            debito: margins.left + 380,
          }

          drawText('Pedido', hCol.pedido, y, { size: 8, font: fontBold })
          drawText('Data', hCol.date, y, { size: 8, font: fontBold })
          drawText('Venda Total', hCol.total, y, { size: 8, font: fontBold })
          drawText('Desconto', hCol.desc, y, { size: 8, font: fontBold })
          drawText('Valor Pago', hCol.pago, y, { size: 8, font: fontBold })
          drawText('Débito', hCol.debito, y, { size: 8, font: fontBold })

          y -= 5
          page.drawLine({
            start: { x: margins.left, y },
            end: { x: width - margins.right, y },
            thickness: 1,
          })
          y -= 12

          for (const h of history) {
            if (checkPageBreak(20)) y -= 20
            const vendaTotal = h.valorVendaTotal
            const totalAPagar = h.saldoAPagar
            const desconto = vendaTotal - totalAPagar
            const pago = h.valorPago
            const debito = h.debito

            drawText(`#${h.id}`, hCol.pedido, y, { size: 8 })
            drawText(safeFormatDate(h.data), hCol.date, y, { size: 8 })
            drawText(formatCurrency(vendaTotal), hCol.total, y, { size: 8 })
            drawText(formatCurrency(desconto), hCol.desc, y, { size: 8 })
            drawText(formatCurrency(pago), hCol.pago, y, { size: 8 })

            if (debito > 0) {
              drawText(formatCurrency(debito), hCol.debito, y, {
                size: 8,
                color: rgb(1, 0, 0),
              })
            } else {
              drawText(formatCurrency(0), hCol.debito, y, { size: 8 })
            }
            y -= 12
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
