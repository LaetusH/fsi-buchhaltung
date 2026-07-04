import {
  buildImageObject,
  buildPdfDocument,
  centeredImageX,
  drawImages,
  drawLines,
  drawRects,
  drawText,
  estimateTextWidth,
  wrapTextByWidth,
  type PdfImage,
  type PdfLine,
  type PdfRect,
  type PdfText,
} from '~/server/utils/pdf'
import type { AssociationProfileRow } from '~/types/association'
import type { EventShiftSlot, EventShiftTypeDescriptions } from '~/types/event'

export interface ShiftPlanEventInfo {
  name: string
  starts_at: string
  ends_at: string
  location: string | null
}

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function formatDayLabel(dayKey: string) {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return dayKey

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return `${WEEKDAY_LABELS[date.getDay()]}, ${match[3]}.${match[2]}.${match[1]}`
}

function formatTime(value: string) {
  return value.slice(11, 16) || value
}

function formatDateTimeLabel(value: string) {
  const dayKey = value.slice(0, 10)
  return `${formatDayLabel(dayKey)} ${formatTime(value)}`
}

function formatRangeLabel(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) return ''
  if (startsAt.slice(0, 10) === endsAt.slice(0, 10)) {
    return `${formatTime(startsAt)} - ${formatTime(endsAt)} Uhr`
  }

  return `${formatDateTimeLabel(startsAt)} - ${formatDateTimeLabel(endsAt)}`
}

function normalizeShiftTypeName(name: string) {
  return name.trim().toLocaleLowerCase()
}

interface MemberNameSegment {
  text: string
  bold: boolean
}

/** Lays out member names as wrappable atomic units (never splitting a name mid-word) so the highlighted member's name can be bolded individually. */
function layoutMemberNameLines(
  members: EventShiftSlot['members'],
  highlightMemberId: number | null,
  maxWidth: number,
  fontSize: number,
): MemberNameSegment[][] {
  const lines: MemberNameSegment[][] = []
  let currentLine: MemberNameSegment[] = []
  let currentWidth = 0

  members.forEach((member, index) => {
    const isLast = index === members.length - 1
    const text = isLast ? member.full_name : `${member.full_name}, `
    const bold = highlightMemberId !== null && member.id === highlightMemberId
    const width = estimateTextWidth(text, fontSize, bold)

    if (currentLine.length && currentWidth + width > maxWidth) {
      lines.push(currentLine)
      currentLine = []
      currentWidth = 0
    }

    currentLine.push({ text, bold })
    currentWidth += width
  })

  if (currentLine.length) lines.push(currentLine)
  if (!lines.length) lines.push([{ text: '-', bold: false }])

  return lines
}

function groupShiftsByTime(shifts: EventShiftSlot[]) {
  const groups: Array<{ startsAt: string, endsAt: string, shifts: EventShiftSlot[] }> = []

  for (const shift of shifts) {
    const last = groups[groups.length - 1]
    if (last && last.startsAt === shift.starts_at && last.endsAt === shift.ends_at) {
      last.shifts.push(shift)
      continue
    }
    groups.push({ startsAt: shift.starts_at, endsAt: shift.ends_at, shifts: [shift] })
  }

  return groups
}

/** Maps each shift-type name present among the given shifts to its display label and persisted type description, if any. */
function buildTypeLabels(shifts: EventShiftSlot[], typeDescriptions: EventShiftTypeDescriptions) {
  const labelsByKey = new Map<string, { label: string, description: string }>()

  for (const shift of shifts) {
    const key = normalizeShiftTypeName(shift.name)
    if (labelsByKey.has(key)) continue

    const description = typeDescriptions[key]?.trim() ?? ''
    if (description) labelsByKey.set(key, { label: shift.name.trim(), description })
  }

  return labelsByKey
}

