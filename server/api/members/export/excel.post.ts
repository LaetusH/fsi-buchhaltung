import { defineEventHandler, readBody, setHeader } from 'h3'
import { requirePermission } from '~/server/utils/api/guards'
import { getAssociationLogoForInvoice, getAssociationProfileForInvoice } from '~/server/utils/invoices'
import {
  loadMembersForExport,
  memberExportCellValue,
  memberExportColumnMetrics,
  memberExportFileName,
  parseMemberExportConfig,
} from '~/server/utils/memberExport'
import { buildXlsxWorkbook } from '~/server/utils/xlsx'

export default defineEventHandler(async (event) => {
  const current = await requirePermission(event, 'members.view')
  if (!current.ok) return current

  const parsed = parseMemberExportConfig(await readBody(event))
  if (!parsed.ok) return parsed

  const { config } = parsed
  const members = await loadMembersForExport(config.statuses)
  const association = await getAssociationProfileForInvoice()

  let logo: { mimeType: string, data: Buffer } | null = null
  try {
    const attachedLogo = await getAssociationLogoForInvoice()
    if (attachedLogo) {
      logo = { mimeType: attachedLogo.file.mime_type, data: attachedLogo.data }
    }
  } catch {
    logo = null
  }

  const compactLine = (parts: Array<string | null | undefined>) =>
    parts.map(part => String(part ?? '').trim()).filter(Boolean).join(' ')

  const today = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  const createdAt = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear()}`

  const hasBlankColumns = config.columns.some(column => column.key === 'blank')
  const workbook = buildXlsxWorkbook({
    sheetName: 'Mitglieder',
    title: config.title,
    subtitle: `${members.length} ${members.length === 1 ? 'Mitglied' : 'Mitglieder'} · Stand: ${createdAt}`,
    columns: config.columns.map(column => ({
      label: column.label,
      hint: column.hint,
      width: memberExportColumnMetrics(column).excelWidth,
    })),
    rows: members.map(member => config.columns.map(column => memberExportCellValue(member, column))),
    orientation: config.columns.length > 5 ? 'landscape' : 'portrait',
    footerLabel: [association?.short_name || association?.name, config.title].filter(Boolean).join(' · '),
    emptyText: 'Keine Mitglieder vorhanden.',
    dataRowHeight: hasBlankColumns ? 26 : 0,
    letterhead: association
      ? {
          name: association.name,
          addressLines: [
            compactLine([association.street, association.street_number]),
            compactLine([association.postal_code, association.city]),
          ],
        }
      : null,
    logo,
  })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="${memberExportFileName('xlsx')}"`)
  return workbook
})
