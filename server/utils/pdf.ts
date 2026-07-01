import { deflateSync, inflateSync } from 'zlib'

export interface PdfText {
  x: number
  y: number
  size: number
  text: string
  font?: 'F1' | 'F2' | 'F3'
  align?: 'left' | 'right'
  gray?: number
}

export interface PdfLine {
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
  gray?: number
}

export interface PdfRect {
  x: number
  y: number
  width: number
  height: number
  fill?: boolean
  stroke?: boolean
  gray?: number
}

export interface PdfImage {
  x: number
  y: number
  width: number
  height: number
  objectName: string
}

export interface PdfImageObject {
  width: number
  height: number
  imageObject: string
  softMaskObject?: string
  /** Horizontal bounds (0-1, fraction of width) of the non-transparent content, for visually centering logos with asymmetric padding. */
  contentBounds?: { left: number, right: number }
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

const PREFERRED_BREAK_CHARS = new Set([' ', '.', '-', '_', '@', '/', ',', ';', ':'])

export function wrapText(text: string, maxChars: number) {
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

// Standard Adobe core-font advance widths (per 1000 em units), used by every PDF viewer
// for the built-in Helvetica / Helvetica-Bold fonts we reference without embedding.
// Using the real metrics (rather than a per-character heuristic) is what makes
// centered headings line up pixel-accurately.
const HELVETICA_WIDTHS: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, '\'': 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 278, '\\': 278, ']': 278, '^': 469, _: 556, '`': 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  '{': 334, '|': 260, '}': 334, '~': 584,
  ä: 556, ö: 556, ü: 556, Ä: 667, Ö: 778, Ü: 722, ß: 611,
  '§': 556, '·': 278, '€': 556, '°': 400,
}

const HELVETICA_BOLD_WIDTHS: Record<string, number> = {
  ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, '\'': 238,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611, '@': 975,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556,
  K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  '[': 333, '\\': 278, ']': 333, '^': 584, _: 556, '`': 333,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278,
  k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333,
  u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  '{': 389, '|': 280, '}': 389, '~': 584,
  ä: 611, ö: 611, ü: 611, Ä: 722, Ö: 778, Ü: 722, ß: 611,
  '§': 611, '·': 278, '€': 556, '°': 400,
}

export function estimateTextWidth(text: string, size: number, bold = false) {
  const table = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS
  let units = 0

  for (const char of text) {
    const glyphWidth = table[char]
    if (glyphWidth !== undefined) {
      units += glyphWidth / 1000
      continue
    }

    // Fallback heuristic for characters outside the known metrics table.
    if ('ilIjtfr'.includes(char)) units += 0.32
    else if ('mwMW@%'.includes(char)) units += 0.92
    else if (' .,:;|!'.includes(char)) units += 0.24
    else if ('-_()/\\[]{}+'.includes(char)) units += 0.4
    else units += 0.58
  }

  return units * size
}

export function wrapTextByWidth(text: string, maxWidth: number, size: number) {
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

export function centeredTextBaseline(topY: number, bottomY: number, fontSize: number) {
  return ((topY + bottomY) / 2) - (fontSize * 0.3)
}

export function drawText(entries: PdfText[]) {
  return entries.map((entry) => {
    const isBold = entry.font === 'F2'
    const x = entry.align === 'right' ? entry.x - estimateTextWidth(entry.text, entry.size, isBold) : entry.x
    return `BT ${entry.gray ?? 0} g /${entry.font || 'F1'} ${entry.size} Tf 1 0 0 1 ${x} ${entry.y} Tm (${encodePdfText(entry.text)}) Tj ET`
  })
}

export function drawLines(entries: PdfLine[]) {
  return entries.map(entry => `${entry.gray ?? 0} G ${entry.width || 1} w ${entry.x1} ${entry.y1} m ${entry.x2} ${entry.y2} l S`)
}

export function drawRects(entries: PdfRect[]) {
  return entries.map(entry => {
    const commands = [`${entry.gray ?? 0} g`, `${entry.gray ?? 0} G`, `${entry.x} ${entry.y} ${entry.width} ${entry.height} re`]
    if (entry.fill && entry.stroke) commands.push('B')
    else if (entry.fill) commands.push('f')
    else commands.push('S')
    return commands.join(' ')
  })
}

export function drawImages(entries: PdfImage[]) {
  return entries.map(entry => `q ${entry.width} 0 0 ${entry.height} ${entry.x} ${entry.y} cm /${entry.objectName} Do Q`)
}

export function buildImageObject(logo: { mimeType: string, data: Buffer }) {
  const normalized = logo.mimeType.toLowerCase()
  if (normalized === 'image/png') return buildPngImageObject(logo.data)
  if (normalized !== 'image/jpeg' && normalized !== 'image/jpg') return null

  return buildJpegImageObject(logo.data)
}

/** x-position for the image's canvas so its visible content (not the full, possibly asymmetrically padded, canvas) is centered at centerX. */
export function centeredImageX(centerX: number, displayWidth: number, imageObject: PdfImageObject) {
  const bounds = imageObject.contentBounds ?? { left: 0, right: 1 }
  const visualCenterFraction = (bounds.left + bounds.right) / 2
  return centerX - (visualCenterFraction * displayWidth)
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

    if (marker === undefined) break
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
      if (width > 0 && height > 0 && components !== undefined && components > 0) {
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
    contentBounds: bytesPerPixel === 4 ? computeAlphaContentBounds(rgbaRows, width, bytesPerPixel) : undefined,
  }
}

function computeAlphaContentBounds(rows: Buffer[], width: number, bytesPerPixel: number) {
  const ALPHA_THRESHOLD = 16
  let minCol = -1
  let maxCol = -1

  for (let pixel = 0; pixel < width; pixel += 1) {
    const columnHasContent = rows.some(row => (row[(pixel * bytesPerPixel) + 3] ?? 0) > ALPHA_THRESHOLD)
    if (!columnHasContent) continue
    if (minCol === -1) minCol = pixel
    maxCol = pixel
  }

  if (minCol === -1) return undefined

  return {
    left: minCol / width,
    right: (maxCol + 1) / width,
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

export function buildPdfDocument(params: {
  pages: string[]
  imageObject?: PdfImageObject | null
}) {
  const { imageObject = null } = params
  const pages = params.pages.length ? params.pages : ['']

  const firstPageObjectId = 3
  const pageObjectId = (index: number) => firstPageObjectId + (index * 2)
  const contentObjectId = (index: number) => pageObjectId(index) + 1
  const fontRegularId = firstPageObjectId + (pages.length * 2)
  const fontBoldId = fontRegularId + 1
  const fontItalicId = fontRegularId + 2
  const imageObjectId = imageObject ? fontItalicId + 1 : null
  const softMaskObjectId = imageObject?.softMaskObject ? fontItalicId + 2 : null

  const xObjectPart = imageObjectId ? ` /XObject << /Im1 ${imageObjectId} 0 R >>` : ''
  const resources = `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontItalicId} 0 R >>${xObjectPart} >>`
  const kids = pages.map((_, index) => `${pageObjectId(index)} 0 R`).join(' ')

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    `2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pages.length} >> endobj`,
  ]

  pages.forEach((content, index) => {
    const stream = Buffer.from(content, 'binary')
    objects.push(`${pageObjectId(index)} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595.25 842] /Contents ${contentObjectId(index)} 0 R /Resources ${resources} >> endobj`)
    objects.push(`${contentObjectId(index)} 0 obj << /Length ${stream.length} >> stream\n${stream.toString('binary')}\nendstream endobj`)
  })

  objects.push(`${fontRegularId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`)
  objects.push(`${fontBoldId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj`)
  objects.push(`${fontItalicId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >> endobj`)

  if (imageObject && imageObjectId) {
    const smaskReference = softMaskObjectId ? ` /SMask ${softMaskObjectId} 0 R` : ''
    objects.push(`${imageObjectId} 0 obj ${imageObject.imageObject.replace('>> stream', `${smaskReference} >> stream`)} endobj`)
  }
  if (imageObject?.softMaskObject && softMaskObjectId) {
    objects.push(`${softMaskObjectId} 0 obj ${imageObject.softMaskObject} endobj`)
  }

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
