import { defineEventHandler } from 'h3'
import { query, withTransaction } from '~/server/utils/db'
import { readMultipart } from '~/server/utils/api/request'
import { requirePermission } from '~/server/utils/api/guards'
import { buildInvoicePdf } from '~/server/utils/invoicePdf'
import { getAssociationBoardLineForInvoice, getAssociationLogoForInvoice, getAssociationProfileForInvoice, getInvoiceCompany, invoiceNeedsUploadedFile, invoiceNumberExists, normalizeInvoicePayload, validateInvoicePayload } from '~/server/utils/invoices'
import { storeAndAttachUploadedFile, validateUploadedFile } from '~/server/utils/files'
import { InvoiceSourceType } from '~/types/invoice'

interface CreateInvoiceSuccess {
  ok: true
  invoiceId: number
}

interface CreateInvoiceError {
  ok: false
  error: string
}

type CreateInvoiceResponse = CreateInvoiceSuccess | CreateInvoiceError

interface MysqlError extends Error {
  code?: string
}

export default defineEventHandler(async (event): Promise<CreateInvoiceResponse> => {
  const current = await requirePermission(event, 'invoices.edit')
  if (!current.ok) return current

  const multipart = await readMultipart(event)
  if (!multipart) return { ok: false, error: 'Invalid form data' }

  const invoiceJson = multipart.getField('invoice')
  if (!invoiceJson) return { ok: false, error: 'Missing invoice data' }

  const parsed = normalizeInvoicePayload(JSON.parse(invoiceJson))
  const validationError = validateInvoicePayload(parsed)
  if (validationError) return { ok: false, error: validationError }

  const fileError = validateUploadedFile(
    multipart.file,
    invoiceNeedsUploadedFile(parsed.source_type) ? 'A file is required for uploaded invoices' : undefined,
  )
  if (fileError && (multipart.file || invoiceNeedsUploadedFile(parsed.source_type))) {
    return { ok: false, error: fileError }
  }

  try {
    return await withTransaction(async (conn) => {
      if (await invoiceNumberExists(parsed.invoice_number, null, conn)) {
        return { ok: false, error: 'Invoice number already exists' }
      }

      const result: any = await query(
        `INSERT INTO invoices
          (company_id, source_type, is_kleinunternehmer, invoice_date, due_date, contact_person, service_date, invoice_number, subject, intro_text, notes, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.company_id,
          parsed.source_type,
          parsed.is_kleinunternehmer,
          parsed.invoice_date,
          parsed.due_date,
          parsed.contact_person,
          parsed.service_date,
          parsed.invoice_number,
          parsed.subject,
          parsed.intro_text,
          parsed.notes,
          parsed.status,
          current.user.id,
        ],
        conn,
      )

      const invoiceId = Number(result.insertId)

      for (const position of parsed.positions) {
        await query(
          `INSERT INTO invoice_positions
            (invoice_id, name, description, sphere, cost_centre, quantity, unit, unit_price, tax, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            position.name,
            position.description,
            position.sphere,
            position.cost_centre,
            position.quantity,
            position.unit,
            position.unit_price,
            position.tax,
            current.user.id,
          ],
          conn,
        )
      }

      if (parsed.source_type === InvoiceSourceType.Upload && multipart.file) {
        await storeAndAttachUploadedFile(multipart.file, 'invoices', 'invoice', invoiceId, current.user.id, conn)
      }

      if (parsed.source_type === InvoiceSourceType.Generated) {
        const association = await getAssociationProfileForInvoice(conn)
        if (!association) return { ok: false, error: 'Association details are required to generate invoices' }

        const company = await getInvoiceCompany(Number(parsed.company_id), conn)
        if (!company) return { ok: false, error: 'Company not found' }

        const logo = await getAssociationLogoForInvoice(conn)
        const boardLine = await getAssociationBoardLineForInvoice(conn)
        const pdfBuffer = buildInvoicePdf({ association, company, invoice: parsed, logo: logo ? {
          mimeType: logo.file.mime_type,
          data: logo.data,
        } : null, boardLine })
        await storeAndAttachUploadedFile({
          filename: `${parsed.invoice_number}.pdf`,
          type: 'application/pdf',
          data: pdfBuffer,
        }, 'invoices', 'invoice', invoiceId, current.user.id, conn)
      }

      return { ok: true, invoiceId }
    })
  } catch (err: any) {
    const error = err as MysqlError
    if (error.code === 'ER_DUP_ENTRY') return { ok: false, error: 'Invoice number already exists' }
    return { ok: false, error: `Failed to create invoice: ${err}` }
  }
})
