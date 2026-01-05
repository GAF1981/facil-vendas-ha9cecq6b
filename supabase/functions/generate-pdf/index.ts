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

const safeFormatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
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
      // Header(150) + Client(200) + Items(count * 90) + Totals(200) + Payments(count * 40) + History(count * 90) + Footer(100)
      const estimatedHeight =
        900 + itemsCount * 90 + paymentsCount * 40 + historyCount * 90

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

        // Order Info Header for Summary/Detail
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

        // ITEMS - CARD LAYOUT (Extended Data)
        if (items && items.length > 0) {
          drawText('ITENS', width / 2, y, {
            size: 11,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const item of items) {
            if (checkPageBreak(90)) y -= 10

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

            // Line 1: S.Ini | Cont | S.Fin
            drawText(`S.Ini: ${item.saldoInicial}`, margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(`Cont: ${item.contagem}`, width / 2 - 10, y, {
              size: 9,
              font: fontBold,
              align: 'center',
            })
            drawText(`S.Fin: ${item.saldoFinal}`, width - margins.right, y, {
              size: 9,
              font: fontBold,
              align: 'right',
            })
            y -= 12

            // Line 2: Qtd Vend | Unit
            drawText(`Qtd Vend: ${item.quantVendida}`, margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(
              `Unit: ${formatCurrency(item.precoUnitario)}`,
              width - margins.right,
              y,
              { size: 9, font: fontBold, align: 'right' },
            )
            y -= 12

            // Line 3: Total
            drawText(
              `Total: R$ ${formatCurrency(item.valorVendido)}`,
              width - margins.right,
              y,
              { size: 9, font: fontBold, align: 'right' },
            )
            y -= 8

            drawLine(y)
            y -= 12
          }
        }

        // TOTALS - Vertical Stack with Extended Fields
        checkPageBreak(150)
        drawText('RESUMO', width / 2, y, {
          size: 11,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        // Detailed Header Info in Summary
        drawText(`Data Acerto: ${safeFormatDate(date)}`, margins.left, y, {
          size: 9,
        })
        y -= 12
        if (orderNumber) {
          drawText(`Pedido: ${orderNumber}`, margins.left, y, { size: 9 })
          y -= 12
        }
        drawText(
          `Vendedor: ${employee.nome_completo.substring(0, 20)}`,
          margins.left,
          y,
          { size: 9 },
        )
        y -= 15

        const summaryFields = [
          { label: 'Venda Total:', value: totalVendido, color: rgb(0, 0, 0) },
          { label: 'Desconto:', value: valorDesconto, color: rgb(0, 0, 0) },
          { label: 'Saldo a Pagar:', value: valorAcerto, color: rgb(0, 0, 0) }, // Net to pay
          { label: 'Valor Pago:', value: valorPago, color: rgb(0, 0, 0) },
          { label: 'Valor do Debito:', value: debito, color: rgb(0, 0, 0) },
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

        // HISTORY - CARD LAYOUT
        if (history && history.length > 0) {
          checkPageBreak(120)
          drawText('HISTORICO (ULTIMOS)', width / 2, y, {
            size: 10,
            font: fontBold,
            align: 'center',
          })
          y -= 15

          for (const h of history) {
            if (checkPageBreak(70)) y -= 10

            // Header Line: Date | Order ID
            drawText(`Data: ${safeFormatDate(h.data)}`, margins.left, y, {
              size: 9,
              font: fontBold,
            })
            drawText(`Ped: ${h.id}`, width - margins.right, y, {
              size: 9,
              font: fontBold,
              align: 'right',
            })
            y -= 12

            // Financial Line
            drawText(
              `Venda: ${formatCurrency(h.valorVendaTotal)}`,
              margins.left,
              y,
              { size: 9, font: fontBold },
            )
            drawText(`Pago: ${formatCurrency(h.valorPago)}`, width / 2, y, {
              size: 9,
              font: fontBold,
              align: 'center',
            })
            drawText(
              `Deb: ${formatCurrency(h.debito)}`,
              width - margins.right,
              y,
              { size: 9, font: fontBold, align: 'right' },
            )
            y -= 12

            if (h.vendedor) {
              drawText(
                `Vend: ${h.vendedor.substring(0, 20)}`,
                margins.left,
                y,
                { size: 8, font: fontBold },
              )
              y -= 10
            }

            drawLine(y)
            y -= 10
          }
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
        // --- A4 STANDARD LAYOUT WITH ENHANCEMENTS ---
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

        // Items Table - Extended Columns
        if (items && items.length > 0) {
          drawText('ITENS DO PEDIDO', margins.left, y, {
            size: 12,
            font: fontBold,
          })
          y -= 15

          // Extended Columns Layout
          const colX = {
            prod: margins.left,
            sIni: 240,
            cont: 290,
            sFin: 340,
            qtd: 390,
            unit: 440,
            total: width - margins.right,
          }

          drawText('Produto', colX.prod, y, { size: 8, font: fontBold })
          drawText('S.Ini', colX.sIni, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Cont', colX.cont, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('S.Fin', colX.sFin, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Qtd', colX.qtd, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Unit.', colX.unit, y, {
            size: 8,
            font: fontBold,
            align: 'right',
          })
          drawText('Total', colX.total, y, {
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
            drawText(item.produtoNome.substring(0, 35), colX.prod, y, {
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
            drawText(String(item.saldoFinal), colX.sFin, y, {
              size: 8,
              align: 'right',
            })
            drawText(String(item.quantVendida), colX.qtd, y, {
              size: 8,
              align: 'right',
            })
            drawText(formatCurrency(item.precoUnitario), colX.unit, y, {
              size: 8,
              align: 'right',
            })
            drawText(formatCurrency(item.valorVendido), colX.total, y, {
              size: 8,
              align: 'right',
            })
            y -= 12
          }
          y -= 10
        }

        // Financials - Comprehensive Summary
        checkPageBreak(150)

        // Detailed Info in Summary Header (A4)
        drawText('RESUMO DO ACERTO', margins.left, y, {
          size: 12,
          font: fontBold,
        })
        y -= 15

        // Box for Summary
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

        // Context Info
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

        // Values
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

        // History Section - Card Layout for A4 as well
        if (history && history.length > 0) {
          checkPageBreak(150)
          drawText('HISTÓRICO RECENTE', margins.left, y, {
            size: 11,
            font: fontBold,
          })
          y -= 15

          // Grid Layout for Cards (2 per row)
          const cardWidth = (width - margins.left - margins.right - 10) / 2
          const cardHeight = 60
          let col = 0

          for (const h of history) {
            if (col === 0 && checkPageBreak(cardHeight + 10)) y -= 10

            const xCard =
              col === 0 ? margins.left : margins.left + cardWidth + 10

            // Draw Card Border
            page.drawRectangle({
              x: xCard,
              y: y - cardHeight,
              width: cardWidth,
              height: cardHeight,
              borderColor: rgb(0.8, 0.8, 0.8),
              borderWidth: 1,
            })

            // Card Content
            const cardTextY = y - 12
            drawText(
              `Data: ${safeFormatDate(h.data)} | Pedido: ${h.id}`,
              xCard + 5,
              cardTextY,
              { size: 8, font: fontBold },
            )

            const valsY = cardTextY - 12
            drawText(
              `Venda: R$ ${formatCurrency(h.valorVendaTotal)}`,
              xCard + 5,
              valsY,
              { size: 8 },
            )
            drawText(
              `Pago: R$ ${formatCurrency(h.valorPago)}`,
              xCard + 5,
              valsY - 12,
              { size: 8 },
            )

            const debtColor = h.debito > 0 ? rgb(1, 0, 0) : rgb(0, 0, 0)
            drawText(
              `Débito: R$ ${formatCurrency(h.debito)}`,
              xCard + 5,
              valsY - 24,
              {
                size: 8,
                color: debtColor,
                font: h.debito > 0 ? fontBold : fontRegular,
              },
            )

            if (col === 1) {
              col = 0
              y -= cardHeight + 10
            } else {
              col = 1
            }
          }
          // Reset y if we ended on col 1 to avoid overlap next (though end of doc)
          if (col === 1) y -= cardHeight + 10
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
