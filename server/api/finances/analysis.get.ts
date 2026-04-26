import { defineEventHandler, getQuery } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import type {
  FinanceAnalysisCashCountItem,
  FinanceAnalysisBalanceEvent,
  FinanceAnalysisData,
  FinanceAnalysisInvoiceBreakdownItem,
  FinanceAnalysisInvoiceItem,
  FinanceAnalysisReceiptBreakdownItem,
  FinanceAnalysisReceiptItem,
} from '~/types/financeAnalysis'
import { InvoiceStatus } from '~/types/invoice'
import { ReceiptStatus } from '~/types/receipt'

interface FinanceAnalysisSuccess {
  ok: true
  analysis: FinanceAnalysisData
}

interface FinanceAnalysisError {
  ok: false
  error: string
}

type FinanceAnalysisResponse = FinanceAnalysisSuccess | FinanceAnalysisError

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function defaultDateRange() {
  const now = new Date()
  const year = now.getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

function isReceiptStatus(value: unknown): value is ReceiptStatus {
  return Object.values(ReceiptStatus).includes(value as ReceiptStatus)
}

function getRequestedStatuses(value: unknown) {
  if (Array.isArray(value)) return value.filter(isReceiptStatus)
  if (typeof value === 'string') return [value].filter(isReceiptStatus)
  return []
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return Object.values(InvoiceStatus).includes(value as InvoiceStatus)
}

function getRequestedInvoiceStatuses(value: unknown) {
  if (Array.isArray(value)) return value.filter(isInvoiceStatus)
  if (typeof value === 'string') return [value].filter(isInvoiceStatus)
  return []
}

function getInvoiceDateColumn(value: unknown) {
  if (value === 'due_date') return 'i.due_date'
  if (value === 'service_date') return 'i.service_date'
  return 'i.invoice_date'
}

function getReceiptDateExpression(value: unknown) {
  if (value === 'reimbursement_submitted_at') return 'COALESCE(DATE(reimb.submitted_at), r.receipt_date)'
  return 'r.receipt_date'
}

function parsePositiveInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1
}

async function resolveSelectedCostCentreIds(costCentreId: number | null, includeChildCostCentres: boolean) {
  if (!costCentreId) return []
  if (!includeChildCostCentres) return [costCentreId]

  const rows: any[] = await query(`
    SELECT id, parent_id
    FROM cost_centres
  `)

  const childrenByParentId = new Map<number | null, number[]>()
  for (const row of rows) {
    const parentId = row.parent_id === null || row.parent_id === undefined ? null : Number(row.parent_id)
    const current = childrenByParentId.get(parentId) ?? []
    current.push(Number(row.id))
    childrenByParentId.set(parentId, current)
  }

  const selectedIds = new Set<number>()
  const queue = [costCentreId]

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId || selectedIds.has(currentId)) continue
    selectedIds.add(currentId)

    for (const childId of childrenByParentId.get(currentId) ?? []) {
      if (!selectedIds.has(childId)) queue.push(childId)
    }
  }

  return Array.from(selectedIds)
}

async function loadCashCountCostCentreSplits(eventIds: number[]) {
  if (!eventIds.length) return new Map<number, FinanceAnalysisCashCountItem['cost_centres']>()

  const placeholders = eventIds.map(() => '?').join(', ')
  const rows: any[] = await query(
    `
    SELECT
      eccs.event_id,
      eccs.sphere_id,
      s.code AS sphere_code,
      s.name AS sphere_name,
      eccs.cost_centre_id,
      cc.code,
      cc.name,
      eccs.allocation_percentage
    FROM event_cost_centre_splits eccs
    INNER JOIN spheres s ON s.id = eccs.sphere_id
    INNER JOIN cost_centres cc ON cc.id = eccs.cost_centre_id
    WHERE eccs.event_id IN (${placeholders})
    ORDER BY s.code ASC, s.name ASC, cc.code ASC, cc.name ASC
    `,
    eventIds,
  )

  const splitsByEventId = new Map<number, FinanceAnalysisCashCountItem['cost_centres']>()

  for (const row of rows) {
    const eventId = Number(row.event_id)
    const current = splitsByEventId.get(eventId) ?? []
    current.push({
      sphere_id: Number(row.sphere_id),
      sphere_code: String(row.sphere_code || ''),
      sphere_name: String(row.sphere_name || ''),
      cost_centre_id: Number(row.cost_centre_id),
      code: String(row.code || ''),
      name: String(row.name || ''),
      allocation_percentage: Number(row.allocation_percentage || 0),
    })
    splitsByEventId.set(eventId, current)
  }

  return splitsByEventId
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2))
}

