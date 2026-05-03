import { deflateSync, inflateSync } from 'zlib'
import { calculateInvoicePositionTotals } from '~/server/utils/invoices'
import { DEFAULT_INVOICE_TEXT_SETTINGS } from '~/server/utils/appSettings'
import type { AssociationProfileRow } from '~/types/association'
import type { InvoiceTextSettings } from '~/types/appSettings'
import type { CompanyRow } from '~/types/company'
import type { CreateInvoiceBody } from '~/types/invoice'
import { renderInvoiceTextTemplate } from '~/utils/invoiceTextTemplates'

interface PdfText {
  x: number
  y: number
  size: number
  text: string
  font?: 'F1' | 'F2' | 'F3'
  align?: 'left' | 'right'
  gray?: number
}

interface PdfLine {
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
}

interface PdfRect {
  x: number
  y: number
  width: number
  height: number
  fill?: boolean
  stroke?: boolean
  gray?: number
}

interface PdfImage {
  x: number
  y: number
  width: number
  height: number
  objectName: string
}

interface PdfImageObject {
  width: number
  height: number
  imageObject: string
  softMaskObject?: string
}

function escapePdfText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

function encodePdfChar(char: string) {
  if (char === '€') return '\x80'
  return Buffer.from(char, 'latin1').toString('binary')
}

function encodePdfText(value: string) {
  return [...escapePdfText(value)].map(encodePdfChar).join('')
}

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

function wrapText(text: string, maxChars: number) {
  const lines: string[] = []

  const splitLongToken = (token: string) => {
    const tokenLines: string[] = []
    let remaining = token

    while (remaining.length > maxChars) {
      let splitAt = -1
      const searchEnd = Math.min(maxChars, remaining.length - 1)

      for (let index = searchEnd; index >= 0; index -= 1) {
        if (PREFERRED_BREAK_CHARS.has(remaining[index]!)) {
          splitAt = index + 1
          break
        }
      }

      if (splitAt <= 0) splitAt = maxChars

      tokenLines.push(remaining.slice(0, splitAt))
      remaining = remaining.slice(splitAt)
    }

    if (remaining) tokenLines.push(remaining)
    return tokenLines
  }

  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (next.length > maxChars && current) {
        lines.push(current)
        if (word.length > maxChars) {
          const parts = splitLongToken(word)
          current = parts.pop() || ''
          lines.push(...parts)
        } else {
          current = word
        }
      } else if (next.length > maxChars) {
        const parts = splitLongToken(next)
        current = parts.pop() || ''
        lines.push(...parts)
      } else {
        current = next
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

const PREFERRED_BREAK_CHARS = new Set([' ', '.', '-', '_', '@', '/', ',', ';', ':'])

function estimateTextWidth(text: string, size: number) {
  let units = 0

  for (const char of text) {
    if ('ilIjtfr'.includes(char)) units += 0.32
    else if ('mwMW@%'.includes(char)) units += 0.92
    else if (' .,:;|!'.includes(char)) units += 0.24
    else if ('-_()/\\[]{}+'.includes(char)) units += 0.4
    else if ('0123456789'.includes(char)) units += 0.56
    else if ('äöüÄÖÜß'.includes(char)) units += 0.56
    else if (char === '€') units += 0.56
    else units += 0.58
  }

  return units * size
}

function wrapTextByWidth(text: string, maxWidth: number, size: number) {
  const lines: string[] = []

  const pushWrappedToken = (token: string) => {
    let remaining = token

    while (remaining) {
      if (estimateTextWidth(remaining, size) <= maxWidth) {
        lines.push(remaining)
        break
      }

      const twoLineCandidates: Array<{ split: number, balance: number }> = []
      for (let index = 0; index < remaining.length; index += 1) {
        if (!PREFERRED_BREAK_CHARS.has(remaining[index]!)) continue

        const candidate = index + 1
        const left = remaining.slice(0, candidate)
        const right = remaining.slice(candidate)
        const leftWidth = estimateTextWidth(left, size)
        const rightWidth = estimateTextWidth(right, size)

        if (leftWidth <= maxWidth && rightWidth <= maxWidth) {
          twoLineCandidates.push({
            split: candidate,
            balance: Math.abs(leftWidth - rightWidth),
          })
        }
      }

      if (twoLineCandidates.length) {
        const bestCandidate = twoLineCandidates.reduce((best, candidate) =>
          candidate.balance < best.balance ? candidate : best
        )
        lines.push(remaining.slice(0, bestCandidate.split))
        remaining = remaining.slice(bestCandidate.split)
        continue
      }

      let splitAt = remaining.length
      while (splitAt > 0 && estimateTextWidth(remaining.slice(0, splitAt), size) > maxWidth) {
        splitAt -= 1
      }

      if (splitAt <= 0) splitAt = 1

      const preferredSplits: number[] = []
      for (let index = splitAt - 1; index >= 0; index -= 1) {
        if (PREFERRED_BREAK_CHARS.has(remaining[index]!)) {
          preferredSplits.push(index + 1)
        }
      }

      const twoLineSplit = preferredSplits.find(candidate =>
        estimateTextWidth(remaining.slice(candidate), size) <= maxWidth
      )

      const finalSplit = twoLineSplit
        ?? preferredSplits[0]
        ?? splitAt

      lines.push(remaining.slice(0, finalSplit))
      remaining = remaining.slice(finalSplit)
    }
  }

  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (estimateTextWidth(next, size) <= maxWidth) {
        current = next
        continue
      }

      if (current) {
        lines.push(current)
        current = ''
      }

      if (estimateTextWidth(word, size) <= maxWidth) {
        current = word
      } else {
        pushWrappedToken(word)
      }
    }

    if (current) lines.push(current)
  }

  return lines
}

