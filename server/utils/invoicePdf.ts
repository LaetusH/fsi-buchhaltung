import { calculateInvoicePositionTotals } from '~/server/utils/invoices'
import { DEFAULT_INVOICE_TEXT_SETTINGS } from '~/server/utils/appSettings'
import {
  buildImageObject,
  buildPdfDocument,
  centeredImageX,
  centeredTextBaseline,
  drawImages,
  drawLines,
  drawRects,
  drawText,
  estimateTextWidth,
  wrapText,
  wrapTextByWidth,
  type PdfImage,
  type PdfLine,
  type PdfRect,
  type PdfText,
} from '~/server/utils/pdf'
import type { AssociationProfileRow } from '~/types/association'
import type { InvoiceTextSettings } from '~/types/appSettings'
import type { CompanyRow } from '~/types/company'
import type { CreateInvoiceBody } from '~/types/invoice'
import { renderInvoiceTextTemplate } from '~/utils/invoiceTextTemplates'

function compact(parts: Array<string | null | undefined>) {
  return parts.map(part => part?.trim()).filter(Boolean).join(', ')
}

function compactAddress(parts: Array<string | null | undefined>) {
  return parts.map(part => part?.trim()).filter(Boolean).join(' ')
}

function formatMoney(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`
}

function formatRate(value: number) {
  const normalized = Number(value)
  return Number.isInteger(normalized) ? `${normalized}%` : `${normalized.toFixed(2)}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  return `${match[3]}.${match[2]}.${match[1]}`
}