async function loadBalanceEvents(
  startDate: string,
  endDate: string,
  selectedCostCentreIds: number[],
) {
  const hasCostCentreFilter = selectedCostCentreIds.length > 0
  const costCentrePlaceholders = selectedCostCentreIds.map(() => '?').join(', ')

  const receiptRows: any[] = await query(
    `
    SELECT
      r.id,
      CASE
        WHEN IFNULL(reimb_info.reimbursement_count, 0) > 0 THEN reimb_info.disbursed_date
        ELSE r.receipt_date
      END AS effective_date,
      r.receipt_number,
      c.name AS company_name,
      IFNULL(SUM(rp.amount), 0) AS total_amount,
      IFNULL(reimb_info.reimbursement_count, 0) AS reimbursement_count
    FROM receipts r
    INNER JOIN receipt_positions rp ON rp.receipt_id = r.id
    LEFT JOIN companies c ON c.id = r.company_id
    LEFT JOIN (
      SELECT
        rlink.receipt_id,
        MAX(DATE(reimb.disbursed_at)) AS disbursed_date,
        COUNT(DISTINCT reimb.id) AS reimbursement_count
      FROM reimbursement_positions rlink
      INNER JOIN reimbursements reimb ON reimb.id = rlink.reimbursement_id
      GROUP BY rlink.receipt_id
    ) reimb_info ON reimb_info.receipt_id = r.id
    WHERE r.status = ?
      ${hasCostCentreFilter ? `AND rp.cost_centre IN (${costCentrePlaceholders})` : ''}
    GROUP BY r.id, r.receipt_date, reimb_info.disbursed_date, r.receipt_number, c.name, reimb_info.reimbursement_count
    HAVING effective_date IS NOT NULL
      AND effective_date <= ?
    ORDER BY effective_date ASC, r.id ASC
    `,
    hasCostCentreFilter
      ? [ReceiptStatus.Paid, ...selectedCostCentreIds, endDate]
      : [ReceiptStatus.Paid, endDate],
  )

  const invoiceRows: any[] = await query(
    `
    SELECT
      i.id,
      i.due_date AS effective_date,
      i.invoice_number,
      c.name AS company_name,
      IFNULL(SUM(ip.quantity * ip.unit_price * (1 + (ip.tax / 100))), 0) AS total_amount
    FROM invoices i
    INNER JOIN invoice_positions ip ON ip.invoice_id = i.id
    LEFT JOIN companies c ON c.id = i.company_id
    WHERE i.status = ?
      AND i.due_date <= ?
      ${hasCostCentreFilter ? `AND ip.cost_centre IN (${costCentrePlaceholders})` : ''}
    GROUP BY i.id, i.due_date, i.invoice_number, c.name
    ORDER BY i.due_date ASC, i.id ASC
    `,
    hasCostCentreFilter
      ? [InvoiceStatus.Paid, endDate, ...selectedCostCentreIds]
      : [InvoiceStatus.Paid, endDate],
  )

  const cashCountRows: any[] = await query(
    `
    SELECT
      cc.id,
      cc.event_id,
      e.name AS event_name,
      DATE(cc.counted_after_at) AS effective_date,
      cc.counted_after_at,
      ccp.register_number,
      ccp.amount_before,
      ccp.amount_after,
      ${hasCostCentreFilter ? 'balance_split.allocation_factor' : '1'} AS allocation_factor
    FROM cash_counts cc
    INNER JOIN events e ON e.id = cc.event_id
    INNER JOIN cash_count_positions ccp ON ccp.cash_count_id = cc.id
    ${hasCostCentreFilter
      ? `INNER JOIN (
          SELECT event_id, LEAST(IFNULL(SUM(allocation_percentage), 0) / 100, 1) AS allocation_factor
          FROM event_cost_centre_splits
          WHERE cost_centre_id IN (${costCentrePlaceholders})
          GROUP BY event_id
        ) balance_split ON balance_split.event_id = cc.event_id`
      : ''}
    WHERE DATE(cc.counted_after_at) <= ?
    ORDER BY cc.counted_after_at ASC, cc.id ASC, ccp.register_number ASC
    `,
    hasCostCentreFilter ? [...selectedCostCentreIds, endDate] : [endDate],
  )

  type RawLedgerEvent =
    | {
      type: 'receipt'
      source_id: number
      date: string
      label: string
      reference: string | null
      amount: number
      isReimbursement: boolean
    }
    | {
      type: 'invoice'
      source_id: number
      date: string
      label: string
      reference: string | null
      amount: number
    }
    | {
      type: 'cashCount'
      source_id: number
      date: string
      label: string
      reference: string | null
      registers: Array<{ registerNumber: number, amountBefore: number, amountAfter: number }>
    }

  const cashCountsById = new Map<number, Extract<RawLedgerEvent, { type: 'cashCount' }>>()
  const firstCountedAtByRegisterNumber = new Map<number, string>()
  for (const row of cashCountRows) {
    const cashCountId = Number(row.id)
    const allocationFactor = Number(row.allocation_factor || 0)
    const registerNumber = Number(row.register_number || 0)
    const countedAt = String(row.effective_date)
    const cashCount = cashCountsById.get(cashCountId) ?? {
      type: 'cashCount' as const,
      source_id: cashCountId,
      date: countedAt,
      label: String(row.event_name || ''),
      reference: String(row.counted_after_at || ''),
      registers: [],
    }

    const firstCountedAt = firstCountedAtByRegisterNumber.get(registerNumber)
    if (!firstCountedAt || countedAt < firstCountedAt) {
      firstCountedAtByRegisterNumber.set(registerNumber, countedAt)
    }

    cashCount.registers.push({
      registerNumber,
      amountBefore: roundCurrency(Number(row.amount_before || 0) * allocationFactor),
      amountAfter: roundCurrency(Number(row.amount_after || 0) * allocationFactor),
    })
    cashCountsById.set(cashCountId, cashCount)
  }

  const rawEvents: RawLedgerEvent[] = [
    ...receiptRows.map(row => ({
      type: 'receipt' as const,
      source_id: Number(row.id),
      date: String(row.effective_date),
      label: row.company_name ? String(row.company_name) : '',
      reference: row.receipt_number ? String(row.receipt_number) : null,
      amount: Number(row.total_amount || 0),
      isReimbursement: Number(row.reimbursement_count || 0) > 0,
    })),
    ...invoiceRows.map(row => ({
      type: 'invoice' as const,
      source_id: Number(row.id),
      date: String(row.effective_date),
      label: row.company_name ? String(row.company_name) : '',
      reference: row.invoice_number ? String(row.invoice_number) : null,
      amount: Number(row.total_amount || 0),
    })),
    ...cashCountsById.values(),
  ].sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date)
    const order = { invoice: 1, receipt: 2, cashCount: 3 }
    if (order[left.type] !== order[right.type]) return order[left.type] - order[right.type]
    return left.source_id - right.source_id
  })

  function cashCountAmountBefore(rawEvent: Extract<RawLedgerEvent, { type: 'cashCount' }>) {
    return roundCurrency(rawEvent.registers.reduce((sum, register) => sum + register.amountBefore, 0))
  }

  function cashCountAmountAfter(rawEvent: Extract<RawLedgerEvent, { type: 'cashCount' }>) {
    return roundCurrency(rawEvent.registers.reduce((sum, register) => sum + register.amountAfter, 0))
  }

  function transactionDelta(rawEvent: RawLedgerEvent) {
    if (rawEvent.type === 'invoice') return roundCurrency(rawEvent.amount)
    if (rawEvent.type === 'receipt') return roundCurrency(-rawEvent.amount)
    return 0
  }

  const firstCashCountIndex = rawEvents.findIndex(event => event.type === 'cashCount')
  const firstCashCount = firstCashCountIndex >= 0
    ? rawEvents[firstCashCountIndex] as Extract<RawLedgerEvent, { type: 'cashCount' }>
    : null
  const firstCashCountAmountBefore = firstCashCount ? cashCountAmountBefore(firstCashCount) : 0
  const movementBeforeFirstCashCount = firstCashCountIndex >= 0
    ? rawEvents.slice(0, firstCashCountIndex).reduce((sum, event) => roundCurrency(sum + transactionDelta(event)), 0)
    : 0

  let runningBalance = firstCashCount
    ? roundCurrency(firstCashCountAmountBefore - movementBeforeFirstCashCount)
    : 0
  let openingBalanceNote: FinanceAnalysisBalanceEvent['note'] = null

  const latestCashCountBeforeStartIndex = rawEvents.reduce((latestIndex, event, index) => {
    if (event.type !== 'cashCount' || event.date >= startDate) return latestIndex
    return index
  }, -1)

  const applyRawEvent = (rawEvent: RawLedgerEvent, isFirstCashCount: boolean): Omit<FinanceAnalysisBalanceEvent, 'id'> => {
    if (rawEvent.type === 'invoice') {
      const delta = roundCurrency(rawEvent.amount)
      runningBalance = roundCurrency(runningBalance + delta)
      return {
        type: 'invoice',
        source_id: rawEvent.source_id,
        date: rawEvent.date,
        label: rawEvent.label,
        reference: rawEvent.reference,
        delta_amount: delta,
        balance_amount: runningBalance,
        cash_before_amount: null,
        cash_after_amount: null,
        discrepancy_amount: null,
        has_discrepancy: false,
        note: null,
      }
    }

    if (rawEvent.type === 'receipt') {
      const delta = roundCurrency(-rawEvent.amount)
      runningBalance = roundCurrency(runningBalance + delta)
      return {
        type: 'receipt',
        source_id: rawEvent.source_id,
        date: rawEvent.date,
        label: rawEvent.label,
        reference: rawEvent.reference,
        delta_amount: delta,
        balance_amount: runningBalance,
        cash_before_amount: null,
        cash_after_amount: null,
        discrepancy_amount: null,
        has_discrepancy: false,
        note: rawEvent.isReimbursement ? 'reimbursement' : null,
      }
    }

    const cashBeforeAmount = cashCountAmountBefore(rawEvent)
    const cashAfterAmount = cashCountAmountAfter(rawEvent)
    const cashCountSaldo = roundCurrency(cashAfterAmount - cashBeforeAmount)
    const balanceBeforeCashCount = runningBalance
    const calculatedBalance = isFirstCashCount
      ? cashAfterAmount
      : roundCurrency(balanceBeforeCashCount + cashCountSaldo)
    const discrepancy = isFirstCashCount
      ? 0
      : roundCurrency(cashAfterAmount - calculatedBalance)
    const hasInitialRegister = rawEvent.registers.some(register => (
      firstCountedAtByRegisterNumber.get(register.registerNumber) === rawEvent.date
    ))

    runningBalance = cashAfterAmount
    return {
      type: 'cashCount',
      source_id: rawEvent.source_id,
      date: rawEvent.date,
      label: rawEvent.label,
      reference: rawEvent.reference,
      delta_amount: isFirstCashCount ? 0 : cashCountSaldo,
      balance_amount: calculatedBalance,
      cash_before_amount: cashBeforeAmount,
      cash_after_amount: cashAfterAmount,
      discrepancy_amount: isFirstCashCount ? null : discrepancy,
      has_discrepancy: !isFirstCashCount && discrepancy !== 0,
      note: hasInitialRegister ? 'initialCashCount' : null,
    }
  }

  if (latestCashCountBeforeStartIndex >= 0) {
    const latestCashCountBeforeStart = rawEvents[latestCashCountBeforeStartIndex] as Extract<RawLedgerEvent, { type: 'cashCount' }>
    const movementSinceLatestCashCount = rawEvents
      .slice(latestCashCountBeforeStartIndex + 1)
      .filter(event => event.date < startDate)
      .reduce((sum, event) => roundCurrency(sum + transactionDelta(event)), 0)

    runningBalance = roundCurrency(cashCountAmountAfter(latestCashCountBeforeStart) + movementSinceLatestCashCount)
    openingBalanceNote = 'latestCashCountBeforePeriod'
  } else {
    for (const [index, rawEvent] of rawEvents.entries()) {
      if (rawEvent.date >= startDate) break
      applyRawEvent(rawEvent, index === firstCashCountIndex)
    }
  }

  const openingBalance = runningBalance
  const balanceEvents: FinanceAnalysisBalanceEvent[] = [{
    id: 'opening',
    type: 'opening',
    source_id: null,
    date: startDate,
    label: 'openingBalance',
    reference: null,
    delta_amount: 0,
    balance_amount: openingBalance,
    cash_before_amount: null,
    cash_after_amount: null,
    discrepancy_amount: null,
    has_discrepancy: false,
    note: openingBalanceNote,
  }]

  for (const [index, rawEvent] of rawEvents.entries()) {
    if (rawEvent.date < startDate || rawEvent.date > endDate) continue
    const event = applyRawEvent(rawEvent, index === firstCashCountIndex)
    balanceEvents.push({
      ...event,
      id: `${event.type}-${event.source_id}-${balanceEvents.length}`,
    })
  }

  return balanceEvents
}