function centeredTextBaseline(topY: number, bottomY: number, fontSize: number) {
  return ((topY + bottomY) / 2) - (fontSize * 0.3)
}

function drawText(entries: PdfText[]) {
  return entries.map(entry =>
    `BT ${entry.gray ?? 0} g /${entry.font || 'F1'} ${entry.size} Tf 1 0 0 1 ${entry.align === 'right' ? entry.x - estimateTextWidth(entry.text, entry.size) : entry.x} ${entry.y} Tm (${encodePdfText(entry.text)}) Tj ET`
  )
}

function drawLines(entries: PdfLine[]) {
  return entries.map(entry => `${entry.width || 1} w ${entry.x1} ${entry.y1} m ${entry.x2} ${entry.y2} l S`)
}

function drawRects(entries: PdfRect[]) {
  return entries.map(entry => {
    const commands = [`${entry.gray ?? 0} g`, `${entry.gray ?? 0} G`, `${entry.x} ${entry.y} ${entry.width} ${entry.height} re`]
    if (entry.fill && entry.stroke) commands.push('B')
    else if (entry.fill) commands.push('f')
    else commands.push('S')
    return commands.join(' ')
  })
}

function drawImages(entries: PdfImage[]) {
  return entries.map(entry => `q ${entry.width} 0 0 ${entry.height} ${entry.x} ${entry.y} cm /${entry.objectName} Do Q`)
}

function buildImageObject(logo: { mimeType: string, data: Buffer }) {
  const normalized = logo.mimeType.toLowerCase()
  if (normalized === 'image/png') return buildPngImageObject(logo.data)
  if (normalized !== 'image/jpeg' && normalized !== 'image/jpg') return null

  return buildJpegImageObject(logo.data)
}

function buildJpegImageObject(data: Buffer): PdfImageObject | null {
  const info = readJpegSize(data)
  if (!info) return null

  const colorSpace = info.components === 1 ? '/DeviceGray' : '/DeviceRGB'
  return {
    width: info.width,
    height: info.height,
    imageObject: `<< /Type /XObject /Subtype /Image /Width ${info.width} /Height ${info.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >> stream\n${data.toString('binary')}\nendstream`,
  }
}

function readJpegSize(data: Buffer) {
  if (data.length < 4 || data[0] !== 0xFF || data[1] !== 0xD8) return null

  let offset = 2
  while (offset < data.length - 9) {
    while (offset < data.length && data[offset] !== 0xFF) offset += 1
    while (offset < data.length && data[offset] === 0xFF) offset += 1
    if (offset >= data.length) break

    const marker = data[offset]
    offset += 1

    if (marker === 0xD9 || marker === 0xDA) break
    if (offset + 1 >= data.length) break

    const segmentLength = data.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > data.length) break

    const isStartOfFrame = (
      (marker >= 0xC0 && marker <= 0xC3)
      || (marker >= 0xC5 && marker <= 0xC7)
      || (marker >= 0xC9 && marker <= 0xCB)
      || (marker >= 0xCD && marker <= 0xCF)
    )

    if (isStartOfFrame) {
      const height = data.readUInt16BE(offset + 3)
      const width = data.readUInt16BE(offset + 5)
      const components = data[offset + 7]
      if (width > 0 && height > 0 && components > 0) {
        return { width, height, components }
      }
      break
    }

    offset += segmentLength
  }

  return null
}