export function buildEventShiftPlanPdf(params: {
  event: ShiftPlanEventInfo
  shifts: EventShiftSlot[]
  typeDescriptions: EventShiftTypeDescriptions
  includeDescriptions: boolean
  highlightMemberId?: number | null
  association: AssociationProfileRow | null
  logo?: { mimeType: string, data: Buffer } | null
}) {
  const { event, shifts, typeDescriptions, includeDescriptions, highlightMemberId = null, association, logo = null } = params
  const imageObject = logo ? buildImageObject(logo) : null

  const pageWidth = 595.25
  const contentLeft = 55
  const contentRight = 540
  const bottomLimit = 78
  const continuationTop = 800

  const timeLeft = contentLeft + 4
  const nameLeft = 165
  const staffedRight = 355
  const membersLeft = 368
  const nameWidth = staffedRight - 42 - nameLeft
  const membersWidth = contentRight - 4 - membersLeft

  interface PageBuffer {
    texts: PdfText[]
    lines: PdfLine[]
    rects: PdfRect[]
    images: PdfImage[]
  }

  const pageBuffers: PageBuffer[] = []
  let page: PageBuffer = { texts: [], lines: [], rects: [], images: [] }
  pageBuffers.push(page)
  let y = 0
  let tableHeaderDrawn = false

  const drawTableHeader = () => {
    page.lines.push(
      { x1: contentLeft, y1: y, x2: contentRight, y2: y, width: 0.8 },
      { x1: contentLeft, y1: y - 17, x2: contentRight, y2: y - 17, width: 0.8 },
    )
    page.texts.push(
      { x: timeLeft, y: y - 11, size: 9.5, text: 'Zeit', font: 'F2' },
      { x: nameLeft, y: y - 11, size: 9.5, text: 'Schicht', font: 'F2' },
      { x: staffedRight, y: y - 11, size: 9.5, text: 'Besetzt', font: 'F2', align: 'right' },
      { x: membersLeft, y: y - 11, size: 9.5, text: 'Mitglieder', font: 'F2' },
    )
    y -= 24
  }

  const startContinuationPage = () => {
    page = { texts: [], lines: [], rects: [], images: [] }
    pageBuffers.push(page)
    y = continuationTop
    drawTableHeader()
    tableHeaderDrawn = true
  }

  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight >= bottomLimit) return
    startContinuationPage()
  }

  const renderDayHeading = (label: string) => {
    ensureSpace(26)
    page.rects.push({
      x: contentLeft,
      y: y - 20,
      width: contentRight - contentLeft,
      height: 20,
      fill: true,
      gray: 0.9,
    })
    page.texts.push({ x: timeLeft, y: y - 14, size: 10, text: label, font: 'F2' })
    y -= 20
  }

  const renderTimeGroupHeader = (label: string) => {
    ensureSpace(20)
    page.rects.push({
      x: contentLeft,
      y: y - 16,
      width: contentRight - contentLeft,
      height: 16,
      fill: true,
      gray: 0.95,
    })
    page.texts.push({ x: timeLeft, y: y - 11.5, size: 9, text: label, font: 'F2', gray: 0.25 })
    y -= 16
  }

  const renderShift = (shift: EventShiftSlot) => {
    const nameLines = wrapTextByWidth(shift.name, nameWidth, 9)
    const memberLineSegments = layoutMemberNameLines(shift.members, highlightMemberId, membersWidth, 9)
    const descriptionText = includeDescriptions ? shift.description.trim() : ''
    const descriptionLines = descriptionText
      ? wrapTextByWidth(descriptionText, contentRight - 4 - nameLeft, 8)
      : []

    const contentHeight = (Math.max(nameLines.length, memberLineSegments.length) * 11)
      + (descriptionLines.length ? 2 + (descriptionLines.length * 10) : 0)
    const rowHeight = contentHeight + 7

    ensureSpace(rowHeight)

    const firstBaseline = y - 12

    nameLines.forEach((line, index) => {
      if (!line) return
      page.texts.push({
        x: nameLeft,
        y: firstBaseline - (index * 11),
        size: 9,
        text: line,
        font: 'F2',
      })
    })

    const isFullyStaffed = shift.members.length >= shift.required_people
    page.texts.push({
      x: staffedRight,
      y: firstBaseline,
      size: 9,
      text: `${shift.members.length}/${shift.required_people}`,
      font: 'F2',
      align: 'right',
      gray: isFullyStaffed ? 0.35 : 0,
    })

    memberLineSegments.forEach((lineSegments, lineIndex) => {
      let cursorX = membersLeft
      const segmentY = firstBaseline - (lineIndex * 11)

      lineSegments.forEach((segment) => {
        page.texts.push({
          x: cursorX,
          y: segmentY,
          size: 9,
          text: segment.text,
          font: segment.bold ? 'F2' : 'F1',
          gray: segment.text === '-' ? 0.55 : 0,
        })

        if (segment.bold) {
          const nameOnly = segment.text.replace(/,\s*$/, '')
          page.lines.push({
            x1: cursorX,
            x2: cursorX + estimateTextWidth(nameOnly, 9, true),
            y1: segmentY - 2,
            y2: segmentY - 2,
            width: 1.2,
            gray: 0.3,
          })
        }

        cursorX += estimateTextWidth(segment.text, 9, segment.bold)
      })
    })

    if (descriptionLines.length) {
      const descriptionStartY = firstBaseline - (Math.max(nameLines.length, memberLineSegments.length) * 11) - 1
      descriptionLines.forEach((line, index) => {
        if (!line) return
        page.texts.push({
          x: nameLeft,
          y: descriptionStartY - (index * 10),
          size: 8,
          text: line,
          font: 'F3',
          gray: 0.35,
        })
      })
    }

    page.lines.push({
      x1: contentLeft,
      y1: y - rowHeight,
      x2: contentRight,
      y2: y - rowHeight,
      width: 0.5,
      gray: 0.82,
    })

    y -= rowHeight
  }

  const headingCenterX = pageWidth / 2

  if (imageObject) {
    const logoWidth = 120
    const logoHeight = (logoWidth * imageObject.height) / imageObject.width
    page.images.push({
      x: centeredImageX(headingCenterX, logoWidth, imageObject),
      y: 750,
      width: logoWidth,
      height: logoHeight,
      objectName: 'Im1',
    })
  } else if (association) {
    const associationLabel = association.short_name || association.name
    page.texts.push({
      x: headingCenterX - (estimateTextWidth(associationLabel, 22, true) / 2),
      y: 780,
      size: 22,
      text: associationLabel,
      font: 'F2',
    })
  }

  const title = 'Schichtplan'
  page.texts.push({
    x: headingCenterX - (estimateTextWidth(title, 18, true) / 2),
    y: imageObject ? 722 : 738,
    size: 18,
    text: title,
    font: 'F2',
  })

  const subtitle = event.name.trim() || 'Veranstaltung'
  page.texts.push({
    x: headingCenterX - (estimateTextWidth(subtitle, 12) / 2),
    y: imageObject ? 704 : 720,
    size: 12,
    text: subtitle,
    gray: 0.2,
  })

  const metaParts = [
    `${formatDateTimeLabel(event.starts_at)} - ${formatDateTimeLabel(event.ends_at)}`,
    ...(event.location?.trim() ? [event.location.trim()] : []),
  ]
  const metaLabel = metaParts.join(' · ')
  page.texts.push({
    x: headingCenterX - (estimateTextWidth(metaLabel, 9.5) / 2),
    y: imageObject ? 690 : 706,
    size: 9.5,
    text: metaLabel,
    gray: 0.35,
  })

  y = imageObject ? 664 : 680

  const sortedShifts = [...shifts].sort((left, right) => {
    return left.starts_at.localeCompare(right.starts_at)
      || left.ends_at.localeCompare(right.ends_at)
      || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })

  const typeLabels: Map<string, { label: string, description: string }> = includeDescriptions
    ? buildTypeLabels(sortedShifts, typeDescriptions)
    : new Map()

  if (typeLabels.size) {
    ensureSpace(18)
    page.texts.push({ x: timeLeft, y: y - 12, size: 10.5, text: 'Aufgaben nach Schichttyp', font: 'F2' })
    y -= 18

    for (const { label, description } of typeLabels.values()) {
      ensureSpace(13)
      page.texts.push({ x: timeLeft, y: y - 10, size: 9, text: label, font: 'F2' })
      y -= 12

      const lines = wrapTextByWidth(description, contentRight - 8 - timeLeft, 8.5)
      const rowHeight = (lines.length * 10) + 4
      ensureSpace(rowHeight)
      lines.forEach((line, index) => {
        page.texts.push({ x: timeLeft + 8, y: y - 9 - (index * 10), size: 8.5, text: line, font: 'F3', gray: 0.35 })
      })
      y -= rowHeight
    }

    y -= 6
  }

  if (!tableHeaderDrawn) drawTableHeader()

  const dayKeys = Array.from(new Set(sortedShifts.map(shift => shift.starts_at.slice(0, 10))))

  for (const dayKey of dayKeys) {
    if (dayKeys.length > 1) renderDayHeading(formatDayLabel(dayKey))
    const dayShifts = sortedShifts.filter(shift => shift.starts_at.slice(0, 10) === dayKey)
    for (const group of groupShiftsByTime(dayShifts)) {
      renderTimeGroupHeader(formatRangeLabel(group.startsAt, group.endsAt))
      for (const shift of group.shifts) renderShift(shift)
    }
  }

  if (!sortedShifts.length) {
    page.texts.push({ x: timeLeft, y: y - 14, size: 10, text: 'Keine Schichten vorhanden.', gray: 0.35 })
  }

  const footerLabel = [association?.short_name || association?.name, `Schichtplan ${subtitle}`]
    .filter(Boolean)
    .join(' · ')

  pageBuffers.forEach((buffer, index) => {
    buffer.lines.push({ x1: contentLeft, y1: 58, x2: contentRight, y2: 58, width: 0.8 })
    buffer.texts.push(
      { x: contentLeft, y: 46, size: 8.5, text: footerLabel, gray: 0.35 },
      { x: contentRight, y: 46, size: 8.5, text: `Seite ${index + 1} von ${pageBuffers.length}`, align: 'right', gray: 0.35 },
    )
  })

  const pages = pageBuffers.map(buffer => [
    '0 g 0 G',
    ...drawRects(buffer.rects),
    ...drawLines(buffer.lines),
    ...drawImages(buffer.images),
    '0 g 0 G',
    ...drawText(buffer.texts),
  ].join('\n'))

  return buildPdfDocument({ pages, imageObject })
}
