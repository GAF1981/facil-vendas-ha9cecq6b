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

const calculateThermalHeight = (body: any) => {
  const { reportType } = body
  
  if (
    reportType === 'closing-confirmation' ||
    reportType === 'employee-cash-summary'
  ) {
    let h = 650
    // Consider only valid cash expenses for height
    const allExpenses = body.expenses || []
    const expenses = allExpenses.filter((exp: any) => 
      exp.saiuDoCaixa !== undefined ? exp.saiuDoCaixa : (exp.saiu_do_caixa !== undefined ? exp.saiu_do_caixa : true)
    )

    if (expenses.length > 0) {
      h += 40 + (expenses.length * 15)
    }
    const settlements = body.settlements || []
    if (settlements.length > 0) {
      h += 60
      for (const s of settlements) {
        h += 80
      }
    }
    return Math.max(650, Math.ceil(h))
  }

  let h = 145
  h += 15

  const items = body.items || []
  h += items.length * 70 // Adjusted height per item for new concise format

  h += 59
  h += 102

  const payments =
    body.detailedPayments && body.detailedPayments.length > 0
      ? body.detailedPayments
      : body.payments || []

  if (payments.length > 0) {
    h += 60
    h += payments.length * 12
    h += 15
  }

  const installments = body.installments || []
  if (installments.length > 0) {
    h += 60
    h += installments.length * 12
    h += 40
  }

  h += 100

  const history = body.history || []
  if (history.length > 0) {
    h += 20
    h += history.length * 55 // increased height per item for new format
    h += 10
  }

  h += 142

  return Math.max(400, Math.ceil(h))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { reportType, format, signature } = body
    const isThermal = format === '80mm'
    const isDetailedOrder = reportType === 'detailed-order' || (reportType === 'acerto' && !isThermal)

    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let signatureImage = null
    if (signature) {
      try {
        const base64Data = signature.includes(',')
          ? signature.split(',')[1]
          : signature
        signatureImage = await pdfDoc.embedPng(base64Data)
      } catch (e) {
        console.error('Error embedding signature:', e)
      }
    }

    let page
    let width
    let height
    let margins
    let y

    if (isDetailedOrder && !isThermal) {
      page = pdfDoc.addPage()
      width = page.getSize().width
      height = page.getSize().height
      margins = { top: 40, bottom: 40, left: 25, right: 25 }
      y = height - margins.top
    } else if (isThermal) {
      let calculatedHeight = calculateThermalHeight(body)

      page = pdfDoc.addPage([226, calculatedHeight])
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

    if (isDetailedOrder && !isThermal) {
      const {
        client,
        items = [],
        date,
        orderNumber,
        totalVendido = 0,
        valorDesconto = 0,
        valorAcerto = 0,
        employee,
      } = body

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

      drawText('RELATORIO DETALHADO DE PEDIDO', width / 2, y, {
        size: 14,
        font: fontBold,
        align: 'center',
      })
      y -= 30
      drawLine(y)
      y -= 15

      const leftColX = margins.left
      const rightColX = width / 2 + 20

      drawText(`Numero do Pedido: ${orderNumber}`, leftColX, y, {
        size: 10,
        font: fontBold,
      })
      drawText(`Data do Acerto: ${formattedDate}`, rightColX, y, { size: 10 })
      y -= 15

      drawText(`Cliente: ${client?.CODIGO || 0} - ${clientName}`, leftColX, y, {
        size: 10,
        font: fontBold,
      })
      drawText(`CNPJ/CPF: ${clientDoc}`, rightColX, y, { size: 10 })
      y -= 15

      drawText(`Endereco: ${clientAddress}`, leftColX, y, { size: 10 })
      drawText(`CEP: ${clientCep}`, rightColX, y, { size: 10 })
      y -= 15

      drawText(`Municipio: ${clientCity}`, leftColX, y, { size: 10 })
      drawText(`Telefone: ${clientPhone}`, rightColX, y, { size: 10 })
      y -= 15

      drawText(`Contato: ${clientContact}`, leftColX, y, { size: 10 })
      y -= 15

      drawText(`Funcionario: ${empName}`, leftColX, y, { size: 10 })
      y -= 20
      drawLine(y)

      y -= 100

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
        drawText(text, x + 5, headerY, {
          size: headerFontSize,
          font: fontBold,
          rotate: { type: 'degrees', angle: 90 },
        })
      }

      drawVerticalHeader('COD. INTERNO', tableX.cod)
      drawVerticalHeader('MERCADORIA', tableX.merc)
      drawVerticalHeader('TIPO', tableX.tipo)
      drawVerticalHeader('SALDO INICIAL', tableX.si)
      drawVerticalHeader('CONTAGEM', tableX.cont)
      drawVerticalHeader('QUANTIDADE VENDIDA', tableX.qv)
      drawVerticalHeader('VALOR VENDIDO', tableX.vv)
      drawVerticalHeader('SALDO FINAL', tableX.sf)
      drawVerticalHeader('NOVAS CONSIGNACOES', tableX.nc)
      drawVerticalHeader('RECOLHIDO', tableX.rec)

      y -= 10
      drawLine(y)
      y -= 12

      const rowFontSize = 8
      const sortedItems = [...items].sort((a, b) =>
        (a.produtoNome || '').localeCompare(b.produtoNome || ''),
      )

      for (const item of sortedItems) {
        checkPageBreak(15)

        drawText(String(item.codigoInterno || item.produtoCodigo || ''), tableX.cod, y, {
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

      checkPageBreak(120)
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
        color: rgb(1, 0, 0),
      })
      y -= 15

      drawText('TOTAL A PAGAR:', footerLabelX, y, {
        size: 12,
        font: fontBold,
      })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, footerRightX, y, {
        size: 12,
        font: fontBold,
        align: 'right',
      })
      y -= 30

      if (signatureImage) {
        const scaled = signatureImage.scaleToFit(200, 60)
        const xPos = (width - scaled.width) / 2
        page.drawImage(signatureImage, {
          x: xPos,
          y: y - 60,
          width: scaled.width,
          height: scaled.height,
        })
      }
      y -= 60
      drawLine(y)
      y -= 10
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 10,
        align: 'center',
        font: fontBold,
      })
    }

    else if (
      reportType === 'closing-confirmation' ||
      reportType === 'employee-cash-summary'
    ) {
      const { fechamento, date, periodo } = body
      const closingData = fechamento || body.data || {}

      const empName = closingData.funcionario?.nome_completo || body.employee?.name || 'Funcionario'
      const rotaId = closingData.rota_id || periodo?.rotaId || '-'
      const reportDate = closingData.created_at || date

      const vDinheiro = closingData.valor_dinheiro || 0
      const vPix = closingData.valor_pix || 0
      const vCheque = closingData.valor_cheque || 0
      const vBoleto = closingData.valor_boleto || 0
      const totalEntrada = vDinheiro + vPix + vCheque + vBoleto
      const vendaTotal = closingData.venda_total || 0
      const descontoTotal = closingData.desconto_total || 0

      // Only subtract expenses that actually saiu do caixa
      const allExpensesPayload = body.expenses || []
      const expenses = allExpensesPayload.filter((exp: any) => {
        return exp.saiuDoCaixa !== undefined ? exp.saiuDoCaixa : (exp.saiu_do_caixa !== undefined ? exp.saiu_do_caixa : true)
      })

      // Calculate vDespesas independently based strictly on the passed payload + flag
      const vDespesas = expenses.reduce((acc: number, exp: any) => acc + (Number(exp.valor) || 0), 0)
      
      // Calculate saldoAcerto directly corresponding to UI Logic
      // (Dinheiro + Cheque - Despesas que sairam do caixa)
      let saldoAcerto = closingData.saldo_acerto !== undefined ? closingData.saldo_acerto : body.saldoDeAcerto
      if (saldoAcerto === undefined) {
        saldoAcerto = vDinheiro + vCheque - vDespesas
      }

      const settlements = body.settlements || []

      if (!isThermal) {
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
        drawText(
          `R$ ${formatCurrency(saldoAcerto)}`,
          width - margins.right,
          y,
          {
            size: 14,
            font: fontBold,
            align: 'right',
          },
        )
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
        drawRow('Boleto:', vBoleto)

        y -= 5
        drawText('TOTAL ENTRADA:', margins.left, y, {
          size: 10,
          font: fontBold,
        })
        drawText(
          `R$ ${formatCurrency(totalEntrada)}`,
          width - margins.right,
          y,
          {
            size: 10,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 20
        drawLine(y)
        y -= 25

        drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
          size: 12,
          font: fontBold,
          align: 'center',
        })
        y -= 25

        if (expenses.length > 0) {
          drawText('Descrição', margins.left, y, { size: 9, font: fontBold })
          drawText('Valor', width - margins.right, y, { size: 9, font: fontBold, align: 'right' })
          y -= 15
          for (const exp of expenses) {
            checkPageBreak(20)
            const desc = (exp.detalhamento || exp.grupo || 'Despesa').substring(0, 30)
            drawText(desc, margins.left, y, { size: 9 })
            drawText(`R$ ${formatCurrency(exp.valor)}`, width - margins.right, y, { size: 9, align: 'right' })
            y -= 12
          }
          drawLine(y, 0.5)
          y -= 15
        }

        drawText('TOTAL SAIDA (CAIXA):', margins.left, y, { size: 10, font: fontBold })
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

        // Resumo de Acertos A4
        if (settlements.length > 0) {
          y -= 30;
          checkPageBreak(40);
          drawText('RESUMO DE ACERTOS', width / 2, y, { size: 14, font: fontBold, align: 'center' });
          y -= 20;
          drawLine(y);
          y -= 20;

          // Draw Table Header
          drawText('Pedido', margins.left, y, { size: 8, font: fontBold });
          drawText('Data/Hora', margins.left + 35, y, { size: 8, font: fontBold });
          drawText('Func.', margins.left + 105, y, { size: 8, font: fontBold });
          drawText('Cliente', margins.left + 165, y, { size: 8, font: fontBold });
          drawText('Vl. Venda', margins.left + 300, y, { size: 8, font: fontBold });
          drawText('Pgto (Sis)', margins.left + 350, y, { size: 8, font: fontBold });
          drawText('Pgto (Rec)', margins.left + 415, y, { size: 8, font: fontBold });
          drawText('Valor Pago', width - margins.right, y, { size: 8, font: fontBold, align: 'right' });
          
          y -= 10;
          drawLine(y, 0.5);
          y -= 15;

          for (const s of settlements) {
            checkPageBreak(25);
            
            const dateStr = s.acertoDate ? safeFormatDate(s.acertoDate).substring(0,5) : '';
            const dateTime = `${dateStr} ${s.acertoTime ? s.acertoTime.substring(0, 5) : ''}`.trim()
            const funcName = (s.employee || '').substring(0, 10);
            const clientDisplay = `${s.clientCode}-${(s.clientName || '').substring(0, 22)}`;
            const pgtoSis = (s.paymentFormsBD || '-').substring(0, 10);
            let paymentStr = '';
            if (s.payments && s.payments.length > 0) {
              paymentStr = s.payments.map((p: any) => `${p.method}`).join(', ').substring(0, 10);
            } else {
              paymentStr = '-';
            }

            drawText(`#${s.orderId}`, margins.left, y, { size: 8 });
            drawText(dateTime, margins.left + 35, y, { size: 8 });
            drawText(funcName, margins.left + 105, y, { size: 8 });
            drawText(clientDisplay, margins.left + 165, y, { size: 8 });
            drawText(formatCurrency(s.totalSalesValue), margins.left + 300, y, { size: 8 });
            drawText(pgtoSis, margins.left + 350, y, { size: 8 });
            drawText(paymentStr, margins.left + 415, y, { size: 8 });
            drawText(formatCurrency(s.totalPaid), width - margins.right, y, { size: 8, align: 'right', font: fontBold });
            
            y -= 12;
            drawLine(y, 0.2);
            y -= 12;
          }
        }
      } else {
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

        drawText('SALDO DO ACERTO', margins.left, y, {
          size: 11,
          font: fontBold,
        })
        drawText(
          `R$ ${formatCurrency(saldoAcerto)}`,
          width - margins.right,
          y,
          {
            size: 11,
            font: fontBold,
            align: 'right',
          },
        )
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
        drawRow('Boleto', vBoleto)

        y -= 3
        drawText('TOTAL ENTRADA:', margins.left, y, { size: 9, font: fontBold })
        drawText(
          `R$ ${formatCurrency(totalEntrada)}`,
          width - margins.right,
          y,
          {
            size: 9,
            font: fontBold,
            align: 'right',
          },
        )
        y -= 15

        drawLine(y)
        y -= 15

        drawText('DETALHAMENTO DA SAIDA', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        if (expenses.length > 0) {
          drawText('Descrição', margins.left, y, { size: 8, font: fontBold })
          drawText('Valor', width - margins.right, y, { size: 8, font: fontBold, align: 'right' })
          y -= 12
          for (const exp of expenses) {
            checkPageBreak(20)
            const desc = (exp.detalhamento || exp.grupo || 'Despesa').substring(0, 20)
            drawText(desc, margins.left, y, { size: 8 })
            drawText(`R$ ${formatCurrency(exp.valor)}`, width - margins.right, y, { size: 8, align: 'right' })
            y -= 12
          }
          drawLine(y, 0.5)
          y -= 10
        }

        drawText('TOTAL SAIDA (CAIXA):', margins.left, y, { size: 9, font: fontBold })
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

        // Resumo de Acertos Thermal
        if (settlements.length > 0) {
          y -= 25;
          drawText('RESUMO DE ACERTOS', width / 2, y, { size: 12, font: fontBold, align: 'center' });
          y -= 15;
          drawLine(y);
          y -= 15;

          for (const s of settlements) {
            checkPageBreak(80);
            
            const dateStr = s.acertoDate ? safeFormatDate(s.acertoDate).substring(0,5) : '';
            const dateTime = `${dateStr} ${s.acertoTime ? s.acertoTime.substring(0, 5) : ''}`.trim()
            
            drawText(`Pedido: #${s.orderId} | Data: ${dateTime}`, margins.left, y, { size: 9, font: fontBold });
            y -= 12;
            drawText(`Func: ${(s.employee || '').substring(0,10)} | Cli: ${s.clientCode}`, margins.left, y, { size: 9 });
            y -= 12;
            drawText(`${s.clientName}`, margins.left, y, { size: 9, font: fontBold, maxWidth: width - 20 });
            y -= 12;

            drawText(`Venda: R$ ${formatCurrency(s.totalSalesValue)}`, margins.left, y, { size: 9 });
            drawText(`Pgto (Sis): ${(s.paymentFormsBD || '-').substring(0, 10)}`, width - margins.right, y, { size: 9, align: 'right' });
            y -= 12;

            let paymentStr = '';
            if (s.payments && s.payments.length > 0) {
              paymentStr = s.payments.map((p: any) => `${p.method}`).join(', ').substring(0, 12);
            } else {
              paymentStr = '-';
            }
            
            drawText(`Pgto (Rec): ${paymentStr}`, margins.left, y, { size: 9 });
            drawText(`Pago: R$ ${formatCurrency(s.totalPaid)}`, width - margins.right, y, { size: 9, font: fontBold, align: 'right' });
            y -= 15;

            drawLine(y, 0.5);
            y -= 15;
          }
        }
      }
    }

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
      } = body

      const sellerName = employee?.nome_completo || 'N/D'
      const clientName = client?.['NOME CLIENTE'] || 'Consumidor'
      const clientCode = client?.CODIGO || '0'
      const clientAddress = `${client?.ENDEREÇO || ''}`.substring(0, 45)
      const clientCity = `${client?.MUNICÍPIO || ''} - ${client?.ESTADO || ''}`

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

      drawText('ITENS DO PEDIDO', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15

      const sortedItems = [...items].sort((a: any, b: any) =>
        (a.produtoNome || a.produto || '').localeCompare(
          b.produtoNome || b.produto || '',
        ),
      )

      if (sortedItems.length > 0) {
        drawLine(y, 0.5)
        y -= 10

        for (const item of sortedItems) {
          checkPageBreak(70)

          let rawName = item.produtoNome || item.produto || ''
          const priceStr = `R$ ${formatCurrency(item.precoUnitario || item.preco)}`
          let prodName = rawName
          if (!rawName.includes('R$')) {
            prodName = `${rawName} ${priceStr}`
          }

          // Top Row: Item Name and Unit Price
          drawText(prodName, margins.left, y, {
            size: 8,
            font: fontBold,
            maxWidth: width - margins.left - margins.right,
          })
          y -= 12

          // Header Row 1
          drawText('Saldo', 35, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Qtd.', 87, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Qtd.', 138, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Saldo', 190, y, { size: 7, font: fontBold, align: 'center' })
          y -= 9

          // Header Row 2
          drawText('Inicial', 35, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Contagem', 87, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Vendida', 138, y, { size: 7, font: fontBold, align: 'center' })
          drawText('Final', 190, y, { size: 7, font: fontBold, align: 'center' })
          y -= 12

          // Values
          drawText(String(item.saldoInicial || 0), 35, y, { size: 8, align: 'center' })
          drawText(String(item.contagem || 0), 87, y, { size: 8, align: 'center' })
          drawText(String(item.quantVendida || 0), 138, y, { size: 8, align: 'center' })
          drawText(String(item.saldoFinal || 0), 190, y, { size: 8, align: 'center' })
          y -= 14

          // Bottom Row: Total Venda
          const totalStr = `Total Venda: R$ ${formatCurrency(item.valorVendido)}`
          drawText(totalStr, margins.left, y, { size: 8, font: fontBold })
          
          y -= 8
          drawLine(y, 0.5)
          y -= 10
        }
      }

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

      drawText('TOTAL A PAGAR:', margins.left, y, { size: 10, font: fontBold })
      drawText(`R$ ${formatCurrency(valorAcerto)}`, width - margins.right, y, {
        size: 10,
        font: fontBold,
        align: 'right',
      })
      y -= 15
      drawLine(y)
      y -= 15

      const totalEstoqueInicial = items.reduce(
        (acc: number, item: any) => acc + (Number(item.saldoInicial) || 0),
        0,
      )
      const totalContagem = items.reduce(
        (acc: number, item: any) => acc + (Number(item.contagem) || 0),
        0,
      )
      const totalQuantidadeVendida = items.reduce(
        (acc: number, item: any) => acc + (Number(item.quantVendida) || 0),
        0,
      )
      const totalEstoqueFinal = items.reduce(
        (acc: number, item: any) => acc + (Number(item.saldoFinal) || 0),
        0,
      )

      checkPageBreak(100)

      drawText('Quantidades Pedido', width / 2, y, {
        size: 10,
        font: fontBold,
        align: 'center',
      })
      y -= 15
      drawLine(y, 0.5)
      y -= 12

      const quantityRows = [
        { label: 'Estoque inicial:', value: totalEstoqueInicial },
        { label: 'Quantidade contagem:', value: totalContagem },
        { label: 'Quantidade vendida:', value: totalQuantidadeVendida },
        { label: 'Quantidade final:', value: totalEstoqueFinal },
      ]

      for (const row of quantityRows) {
        drawText(row.label, margins.left, y, { size: 9 })
        drawText(String(row.value), width - margins.right, y, {
          size: 9,
          align: 'right',
        })
        y -= 12
      }

      drawLine(y, 0.5)
      y -= 15

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

      if (installments && installments.length > 0) {
        checkPageBreak(60)
        drawText('VALORES A PAGAR (PARCELAS)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

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

      checkPageBreak(80)

      if (signatureImage) {
        const scaled = signatureImage.scaleToFit(180, 50)
        const xPos = (width - scaled.width) / 2
        page.drawImage(signatureImage, {
          x: xPos,
          y: y - 50,
          width: scaled.width,
          height: scaled.height,
        })
      }

      y -= 50
      drawLine(y)
      y -= 10
      drawText('Assinatura do Cliente', width / 2, y, {
        size: 9,
        font: fontBold,
        align: 'center',
      })
      y -= 20

      if (history && history.length > 0) {
        checkPageBreak(80)
        drawText('RESUMO DE ACERTOS (HISTORICO)', width / 2, y, {
          size: 10,
          font: fontBold,
          align: 'center',
        })
        y -= 15

        for (const h of history) {
          checkPageBreak(50)

          const hDate = safeFormatDate(h.data || h.data_acerto)
          const hId = h.id || h.pedido_id
          const hSeller = (h.vendedor || h.vendedor_nome || 'N/D').substring(
            0,
            12,
          )

          if (h.isAjuste) {
             drawText(`${hDate} #${hId} ${clientName}`, margins.left, y, { size: 8, font: fontBold })
             y -= 10
             
             drawText(`Ajuste Inicial de Estoque`, margins.left, y, { size: 8 })
             drawText(`Qtd: ${h.quantidadeAlterada || 0}`, width - margins.right, y, { size: 8, align: 'right' })
             y -= 25
             continue;
          }

          const valTotal = Number(h.valorVendaTotal || h.valor_venda || 0)
          const valAPagar = Number(h.saldoAPagar || h.saldo_a_pagar || valTotal)
          const valPago = Number(h.valorPago || h.valor_pago || 0)
          const valDeb = Number(h.debito || 0)
          const valMed = Number(h.mediaMensal || h.media_mensal || 0)
          const valDesc = Number(h.desconto || 0)

          drawText(`${hDate} #${hId} ${clientName}`, margins.left, y, { size: 8, font: fontBold })
          y -= 10

          drawText(`Venda: ${formatCurrency(valTotal)}`, margins.left, y, { size: 8 })
          drawText(`Desconto: ${formatCurrency(valDesc)}`, width - margins.right, y, { size: 8, align: 'right' })
          y -= 10

          drawText(`Pago: ${formatCurrency(valPago)}`, margins.left, y, { size: 8 })
          drawText(`A pagar (debito): ${formatCurrency(valDeb)}`, width - margins.right, y, { size: 8, align: 'right', font: fontBold })
          y -= 10

          drawText(`Media Mensal: ${formatCurrency(valMed)}`, margins.left, y, { size: 8 })
          y -= 15 
        }
        drawLine(y)
      }
    }

    const pdfBytes = await pdfDoc.save()
    return new Response(pdfBytes, {
      headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