export function buildInvoicePdf(params: {
  association: AssociationProfileRow
  company: CompanyRow
  invoice: CreateInvoiceBody
  logo?: { mimeType: string, data: Buffer } | null
  boardLine?: string | null
  invoiceTextSettings?: InvoiceTextSettings
}) {
  const { association, company, invoice, logo = null, boardLine = null, invoiceTextSettings = DEFAULT_INVOICE_TEXT_SETTINGS } = params
  const { netTotal, grossTotal, taxBreakdown } = calculateInvoicePositionTotals(invoice.positions)
  const backgroundTexts: PdfText[] = []
  const texts: PdfText[] = []
  const lines: PdfLine[] = []
  const images: PdfImage[] = []

  const imageObject = logo ? buildImageObject(logo) : null
  const rects: PdfRect[] = []
  const pageWidth = 595.25
  const contentLeft = 55
  const contentRight = 540
  const logoWidth = imageObject ? 120 : 0
  const logoHeight = imageObject ? (logoWidth * imageObject.height) / imageObject.width : 0
  const headingCenterX = pageWidth / 2
  const templateContext = {
    invoice_number: invoice.invoice_number,
    association_name: association.name,
    contact_person: invoice.contact_person,
    invoice_date: invoice.invoice_date,
    service_date: invoice.service_date,
    due_date: invoice.due_date,
  }
  const renderedSubject = renderInvoiceTextTemplate(invoice.subject?.trim() || invoiceTextSettings.subject, templateContext)
  const renderedIntroText = renderInvoiceTextTemplate(invoice.intro_text?.trim() || invoiceTextSettings.intro_text, templateContext)
  const renderedNotes = renderInvoiceTextTemplate(invoice.notes?.trim() || invoiceTextSettings.notes, templateContext)

  if (invoice.status === 'draft') {
    const draftText = 'ENTWURF'
    backgroundTexts.push({
      x: (pageWidth - estimateTextWidth(draftText, 64, true)) / 2,
      y: 415,
      size: 64,
      text: draftText,
      font: 'F2',
      gray: 0.82,
    })
  }

  if (imageObject) {
    images.push({
      x: centeredImageX(headingCenterX, logoWidth, imageObject),
      y: 750,
      width: logoWidth,
      height: logoHeight,
      objectName: 'Im1',
    })
  } else {
    texts.push({
      x: 220,
      y: 785,
      size: 22,
      text: association.short_name || association.name,
      font: 'F2',
    })
  }

  texts.push(
    { x: 255, y: imageObject ? 730 : 760, size: 16, text: 'Rechnung', font: 'F2' },
    {
      x: contentLeft,
      y: 684,
      size: 8,
      text: compact([
        association.short_name || association.name,
        compactAddress([association.street, association.street_number]),
        compactAddress([association.postal_code, association.city]),
      ]),
    },
    { x: contentLeft, y: 656, size: 11, text: company.name, font: 'F2' },
  )

  let recipientY = 642
  for (const line of [
    compactAddress([company.street, company.street_number]),
    compactAddress([company.postal_code, company.city]),
    company.country && company.country.trim().toLowerCase() !== 'deutschland' ? company.country : '',
  ].filter(Boolean)) {
    texts.push({ x: contentLeft, y: recipientY, size: 10, text: line })
    recipientY -= 13
  }

  const infoBoxX = 365
  const infoBoxTopY = 660
  const infoRows: Array<[string, string]> = [
    ['Rechnungs-Nr.:', invoice.invoice_number],
    ['Rechnungsdatum:', formatDate(invoice.invoice_date)],
    ['Leistungsdatum:', formatDate(invoice.service_date || invoice.invoice_date)],
    ['Fällig bis:', formatDate(invoice.due_date)],
    ['Ansprechperson:', invoice.contact_person || '-'],
  ]
  infoRows.forEach(([label, value], index) => {
    const y = infoBoxTopY - (index * 15)
    texts.push(
      { x: infoBoxX, y, size: 10, text: label, font: 'F2' },
      { x: infoBoxX + 100, y, size: 10, text: value },
    )
  })

  let bodyY = 560
  const displaySubject = renderedSubject || `Rechnung ${invoice.invoice_number}`
  if (displaySubject) {
    const subjectLines = wrapTextByWidth(displaySubject, contentRight - contentLeft, 12)
    for (const line of subjectLines) {
      if (!line) {
        bodyY -= 10
        continue
      }
      texts.push({ x: contentLeft, y: bodyY, size: 12, text: line, font: 'F2' })
      bodyY -= 15
    }
    bodyY -= 6
  }

  const introLines = wrapTextByWidth(renderedIntroText, contentRight - contentLeft, 10)
  for (const line of introLines) {
    if (!line) {
      bodyY -= 10
      continue
    }
    texts.push({ x: contentLeft, y: bodyY, size: 10, text: line })
    bodyY -= 13
  }

  bodyY -= 4

  const tableLeft = contentLeft
  const tableRight = contentRight
  const tableTop = bodyY
  const colPos = tableLeft + 4
  const colDescription = tableLeft + 34
  const taxEntries = [...taxBreakdown.entries()]
  const hasMixedTaxRates = taxEntries.length > 1
  const tableFontSize = 9.5
  const columnGap = estimateTextWidth('00', tableFontSize)

  const quantityTexts = ['Menge', ...invoice.positions.map(position => position.quantity.toFixed(2).replace('.', ','))]
  const unitTexts = ['Einheit', ...invoice.positions.map(position => position.unit || '-')]
  const unitPriceTexts = ['Einzelpreis', ...invoice.positions.map(position => formatMoney(position.unit_price))]
  const vatTexts = hasMixedTaxRates ? ['USt.', ...invoice.positions.map(position => formatRate(position.tax))] : []
  const priceTexts = ['Gesamt', ...invoice.positions.map(position => formatMoney(position.quantity * position.unit_price))]

  const quantityWidth = Math.max(...quantityTexts.map(text => estimateTextWidth(text, tableFontSize))) + columnGap
  const unitWidth = Math.max(...unitTexts.map(text => estimateTextWidth(text, tableFontSize))) + columnGap
  const unitPriceWidth = Math.max(...unitPriceTexts.map(text => estimateTextWidth(text, tableFontSize))) + columnGap
  const vatWidth = hasMixedTaxRates
    ? Math.max(...vatTexts.map(text => estimateTextWidth(text, tableFontSize))) + columnGap
    : 0
  const priceWidth = Math.max(...priceTexts.map(text => estimateTextWidth(text, tableFontSize))) + columnGap

  const colPriceRight = tableRight - 4
  const colPriceLeft = colPriceRight - priceWidth
  const colVatRight = hasMixedTaxRates ? colPriceLeft : null
  const colVatLeft = hasMixedTaxRates && colVatRight !== null ? colVatRight - vatWidth : null
  const colUnitPriceRight = hasMixedTaxRates && colVatLeft !== null ? colVatLeft : colPriceLeft
  const colUnitPriceLeft = colUnitPriceRight - unitPriceWidth
  const colUnitLeft = colUnitPriceLeft - unitWidth
  const colQuantityRight = colUnitLeft - columnGap
  const colQuantityLeft = colQuantityRight - quantityWidth

  lines.push(
    { x1: tableLeft, y1: tableTop, x2: tableRight, y2: tableTop, width: 0.8 },
    { x1: tableLeft, y1: tableTop - 17, x2: tableRight, y2: tableTop - 17, width: 0.8 },
  )
  texts.push(
    { x: colPos, y: tableTop - 11, size: tableFontSize, text: 'Pos.', font: 'F2' },
    { x: colDescription, y: tableTop - 11, size: tableFontSize, text: 'Leistung', font: 'F2' },
    { x: colQuantityRight, y: tableTop - 11, size: tableFontSize, text: 'Menge', font: 'F2', align: 'right' },
    { x: colUnitLeft, y: tableTop - 11, size: tableFontSize, text: 'Einheit', font: 'F2' },
    { x: colUnitPriceRight, y: tableTop - 11, size: tableFontSize, text: 'Einzelpreis', font: 'F2', align: 'right' },
    ...(hasMixedTaxRates && colVatRight !== null ? [{ x: colVatRight, y: tableTop - 11, size: tableFontSize, text: 'USt.', font: 'F2' as const, align: 'right' as const }] : []),
    { x: colPriceRight, y: tableTop - 11, size: tableFontSize, text: 'Gesamt', font: 'F2', align: 'right' },
  )

  const descriptionWidth = tableRight - colDescription - 4
  const descriptionMaxChars = Math.max(20, Math.floor(descriptionWidth / (tableFontSize * 0.58)))
  let rowY = tableTop - 31
  invoice.positions.forEach((position, index) => {
    const nameLines = wrapText(position.name, 56)
    const detailLines = position.description ? wrapText(position.description, descriptionMaxChars) : []
    const netLineTotal = position.quantity * position.unit_price

    texts.push(
      { x: colPos, y: rowY, size: tableFontSize, text: String(index + 1) },
      { x: colQuantityRight, y: rowY, size: tableFontSize, text: position.quantity.toFixed(2).replace('.', ','), align: 'right' },
      { x: colUnitLeft, y: rowY, size: tableFontSize, text: position.unit || '-' },
      { x: colUnitPriceRight, y: rowY, size: tableFontSize, text: formatMoney(position.unit_price), align: 'right' },
      ...(hasMixedTaxRates && colVatRight !== null ? [{ x: colVatRight, y: rowY, size: tableFontSize, text: formatRate(position.tax), align: 'right' as const }] : []),
      { x: colPriceRight, y: rowY, size: tableFontSize, text: formatMoney(netLineTotal), align: 'right' },
    )

    nameLines.forEach((line, lineIndex) => {
      texts.push({
        x: colDescription,
        y: rowY - (lineIndex * 12),
        size: 9.5,
        text: line,
        font: 'F2',
      })
    })

    if (detailLines.length) {
      const descriptionStartY = rowY - (nameLines.length * 12) - 4
      detailLines.forEach((line, lineIndex) => {
        texts.push({
          x: colDescription,
          y: descriptionStartY - (lineIndex * 12),
          size: 9.5,
          text: line,
          gray: 0.35,
        })
      })
    }

    const nameHeight = nameLines.length * 12
    const descriptionHeight = detailLines.length ? (detailLines.length * 12) + 4 : 0
    rowY -= Math.max(20, nameHeight + descriptionHeight + 8)
  })
  const isKleinunternehmer = invoice.is_kleinunternehmer
  const netByTax = new Map<number, number>()
  for (const position of invoice.positions) {
    const key = Number(position.tax)
    netByTax.set(key, (netByTax.get(key) || 0) + (Number(position.quantity) * Number(position.unit_price)))
  }
  const totalsStartY = rowY - 9
  const netRowTop = totalsStartY + 12
  const netRowBottom = totalsStartY - 6
  lines.push(
    { x1: tableLeft, y1: netRowTop, x2: tableRight, y2: netRowTop, width: 0.8 },
    { x1: tableLeft, y1: netRowBottom, x2: tableRight, y2: netRowBottom, width: 0.8 },
  )
  texts.push(
    { x: tableLeft + 2, y: centeredTextBaseline(netRowTop, netRowBottom, 10), size: 10, text: 'Gesamtbetrag Netto' },
    { x: tableRight - 4, y: centeredTextBaseline(netRowTop, netRowBottom, 10), size: 10, text: formatMoney(netTotal), font: 'F2', align: 'right' },
  )

  let totalsY = totalsStartY - 18
  if (taxEntries.length) {
    for (const [tax, amount] of taxEntries) {
      const taxPrefix = isKleinunternehmer && Number(tax) === 0 ? '*' : ''
      const taxLabel = hasMixedTaxRates
        ? `${taxPrefix}zzgl. ${formatRate(tax)} USt. auf ${formatMoney(netByTax.get(tax) || 0)}`
        : `${taxPrefix}zzgl. ${formatRate(tax)} USt.`
      const vatRowTop = totalsY + 9
      const vatRowBottom = totalsY - 9
      texts.push(
        { x: tableLeft + 2, y: centeredTextBaseline(vatRowTop, vatRowBottom, 10), size: 10, text: taxLabel },
      )
      texts.push({
        x: tableRight - 4,
        y: centeredTextBaseline(vatRowTop, vatRowBottom, 10),
        size: 10,
        text: formatMoney(amount),
        align: 'right',
      })
      totalsY -= 18
    }
  }

  const grossRowTop = totalsY + 8
  const grossRowBottom = totalsY - 10
  lines.push(
    { x1: tableLeft, y1: grossRowTop, x2: tableRight, y2: grossRowTop, width: 1.4 },
    { x1: tableLeft, y1: grossRowBottom, x2: tableRight, y2: grossRowBottom, width: 1.4 },
  )
  texts.push(
    { x: tableLeft + 2, y: centeredTextBaseline(grossRowTop, grossRowBottom, 11), size: 11, text: 'Gesamtbetrag Brutto', font: 'F2' },
    { x: tableRight - 4, y: centeredTextBaseline(grossRowTop, grossRowBottom, 11), size: 11, text: formatMoney(grossTotal), font: 'F2', align: 'right' },
  )

  let notesY = totalsY - 22
  if (isKleinunternehmer) {
    texts.push({
      x: tableLeft,
      y: notesY,
      size: 8,
      text: '*Die in Rechnung gestellten Lieferungen und Leistungen sind gemäß §19 UStG umsatzsteuerfrei.',
      font: 'F3',
    })
    notesY -= 16
  }

  for (const line of wrapTextByWidth(
    `Bitte überweisen Sie den vollständigen Rechnungsbetrag unter Angabe der Rechnungsnummer bis zum ${formatDate(invoice.due_date)} auf das unten angegebene Konto.`,
    contentRight - contentLeft,
    10,
  )) {
    if (!line) {
      notesY -= 10
      continue
    }
    texts.push({
      x: tableLeft,
      y: notesY,
      size: 10,
      text: line,
    })
    notesY -= 12
  }
  notesY -= 24

  if (renderedNotes) {
    for (const line of wrapTextByWidth(renderedNotes, contentRight - contentLeft, 10)) {
      if (!line) {
        notesY -= 10
        continue
      }
      texts.push({ x: tableLeft, y: notesY, size: 10, text: line })
      notesY -= 12
    }
    notesY -= 8
  }

  lines.push(
    { x1: contentLeft, y1: 96, x2: contentRight, y2: 96, width: 0.8 },
  )
  const footerColumns = [
    [
      association.name,
      compactAddress([association.street, association.street_number]),
      compactAddress([association.postal_code, association.city]),
    ],
    [
      association.email || '',
      association.website || '',
      association.phone ? `Tel.: ${association.phone}` : '',
    ],
    [
      association.register_court || '',
      association.register_number || '',
      boardLine || '',
    ],
    [
      association.bankname || '',
      association.iban ? `IBAN: ${association.iban}` : '',
      association.bic ? `BIC: ${association.bic}` : '',
      association.vat_id ? `Steuer-Nr.: ${association.vat_id}` : '',
    ],
  ]
  const footerGap = 14
  const footerColumnWidths: [number, number, number, number] = [110, 90, 70, 143]
  const footerXs: [number, number, number, number] = [
    contentLeft,
    contentLeft + footerColumnWidths[0] + footerGap,
    contentLeft + footerColumnWidths[0] + footerGap + footerColumnWidths[1] + footerGap,
    contentRight - footerColumnWidths[3],
  ]
  const footerWidths = [
    footerColumnWidths[0],
    footerColumnWidths[1],
    footerXs[3] - footerXs[2] - footerGap,
    footerColumnWidths[3],
  ]
  footerColumns.forEach((column, columnIndex) => {
    let y = 82
    column.filter(Boolean).forEach((line, lineIndex) => {
      const isAssociationName = columnIndex === 0 && lineIndex === 0
      const fontSize = 8.5
      const wrappedLines = wrapTextByWidth(line, footerWidths[columnIndex]!, fontSize)
      wrappedLines.forEach((wrappedLine) => {
        texts.push({
          x: footerXs[columnIndex]!,
          y,
          size: fontSize,
          text: wrappedLine,
          font: isAssociationName ? 'F2' : 'F1',
        })
        y -= 11
      })
    })
  })

  const content = [
    '0 g 0 G',
    ...drawRects(rects),
    ...drawText(backgroundTexts),
    ...drawLines(lines),
    ...drawImages(images),
    '0 g 0 G',
    ...drawText(texts),
  ].join('\n')

  return buildPdfDocument({ pages: [content], imageObject })
}