function buildPngImageObject(data: Buffer): PdfImageObject | null {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  if (data.length < 33 || !data.subarray(0, 8).equals(signature)) return null

  const width = data.readUInt32BE(16)
  const height = data.readUInt32BE(20)
  const bitDepth = data[24]
  const colorType = data[25]
  const compression = data[26]
  const filter = data[27]
  const interlace = data[28]

  if (!width || !height || bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) return null
  if (colorType !== 2 && colorType !== 6) return null

  const idatChunks: Buffer[] = []
  let offset = 8
  while (offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset)
    const type = data.toString('ascii', offset + 4, offset + 8)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + length
    if (chunkEnd + 4 > data.length) return null
    if (type === 'IDAT') idatChunks.push(data.subarray(chunkStart, chunkEnd))
    if (type === 'IEND') break
    offset = chunkEnd + 4
  }

  if (!idatChunks.length) return null

  const compressedData = Buffer.concat(idatChunks)
  const inflated = inflateSync(compressedData)
  const bytesPerPixel = colorType === 6 ? 4 : 3
  const stride = width * bytesPerPixel
  const expectedLength = (stride + 1) * height
  if (inflated.length !== expectedLength) return null

  const rgbaRows = unfilterPngScanlines(inflated, width, height, bytesPerPixel)
  if (!rgbaRows) return null

  const rgbRows: Buffer[] = []
  const alphaRows: Buffer[] = []

  for (let rowIndex = 0; rowIndex < rgbaRows.length; rowIndex += 1) {
    const row = rgbaRows[rowIndex]!
    const rgb = Buffer.alloc(1 + (width * 3))
    rgb[0] = 0
    const alpha = colorType === 6 ? Buffer.alloc(1 + width) : null
    if (alpha) alpha[0] = 0

    for (let pixel = 0; pixel < width; pixel += 1) {
      const sourceOffset = pixel * bytesPerPixel
      const rgbOffset = 1 + (pixel * 3)
      rgb[rgbOffset] = row[sourceOffset]!
      rgb[rgbOffset + 1] = row[sourceOffset + 1]!
      rgb[rgbOffset + 2] = row[sourceOffset + 2]!
      if (alpha) alpha[1 + pixel] = row[sourceOffset + 3]!
    }

    rgbRows.push(rgb)
    if (alpha) alphaRows.push(alpha)
  }

  const rgbData = deflateSync(Buffer.concat(rgbRows))
  const alphaData = alphaRows.length ? deflateSync(Buffer.concat(alphaRows)) : null

  return {
    width,
    height,
    imageObject: `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${width} >> /Length ${rgbData.length} >> stream\n${rgbData.toString('binary')}\nendstream`,
    softMaskObject: alphaData
      ? `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${width} >> /Length ${alphaData.length} >> stream\n${alphaData.toString('binary')}\nendstream`
      : undefined,
  }
}

function unfilterPngScanlines(data: Buffer, width: number, height: number, bytesPerPixel: number) {
  const stride = width * bytesPerPixel
  const rows: Buffer[] = []
  let offset = 0

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = data[offset]
    if (filterType === undefined) return null
    offset += 1

    const source = data.subarray(offset, offset + stride)
    if (source.length !== stride) return null
    offset += stride

    const target = Buffer.alloc(stride)
    const previous = rows[rowIndex - 1] ?? Buffer.alloc(stride)

    for (let i = 0; i < stride; i += 1) {
      const left = i >= bytesPerPixel ? target[i - bytesPerPixel]! : 0
      const up = previous[i] ?? 0
      const upLeft = i >= bytesPerPixel ? previous[i - bytesPerPixel] ?? 0 : 0
      const value = source[i] ?? 0

      switch (filterType) {
        case 0:
          target[i] = value
          break
        case 1:
          target[i] = (value + left) & 0xFF
          break
        case 2:
          target[i] = (value + up) & 0xFF
          break
        case 3:
          target[i] = (value + Math.floor((left + up) / 2)) & 0xFF
          break
        case 4:
          target[i] = (value + paethPredictor(left, up, upLeft)) & 0xFF
          break
        default:
          return null
      }
    }

    rows.push(target)
  }

  return rows
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const p = left + up - upLeft
  const pa = Math.abs(p - left)
  const pb = Math.abs(p - up)
  const pc = Math.abs(p - upLeft)
  if (pa <= pb && pa <= pc) return left
  if (pb <= pc) return up
  return upLeft
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
      x: (pageWidth - estimateTextWidth(draftText, 64)) / 2,
      y: 415,
      size: 64,
      text: draftText,
      font: 'F2',
      gray: 0.82,
    })
  }

  if (imageObject) {
    images.push({
      x: headingCenterX - (logoWidth / 2),
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
  const infoRows = [
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
  const footerColumnWidths = [110, 90, 70, 143]
  const footerXs = [
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

  const stream = Buffer.from(content, 'binary')
  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
  ]

  const imageObjectId = imageObject ? 6 : null
  const softMaskObjectId = imageObject?.softMaskObject ? 7 : null
  const boldFontObjectId = imageObject ? (softMaskObjectId ? 8 : 7) : 6
  const italicFontObjectId = boldFontObjectId + 1
  const xObjectPart = imageObject && imageObjectId ? `/XObject << /Im1 ${imageObjectId} 0 R >>` : ''
  const smaskReference = softMaskObjectId ? ` /SMask ${softMaskObjectId} 0 R` : ''
  objects.push(`3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595.25 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 ${boldFontObjectId} 0 R /F3 ${italicFontObjectId} 0 R >> ${xObjectPart} >> >> endobj`)
  objects.push(`4 0 obj << /Length ${stream.length} >> stream\n${stream.toString('binary')}\nendstream endobj`)
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj')
  if (imageObject && imageObjectId) {
    objects.push(`6 0 obj ${imageObject.imageObject.replace('>> stream', `${smaskReference} >> stream`)} endobj`)
  }
  if (imageObject?.softMaskObject && softMaskObjectId) {
    objects.push(`7 0 obj ${imageObject.softMaskObject} endobj`)
  }
  objects.push(`${boldFontObjectId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj`)
  objects.push(`${italicFontObjectId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >> endobj`)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'binary'))
    pdf += `${object}\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, 'binary')
}