export default defineEventHandler(async (event): Promise<FinanceAnalysisResponse> => {
  const current = await requirePermission(event, ['receipts.view', 'cash_counts.view', 'invoices.view'], { requireAll: true })
  if (!current.ok) return current

  const queryParams = getQuery(event)
  const fallback = defaultDateRange()
  const startDate = isDateOnly(queryParams.startDate) ? queryParams.startDate : fallback.start
  const endDate = isDateOnly(queryParams.endDate) ? queryParams.endDate : fallback.end
  const selectedStatuses = getRequestedStatuses(queryParams.statuses)
  const selectedInvoiceStatuses = getRequestedInvoiceStatuses(queryParams.invoiceStatuses)
  const receiptDateExpression = getReceiptDateExpression(queryParams.receiptDateField)
  const invoiceDateColumn = getInvoiceDateColumn(queryParams.invoiceDateField)
  const costCentreId = parsePositiveInteger(queryParams.costCentreId)
  const includeChildCostCentres = parseBoolean(queryParams.includeChildCostCentres)

  if (startDate > endDate) {
    return { ok: false, error: 'The start date must be before or equal to the end date.' }
  }

  try {
    const selectedCostCentreIds = await resolveSelectedCostCentreIds(costCentreId, includeChildCostCentres)
    const costCentrePlaceholders = selectedCostCentreIds.map(() => '?').join(', ')
    const hasCostCentreFilter = selectedCostCentreIds.length > 0
    const statusPlaceholders = selectedStatuses.map(() => '?').join(', ')
    const receiptFilterParams = hasCostCentreFilter
      ? [startDate, endDate, ...selectedStatuses, ...selectedCostCentreIds]
      : [startDate, endDate, ...selectedStatuses]

    const receiptRows: any[] = selectedStatuses.length
      ? await query(
          `
          SELECT
            r.id,
            r.receipt_date,
            MAX(DATE(reimb.submitted_at)) AS reimbursement_submitted_at,
            r.receipt_number,
            r.status,
            c.name AS company_name,
            IFNULL(SUM(rp.amount), 0) AS total_amount
          FROM receipts r
          LEFT JOIN companies c ON c.id = r.company_id
          LEFT JOIN receipt_positions rp ON rp.receipt_id = r.id
          LEFT JOIN reimbursement_positions rlink ON rlink.receipt_id = r.id
          LEFT JOIN reimbursements reimb ON reimb.id = rlink.reimbursement_id
          WHERE ${receiptDateExpression} BETWEEN ? AND ?
            AND r.status IN (${statusPlaceholders})
            ${hasCostCentreFilter ? `AND rp.cost_centre IN (${costCentrePlaceholders})` : ''}
          GROUP BY r.id
          ORDER BY ${receiptDateExpression} DESC, r.id DESC
          `,
          receiptFilterParams,
        )
      : []


    const receiptBreakdownRows: any[] = selectedStatuses.length
      ? await query(
          `
          SELECT *
          FROM (
            SELECT
              'costCentre' AS group_type,
              cc.id AS group_id,
              cc.code AS group_code,
              cc.name AS group_name,
              DATE_FORMAT(${receiptDateExpression}, '%Y-%m') AS month_key,
              r.status,
              COUNT(DISTINCT r.id) AS receipt_count,
              IFNULL(SUM(rp.amount), 0) AS total_amount
            FROM receipts r
            INNER JOIN receipt_positions rp ON rp.receipt_id = r.id
            INNER JOIN cost_centres cc ON cc.id = rp.cost_centre
            LEFT JOIN reimbursement_positions rlink ON rlink.receipt_id = r.id
            LEFT JOIN reimbursements reimb ON reimb.id = rlink.reimbursement_id
            WHERE ${receiptDateExpression} BETWEEN ? AND ?
              AND r.status IN (${statusPlaceholders})
              ${hasCostCentreFilter ? `AND rp.cost_centre IN (${costCentrePlaceholders})` : ''}
            GROUP BY cc.id, cc.code, cc.name, month_key, r.status

            UNION ALL

            SELECT
              'sphere' AS group_type,
              s.id AS group_id,
              s.code AS group_code,
              s.name AS group_name,
              DATE_FORMAT(${receiptDateExpression}, '%Y-%m') AS month_key,
              r.status,
              COUNT(DISTINCT r.id) AS receipt_count,
              IFNULL(SUM(rp.amount), 0) AS total_amount
            FROM receipts r
            INNER JOIN receipt_positions rp ON rp.receipt_id = r.id
            INNER JOIN spheres s ON s.id = rp.sphere
            LEFT JOIN reimbursement_positions rlink ON rlink.receipt_id = r.id
            LEFT JOIN reimbursements reimb ON reimb.id = rlink.reimbursement_id
            WHERE ${receiptDateExpression} BETWEEN ? AND ?
              AND r.status IN (${statusPlaceholders})
              ${hasCostCentreFilter ? `AND rp.cost_centre IN (${costCentrePlaceholders})` : ''}
            GROUP BY s.id, s.code, s.name, month_key, r.status
          ) breakdown
          ORDER BY breakdown.group_type, breakdown.group_code, breakdown.group_name, breakdown.month_key, breakdown.status
          `,
          [...receiptFilterParams, ...receiptFilterParams],
        )
      : []

    const cashCountRows: any[] = await query(
          `
          SELECT
            cc.id,
            cc.event_id,
            e.name AS event_name,
            cc.counted_before_at,
            cc.counted_after_at,
            CONCAT(m1.first_name, ' ', m1.last_name) AS counted_by_first_name,
            CONCAT(m2.first_name, ' ', m2.last_name) AS counted_by_second_name,
            CONCAT(m3.first_name, ' ', m3.last_name) AS checked_by_name,
            COUNT(DISTINCT ccp.id) AS register_count,
            IFNULL(SUM(ccp.amount_before), 0) AS total_before_amount,
            IFNULL(SUM(ccp.amount_after), 0) AS total_after_amount,
            IFNULL(SUM(ccp.amount_after - ccp.amount_before), 0) AS total_difference
          FROM cash_counts cc
          INNER JOIN events e ON e.id = cc.event_id
          ${hasCostCentreFilter ? `INNER JOIN event_cost_centre_splits eccs_filter ON eccs_filter.event_id = e.id AND eccs_filter.cost_centre_id IN (${costCentrePlaceholders})` : ''}
          LEFT JOIN members m1 ON m1.id = cc.counted_by_first
          LEFT JOIN members m2 ON m2.id = cc.counted_by_second
          LEFT JOIN members m3 ON m3.id = cc.checked_by
          LEFT JOIN cash_count_positions ccp ON ccp.cash_count_id = cc.id
          WHERE DATE(cc.counted_after_at) BETWEEN ? AND ?
          GROUP BY cc.id
          ORDER BY cc.counted_after_at DESC, cc.id DESC
          `,
          hasCostCentreFilter ? [...selectedCostCentreIds, startDate, endDate] : [startDate, endDate],
        )

    const cashCountRegisterSummaryRows: any[] = await query(
          `
          SELECT
            COUNT(DISTINCT ccp.register_number) AS register_total
          FROM cash_counts cc
          INNER JOIN events e ON e.id = cc.event_id
          ${hasCostCentreFilter ? `INNER JOIN event_cost_centre_splits eccs_filter ON eccs_filter.event_id = e.id AND eccs_filter.cost_centre_id IN (${costCentrePlaceholders})` : ''}
          LEFT JOIN cash_count_positions ccp ON ccp.cash_count_id = cc.id
          WHERE DATE(cc.counted_after_at) BETWEEN ? AND ?
          `,
          hasCostCentreFilter ? [...selectedCostCentreIds, startDate, endDate] : [startDate, endDate],
        )

    const invoiceStatusPlaceholders = selectedInvoiceStatuses.map(() => '?').join(', ')
    const invoiceFilterParams = hasCostCentreFilter
      ? [startDate, endDate, ...selectedInvoiceStatuses, ...selectedCostCentreIds]
      : [startDate, endDate, ...selectedInvoiceStatuses]

    const invoiceRows: any[] = selectedInvoiceStatuses.length === 0
      ? []
      : await query(
          `
          SELECT
            i.id,
            i.invoice_date,
            i.due_date,
            i.service_date,
            i.invoice_number,
            i.status,
            c.name AS company_name,
            IFNULL(SUM(ip.quantity * ip.unit_price * (1 + (ip.tax / 100))), 0) AS total_amount
          FROM invoices i
          LEFT JOIN companies c ON c.id = i.company_id
          LEFT JOIN invoice_positions ip ON ip.invoice_id = i.id
          WHERE ${invoiceDateColumn} BETWEEN ? AND ?
            AND i.status IN (${invoiceStatusPlaceholders})
            ${hasCostCentreFilter ? `AND ip.cost_centre IN (${costCentrePlaceholders})` : ''}
          GROUP BY i.id
          ORDER BY ${invoiceDateColumn} DESC, i.id DESC
          `,
          invoiceFilterParams,
        )

    const invoiceBreakdownRows: any[] = selectedInvoiceStatuses.length === 0
      ? []
      : await query(
          `
          SELECT *
          FROM (
            SELECT
              'costCentre' AS group_type,
              cc.id AS group_id,
              cc.code AS group_code,
              cc.name AS group_name,
              DATE_FORMAT(${invoiceDateColumn}, '%Y-%m') AS month_key,
              i.status,
              COUNT(DISTINCT i.id) AS invoice_count,
              IFNULL(SUM(ip.quantity * ip.unit_price * (1 + (ip.tax / 100))), 0) AS total_amount
            FROM invoices i
            INNER JOIN invoice_positions ip ON ip.invoice_id = i.id
            INNER JOIN cost_centres cc ON cc.id = ip.cost_centre
            WHERE ${invoiceDateColumn} BETWEEN ? AND ?
              AND i.status IN (${invoiceStatusPlaceholders})
              ${hasCostCentreFilter ? `AND ip.cost_centre IN (${costCentrePlaceholders})` : ''}
            GROUP BY cc.id, cc.code, cc.name, month_key, i.status

            UNION ALL

            SELECT
              'sphere' AS group_type,
              s.id AS group_id,
              s.code AS group_code,
              s.name AS group_name,
              DATE_FORMAT(${invoiceDateColumn}, '%Y-%m') AS month_key,
              i.status,
              COUNT(DISTINCT i.id) AS invoice_count,
              IFNULL(SUM(ip.quantity * ip.unit_price * (1 + (ip.tax / 100))), 0) AS total_amount
            FROM invoices i
            INNER JOIN invoice_positions ip ON ip.invoice_id = i.id
            INNER JOIN spheres s ON s.id = ip.sphere
            WHERE ${invoiceDateColumn} BETWEEN ? AND ?
              AND i.status IN (${invoiceStatusPlaceholders})
              ${hasCostCentreFilter ? `AND ip.cost_centre IN (${costCentrePlaceholders})` : ''}
            GROUP BY s.id, s.code, s.name, month_key, i.status
          ) breakdown
          ORDER BY breakdown.group_type, breakdown.group_code, breakdown.group_name, breakdown.month_key, breakdown.status
          `,
          [...invoiceFilterParams, ...invoiceFilterParams],
        )

    const receipts: FinanceAnalysisReceiptItem[] = receiptRows.map(row => ({
      id: Number(row.id),
      receipt_date: String(row.receipt_date),
      reimbursement_submitted_at: row.reimbursement_submitted_at ? String(row.reimbursement_submitted_at) : null,
      receipt_number: row.receipt_number ? String(row.receipt_number) : null,
      company_name: row.company_name ? String(row.company_name) : null,
      status: row.status as ReceiptStatus,
      total_amount: Number(row.total_amount || 0),
    }))

    const receiptBreakdown: FinanceAnalysisReceiptBreakdownItem[] = receiptBreakdownRows.map(row => ({
      group_type: row.group_type === 'sphere' ? 'sphere' : 'costCentre',
      group_id: row.group_id === null || row.group_id === undefined ? null : Number(row.group_id),
      group_code: String(row.group_code || ''),
      group_name: String(row.group_name || ''),
      month_key: String(row.month_key || ''),
      status: row.status as ReceiptStatus,
      receipt_count: Number(row.receipt_count || 0),
      total_amount: Number(row.total_amount || 0),
    }))

    const cashCountCostCentresByEventId = await loadCashCountCostCentreSplits(
      cashCountRows.map(row => Number(row.event_id)),
    )

    const cashCounts: FinanceAnalysisCashCountItem[] = cashCountRows.map(row => ({
      id: Number(row.id),
      event_id: Number(row.event_id),
      event_name: String(row.event_name || ''),
      cost_centres: cashCountCostCentresByEventId.get(Number(row.event_id)) ?? [],
      counted_before_at: String(row.counted_before_at),
      counted_after_at: String(row.counted_after_at),
      counted_by_first_name: String(row.counted_by_first_name || ''),
      counted_by_second_name: String(row.counted_by_second_name || ''),
      checked_by_name: String(row.checked_by_name || ''),
      register_count: Number(row.register_count || 0),
      total_before_amount: Number(row.total_before_amount || 0),
      total_after_amount: Number(row.total_after_amount || 0),
      total_difference: Number(row.total_difference || 0),
    }))

    const cashCountRegisterTotal = Number(cashCountRegisterSummaryRows[0]?.register_total || 0)

    const invoices: FinanceAnalysisInvoiceItem[] = invoiceRows.map(row => ({
      id: Number(row.id),
      invoice_date: String(row.invoice_date),
      due_date: row.due_date ? String(row.due_date) : null,
      service_date: row.service_date ? String(row.service_date) : null,
      invoice_number: String(row.invoice_number || ''),
      company_name: row.company_name ? String(row.company_name) : null,
      status: row.status as InvoiceStatus,
      total_amount: Number(row.total_amount || 0),
    }))

    const invoiceBreakdown: FinanceAnalysisInvoiceBreakdownItem[] = invoiceBreakdownRows.map(row => ({
      group_type: row.group_type === 'sphere' ? 'sphere' : 'costCentre',
      group_id: row.group_id === null || row.group_id === undefined ? null : Number(row.group_id),
      group_code: String(row.group_code || ''),
      group_name: String(row.group_name || ''),
      month_key: String(row.month_key || ''),
      status: row.status as InvoiceStatus,
      invoice_count: Number(row.invoice_count || 0),
      total_amount: Number(row.total_amount || 0),
    }))

    const balanceEvents = await loadBalanceEvents(startDate, endDate, selectedCostCentreIds)

    const receiptSummary = receipts.reduce((summary, receipt) => {
      summary.receipt_total += receipt.total_amount

      switch (receipt.status) {
        case ReceiptStatus.Paid:
          summary.receipt_paid_count += 1
          summary.receipt_paid_total += receipt.total_amount
          break
        case ReceiptStatus.Open:
          summary.receipt_open_count += 1
          summary.receipt_open_total += receipt.total_amount
          break
        case ReceiptStatus.Cancelled:
          summary.receipt_cancelled_count += 1
          summary.receipt_cancelled_total += receipt.total_amount
          break
        case ReceiptStatus.Draft:
        default:
          summary.receipt_draft_count += 1
          summary.receipt_draft_total += receipt.total_amount
          break
      }

      return summary
    }, {
      receipt_total: 0,
      receipt_paid_count: 0,
      receipt_paid_total: 0,
      receipt_open_count: 0,
      receipt_open_total: 0,
      receipt_draft_count: 0,
      receipt_draft_total: 0,
      receipt_cancelled_count: 0,
      receipt_cancelled_total: 0,
    })

    const cashCountSummary = cashCounts.reduce((summary, cashCount) => {
      summary.cash_count_total_before += cashCount.total_before_amount
      summary.cash_count_total_after += cashCount.total_after_amount
      summary.cash_count_total_difference += cashCount.total_difference
      return summary
    }, {
      cash_count_total_before: 0,
      cash_count_total_after: 0,
      cash_count_total_difference: 0,
    })

    const invoiceSummary = invoices.reduce((summary, invoice) => {
      summary.invoice_total += invoice.total_amount
      return summary
    }, {
      invoice_total: 0,
    })

    return {
      ok: true,
      analysis: {
        summary: {
          start_date: startDate,
          end_date: endDate,
          receipt_count: receipts.length,
          receipt_total: Number(receiptSummary.receipt_total.toFixed(2)),
          receipt_paid_count: receiptSummary.receipt_paid_count,
          receipt_paid_total: Number(receiptSummary.receipt_paid_total.toFixed(2)),
          receipt_open_count: receiptSummary.receipt_open_count,
          receipt_open_total: Number(receiptSummary.receipt_open_total.toFixed(2)),
          receipt_draft_count: receiptSummary.receipt_draft_count,
          receipt_draft_total: Number(receiptSummary.receipt_draft_total.toFixed(2)),
          receipt_cancelled_count: receiptSummary.receipt_cancelled_count,
          receipt_cancelled_total: Number(receiptSummary.receipt_cancelled_total.toFixed(2)),
          cash_count_count: cashCounts.length,
          cash_count_register_total: cashCountRegisterTotal,
          cash_count_total_before: Number(cashCountSummary.cash_count_total_before.toFixed(2)),
          cash_count_total_after: Number(cashCountSummary.cash_count_total_after.toFixed(2)),
          cash_count_total_difference: Number(cashCountSummary.cash_count_total_difference.toFixed(2)),
          invoice_count: invoices.length,
          invoice_total: Number(invoiceSummary.invoice_total.toFixed(2)),
          net_result: Number((cashCountSummary.cash_count_total_difference + invoiceSummary.invoice_total - receiptSummary.receipt_total).toFixed(2)),
        },
        receipts,
        receiptBreakdown,
        invoiceBreakdown,
        cashCounts,
        invoices,
        balanceEvents,
      },
    }
  } catch (err: any) {
    return { ok: false, error: `Failed to load finance analysis: ${err}` }
  }
})
