import type { CostCentreRow } from '~/types/costCentre'
import type {
  FinanceAnalysisData,
  FinanceAnalysisInvoiceBreakdownItem,
  FinanceAnalysisInvoiceItem,
  FinanceAnalysisReceiptBreakdownItem,
} from '~/types/financeAnalysis'
import { InvoiceStatus } from '~/types/invoice'
import { ReceiptStatus } from '~/types/receipt'
import {
  createSpreadsheetRow,
  createSpreadsheetWorkbook,
  downloadExcelWorkbook,
  sanitizeFileNamePart,
  type SpreadsheetCell,
  type SpreadsheetWorksheetDefinition,
} from '~/utils/excel/workbook'

interface TranslateFunction {
  (key: string, params?: Record<string, string | number>): string
}

interface FinanceAnalysisReportFormatters {
  formatCurrency: (value: number) => string
  formatDate: (value: string) => string
  formatDateTime: (value: string) => string
}

export type FinanceAnalysisExportGrouping = 'none' | 'costCentres' | 'spheres'
export type FinanceAnalysisInvoiceDateField = 'invoice_date' | 'due_date' | 'service_date'

export interface FinanceAnalysisReportOptions extends FinanceAnalysisReportFormatters {
  t: TranslateFunction
  locale: string
  analysis: FinanceAnalysisData
  comparisonAnalysis: FinanceAnalysisData | null
  startDate: string
  endDate: string
  includeComparison: boolean
  selectedStatuses: ReceiptStatus[]
  selectedInvoiceStatuses: InvoiceStatus[]
  receiptStatusLabels: Record<ReceiptStatus, string>
  invoiceDateField: FinanceAnalysisInvoiceDateField
  selectedCostCentre: CostCentreRow | null
  exportGrouping: FinanceAnalysisExportGrouping
  exportSplitByMonth: boolean
  exportSplitByPaymentStatus: boolean
}

interface ReceiptOverviewAggregate {
  groupLabel: string
  monthKey: string
  status: ReceiptStatus | ''
  receiptCount: number
  totalAmount: number
}

interface InvoiceOverviewAggregate {
  groupLabel: string
  monthKey: string
  status: InvoiceStatus | ''
  invoiceCount: number
  totalAmount: number
}

const receiptStatusOrder: ReceiptStatus[] = [
  ReceiptStatus.Draft,
  ReceiptStatus.Open,
  ReceiptStatus.Paid,
  ReceiptStatus.Cancelled,
]

const invoiceStatusOrder: InvoiceStatus[] = [
  InvoiceStatus.Draft,
  InvoiceStatus.Open,
  InvoiceStatus.Paid,
  InvoiceStatus.Cancelled,
]

function exportFileName(startDate: string, endDate: string, selectedCostCentre: CostCentreRow | null) {
  const parts = ['finance-analysis', startDate, endDate]
  if (selectedCostCentre?.code) parts.push(sanitizeFileNamePart(selectedCostCentre.code))
  return `${parts.filter(Boolean).join('_')}.xlsx`
}

function currencyCell(value: number, styleId = 'CurrencyCell', mergeAcross = 0): SpreadsheetCell {
  return { value, styleId, type: 'Number', mergeAcross }
}

function countCell(value: number, styleId = 'CountCell', mergeAcross = 0): SpreadsheetCell {
  return { value, styleId, type: 'Number', mergeAcross }
}

function signedCurrencyStyle(value: number) {
  if (value > 0) return 'PositiveCurrencyCell'
  if (value < 0) return 'NegativeCurrencyCell'
  return 'CurrencyCell'
}

function signedCountStyle(value: number) {
  if (value > 0) return 'PositiveCountCell'
  if (value < 0) return 'NegativeCountCell'
  return 'CountCell'
}

function hasReceiptOverviewExport(options: FinanceAnalysisReportOptions) {
  return options.exportGrouping !== 'none' || options.exportSplitByMonth || options.exportSplitByPaymentStatus
}

function exportGroupingLabel(options: FinanceAnalysisReportOptions) {
  switch (options.exportGrouping) {
    case 'costCentres':
      return options.t('financeAnalysis.exportGroupingCostCentres')
    case 'spheres':
      return options.t('financeAnalysis.exportGroupingSpheres')
    default:
      return options.t('financeAnalysis.exportGroupingNone')
  }
}

function formatMonthKey(monthKey: string, locale: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey

  const [yearString, monthString] = monthKey.split('-')
  const year = Number(yearString)
  const monthIndex = Number(monthString) - 1
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return monthKey

  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(year, monthIndex, 1))
}

function buildOverviewRows(options: FinanceAnalysisReportOptions) {
  const {
    t,
    analysis,
    comparisonAnalysis,
    includeComparison,
    startDate,
    endDate,
    selectedStatuses,
    receiptStatusLabels,
    selectedCostCentre,
    exportSplitByMonth,
    exportSplitByPaymentStatus,
    formatDate,
    formatDateTime,
  } = options

  const summary = analysis.summary
  const hasComparison = includeComparison && Boolean(comparisonAnalysis)
  const hasExportOverview = hasReceiptOverviewExport(options)
  const rowMergeAcross = 3
  const valueMergeAcross = 2
  const singleValueMergeAcross = 1
  const orderedSelectedStatuses = receiptStatusOrder.filter(status => selectedStatuses.includes(status))
  const orderedSelectedInvoiceStatuses = invoiceStatusOrder.filter(status => options.selectedInvoiceStatuses.includes(status))
  const receiptStateRows = [
    { status: ReceiptStatus.Draft, label: receiptStatusLabels.draft, count: summary.receipt_draft_count, total: summary.receipt_draft_total },
    { status: ReceiptStatus.Open, label: receiptStatusLabels.open, count: summary.receipt_open_count, total: summary.receipt_open_total },
    { status: ReceiptStatus.Paid, label: receiptStatusLabels.paid, count: summary.receipt_paid_count, total: summary.receipt_paid_total },
    { status: ReceiptStatus.Cancelled, label: receiptStatusLabels.cancelled, count: summary.receipt_cancelled_count, total: summary.receipt_cancelled_total },
  ].filter(row => orderedSelectedStatuses.includes(row.status))
  const invoiceStateRows = orderedSelectedInvoiceStatuses
    .map((status) => {
    const invoices = analysis.invoices.filter(invoice => invoice.status === status)
    return {
      label: t(`invoice.states.${status}`),
      count: invoices.length,
      total: Number(invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0).toFixed(2)),
    }
  })

  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.title'), styleId: 'Title', mergeAcross: rowMergeAcross }], 26),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([
      { value: t('financeAnalysis.reportGeneratedAt'), styleId: 'Label' },
      { value: formatDateTime(new Date().toISOString()), styleId: 'Body', mergeAcross: valueMergeAcross },
    ]),
    createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.menuTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
    createSpreadsheetRow([
      { value: t('financeAnalysis.receiptStateFilters'), styleId: 'Label' },
      {
        value: orderedSelectedStatuses.map(status => receiptStatusLabels[status]).join(', ') || t('financeAnalysis.noneSelected'),
        styleId: 'Body',
        mergeAcross: valueMergeAcross,
      },
    ]),
    createSpreadsheetRow([
      { value: t('financeAnalysis.invoiceStateFilters'), styleId: 'Label' },
      {
        value: orderedSelectedInvoiceStatuses.map(status => t(`invoice.states.${status}`)).join(', ') || t('financeAnalysis.noneSelected'),
        styleId: 'Body',
        mergeAcross: valueMergeAcross,
      },
    ]),
  ]

  if (selectedCostCentre) {
    rows.push(createSpreadsheetRow([
      { value: t('financeAnalysis.costCentre'), styleId: 'Label' },
      { value: `${selectedCostCentre.code} - ${selectedCostCentre.name}`, styleId: 'Body', mergeAcross: valueMergeAcross },
    ]))
  }

  if (hasComparison && comparisonAnalysis) {
    rows.push(createSpreadsheetRow([
      { value: t('financeAnalysis.compareWithPreviousYear'), styleId: 'Label' },
      {
        value: t('financeAnalysis.previousYearRange', { start: formatDate(comparisonAnalysis.summary.start_date), end: formatDate(comparisonAnalysis.summary.end_date) }),
        styleId: 'Body',
        mergeAcross: valueMergeAcross,
      },
    ]))
  }

  if (hasExportOverview) {
    rows.push(
      createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
      createSpreadsheetRow([{ value: t('financeAnalysis.exportOptionsTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
      createSpreadsheetRow([
        { value: t('financeAnalysis.exportGroupingLabel'), styleId: 'Label' },
        { value: exportGroupingLabel(options), styleId: 'Body', mergeAcross: valueMergeAcross },
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.exportSplitByMonth'), styleId: 'Label' },
        { value: exportSplitByMonth ? t('common.yes') : t('common.no'), styleId: 'Body', mergeAcross: valueMergeAcross },
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.exportSplitByPaymentStatus'), styleId: 'Label' },
        { value: exportSplitByPaymentStatus ? t('common.yes') : t('common.no'), styleId: 'Body', mergeAcross: valueMergeAcross },
      ]),
    )
  }

  rows.push(
    createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.analysisTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
  )

  if (hasComparison && comparisonAnalysis) {
    const receiptDifference = Number((summary.receipt_total - comparisonAnalysis.summary.receipt_total).toFixed(2))
    const cashDifference = Number((summary.cash_count_total_difference - comparisonAnalysis.summary.cash_count_total_difference).toFixed(2))
    const invoiceDifference = Number((summary.invoice_total - comparisonAnalysis.summary.invoice_total).toFixed(2))
    const netDifference = Number((summary.net_result - comparisonAnalysis.summary.net_result).toFixed(2))
    const entryDifference = (summary.receipt_count + summary.cash_count_count + summary.invoice_count) - (comparisonAnalysis.summary.receipt_count + comparisonAnalysis.summary.cash_count_count + comparisonAnalysis.summary.invoice_count)

    rows.push(createSpreadsheetRow([
      { value: '', styleId: 'Header' },
      { value: t('financeAnalysis.currentValue'), styleId: 'Header' },
      { value: t('financeAnalysis.previousValue'), styleId: 'Header' },
      { value: t('financeAnalysis.differenceHeader'), styleId: 'Header' },
    ]))

    rows.push(
      createSpreadsheetRow([
        { value: t('financeAnalysis.cards.receiptTotal'), styleId: 'TextCell' },
        currencyCell(summary.receipt_total),
        currencyCell(comparisonAnalysis.summary.receipt_total),
        currencyCell(receiptDifference, signedCurrencyStyle(receiptDifference)),
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.cards.cashCountRevenue'), styleId: 'TextCell' },
        currencyCell(summary.cash_count_total_difference),
        currencyCell(comparisonAnalysis.summary.cash_count_total_difference),
        currencyCell(cashDifference, signedCurrencyStyle(cashDifference)),
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.cards.invoiceRevenue'), styleId: 'TextCell' },
        currencyCell(summary.invoice_total),
        currencyCell(comparisonAnalysis.summary.invoice_total),
        currencyCell(invoiceDifference, signedCurrencyStyle(invoiceDifference)),
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.cards.netResult'), styleId: 'TextCell' },
        currencyCell(summary.net_result, signedCurrencyStyle(summary.net_result)),
        currencyCell(comparisonAnalysis.summary.net_result, signedCurrencyStyle(comparisonAnalysis.summary.net_result)),
        currencyCell(netDifference, signedCurrencyStyle(netDifference)),
      ]),
      createSpreadsheetRow([
        { value: t('financeAnalysis.cards.entriesReviewed'), styleId: 'TextCell' },
        countCell(summary.receipt_count + summary.cash_count_count + summary.invoice_count),
        countCell(comparisonAnalysis.summary.receipt_count + comparisonAnalysis.summary.cash_count_count + comparisonAnalysis.summary.invoice_count),
        countCell(entryDifference, signedCountStyle(entryDifference)),
      ]),
    )
  } else {
    rows.push(
      createSpreadsheetRow([{ value: t('financeAnalysis.cards.receiptTotal'), styleId: 'TextCell' }, currencyCell(summary.receipt_total, 'CurrencyCell', 1)]),
      createSpreadsheetRow([{ value: t('financeAnalysis.cards.cashCountRevenue'), styleId: 'TextCell' }, currencyCell(summary.cash_count_total_difference, 'CurrencyCell', 1)]),
      createSpreadsheetRow([{ value: t('financeAnalysis.cards.invoiceRevenue'), styleId: 'TextCell' }, currencyCell(summary.invoice_total, 'CurrencyCell', 1)]),
      createSpreadsheetRow([{ value: t('financeAnalysis.cards.netResult'), styleId: 'TextCell' }, currencyCell(summary.net_result, signedCurrencyStyle(summary.net_result), 1)]),
      createSpreadsheetRow([{ value: t('financeAnalysis.cards.entriesReviewed'), styleId: 'TextCell' }, countCell(summary.receipt_count + summary.cash_count_count + summary.invoice_count, 'CountCell', 1)]),
    )
  }

  rows.push(
    createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.receiptsSectionTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
    createSpreadsheetRow([
      { value: t('financeAnalysis.receiptStatusLabel'), styleId: 'Header' },
      { value: t('financeAnalysis.countHeader'), styleId: 'Header' },
      { value: t('financeAnalysis.cards.receiptTotal'), styleId: 'Header' },
    ]),
  )

  rows.push(...receiptStateRows.map(row => createSpreadsheetRow([
    { value: row.label, styleId: 'TextCell' },
    countCell(row.count),
    currencyCell(row.total),
  ])))

  rows.push(
    createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.cashCountsSectionTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
    createSpreadsheetRow([{ value: t('financeAnalysis.cashCards.totalBefore'), styleId: 'TextCell' }, currencyCell(summary.cash_count_total_before, 'CurrencyCell', singleValueMergeAcross)]),
    createSpreadsheetRow([{ value: t('financeAnalysis.cashCards.totalAfter'), styleId: 'TextCell' }, currencyCell(summary.cash_count_total_after, 'CurrencyCell', singleValueMergeAcross)]),
    createSpreadsheetRow([{ value: t('financeAnalysis.cashCards.registers'), styleId: 'TextCell' }, countCell(summary.cash_count_register_total, 'CountCell', singleValueMergeAcross)]),
  )

  rows.push(
    createSpreadsheetRow([{ value: '', styleId: 'Body', mergeAcross: rowMergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.invoicesSectionTitle'), styleId: 'Section', mergeAcross: rowMergeAcross }], 22),
    createSpreadsheetRow([
      { value: t('financeAnalysis.invoiceStatusLabel'), styleId: 'Header' },
      { value: t('financeAnalysis.countHeader'), styleId: 'Header' },
      { value: t('financeAnalysis.cards.invoiceRevenue'), styleId: 'Header' },
    ]),
  )

  rows.push(...invoiceStateRows.map(row => createSpreadsheetRow([
    { value: row.label, styleId: 'TextCell' },
    countCell(row.count),
    currencyCell(row.total),
  ])))

  return rows
}

function buildReceiptRows(options: FinanceAnalysisReportOptions) {
  const { t, analysis, startDate, endDate, formatDate, receiptStatusLabels } = options

  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.receiptsTableTitle'), styleId: 'Title', mergeAcross: 4 }], 24),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross: 4 }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.countLabel', { count: analysis.receipts.length }), styleId: 'BodyMuted', mergeAcross: 4 }]),
    createSpreadsheetRow([
      { value: t('receipt.receiptDate'), styleId: 'Header' },
      { value: t('receipt.receiptNumber'), styleId: 'Header' },
      { value: t('receipt.company'), styleId: 'Header' },
      { value: t('receipt.paymentStatus'), styleId: 'Header' },
      { value: t('receipt.grossAmount'), styleId: 'Header' },
    ]),
  ]

  if (analysis.receipts.length === 0) {
    rows.push(createSpreadsheetRow([{ value: t('financeAnalysis.noReceipts'), styleId: 'Body', mergeAcross: 4 }]))
    return rows
  }

  rows.push(...analysis.receipts.map(receipt => createSpreadsheetRow([
    { value: formatDate(receipt.receipt_date), styleId: 'TextCell' },
    { value: receipt.receipt_number || t('receipt.noNumber'), styleId: 'TextCell' },
    { value: receipt.company_name || t('receipt.noCompany'), styleId: 'TextCell' },
    { value: receiptStatusLabels[receipt.status], styleId: 'TextCell' },
    currencyCell(receipt.total_amount),
  ])))

  return rows
}

function buildCashCountRows(options: FinanceAnalysisReportOptions) {
  const { t, analysis, startDate, endDate, formatDate, formatDateTime } = options

  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.cashCountsTableTitle'), styleId: 'Title', mergeAcross: 7 }], 24),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross: 7 }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.countLabel', { count: analysis.cashCounts.length }), styleId: 'BodyMuted', mergeAcross: 7 }]),
    createSpreadsheetRow([
      { value: t('cashCount.countedAfterAt'), styleId: 'Header' },
      { value: t('cashCount.event'), styleId: 'Header' },
      { value: t('cashCount.countedByFirst'), styleId: 'Header' },
      { value: t('cashCount.countedBySecond'), styleId: 'Header' },
      { value: t('cashCount.checkedBy'), styleId: 'Header' },
      { value: t('cashCount.registerCount'), styleId: 'Header' },
      { value: t('cashCount.totalAfter'), styleId: 'Header' },
      { value: t('cashCount.totalDifference'), styleId: 'Header' },
    ]),
  ]

  if (analysis.cashCounts.length === 0) {
    rows.push(createSpreadsheetRow([{ value: t('financeAnalysis.noCashCounts'), styleId: 'Body', mergeAcross: 7 }]))
    return rows
  }

  rows.push(...analysis.cashCounts.map(cashCount => createSpreadsheetRow([
    { value: formatDateTime(cashCount.counted_after_at), styleId: 'TextCell' },
    { value: cashCount.event_name, styleId: 'TextCell' },
    { value: cashCount.counted_by_first_name || t('common.notAvailable'), styleId: 'TextCell' },
    { value: cashCount.counted_by_second_name || t('common.notAvailable'), styleId: 'TextCell' },
    { value: cashCount.checked_by_name || t('common.notAvailable'), styleId: 'TextCell' },
    countCell(cashCount.register_count),
    currencyCell(cashCount.total_after_amount),
    currencyCell(cashCount.total_difference, signedCurrencyStyle(cashCount.total_difference)),
  ])))

  return rows
}

function buildInvoiceRows(options: FinanceAnalysisReportOptions) {
  const { t, analysis, startDate, endDate, formatDate, invoiceDateField } = options
  const invoiceDateLabelByField: Record<FinanceAnalysisInvoiceDateField, string> = {
    invoice_date: t('financeAnalysis.invoiceDateFieldOptions.invoiceDate'),
    due_date: t('financeAnalysis.invoiceDateFieldOptions.dueDate'),
    service_date: t('financeAnalysis.invoiceDateFieldOptions.serviceDate'),
  }

  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.invoicesTableTitle'), styleId: 'Title', mergeAcross: 4 }], 24),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross: 4 }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.countLabel', { count: analysis.invoices.length }), styleId: 'BodyMuted', mergeAcross: 4 }]),
    createSpreadsheetRow([
      { value: invoiceDateLabelByField[invoiceDateField], styleId: 'Header' },
      { value: t('invoice.invoiceNumber'), styleId: 'Header' },
      { value: t('receipt.company'), styleId: 'Header' },
      { value: t('receipt.paymentStatus'), styleId: 'Header' },
      { value: t('receipt.grossAmount'), styleId: 'Header' },
    ]),
  ]

  if (analysis.invoices.length === 0) {
    rows.push(createSpreadsheetRow([{ value: t('financeAnalysis.noInvoices'), styleId: 'Body', mergeAcross: 4 }]))
    return rows
  }

  rows.push(...analysis.invoices.map(invoice => createSpreadsheetRow([
    { value: formatDate(getInvoiceDateValue(invoice, invoiceDateField) || invoice.invoice_date), styleId: 'TextCell' },
    { value: invoice.invoice_number, styleId: 'TextCell' },
    { value: invoice.company_name || t('receipt.noCompany'), styleId: 'TextCell' },
    { value: t(`invoice.states.${invoice.status}`), styleId: 'TextCell' },
    currencyCell(invoice.total_amount),
  ])))

  return rows
}

function getInvoiceDateValue(invoice: FinanceAnalysisInvoiceItem, invoiceDateField: FinanceAnalysisInvoiceDateField) {
  if (invoiceDateField === 'due_date') return invoice.due_date
  if (invoiceDateField === 'service_date') return invoice.service_date
  return invoice.invoice_date
}

function buildReceiptOverviewAggregates(options: FinanceAnalysisReportOptions) {
  const groups = new Map<string, ReceiptOverviewAggregate>()

  const pushAggregate = (groupLabel: string, monthKey: string, status: ReceiptStatus | '', receiptCount: number, totalAmount: number) => {
    const key = [groupLabel, monthKey, status].join('|')
    const current = groups.get(key)
    if (current) {
      current.receiptCount += receiptCount
      current.totalAmount += totalAmount
      return
    }

    groups.set(key, {
      groupLabel,
      monthKey,
      status,
      receiptCount,
      totalAmount,
    })
  }

  if (options.exportGrouping === 'none') {
    options.analysis.receipts.forEach((receipt) => {
      pushAggregate(
        '',
        options.exportSplitByMonth ? receipt.receipt_date.slice(0, 7) : '',
        options.exportSplitByPaymentStatus ? receipt.status : '',
        1,
        receipt.total_amount,
      )
    })
  } else {
    const targetGroupType: FinanceAnalysisReceiptBreakdownItem['group_type'] = options.exportGrouping === 'costCentres' ? 'costCentre' : 'sphere'

    options.analysis.receiptBreakdown
      .filter(item => item.group_type === targetGroupType)
      .forEach((item) => {
        const groupLabel = [item.group_code, item.group_name].filter(Boolean).join(' - ') || options.t('financeAnalysis.noneSelected')
        pushAggregate(
          groupLabel,
          options.exportSplitByMonth ? item.month_key : '',
          options.exportSplitByPaymentStatus ? item.status : '',
          item.receipt_count,
          item.total_amount,
        )
      })
  }

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      receiptCount: Number(group.receiptCount.toFixed(0)),
      totalAmount: Number(group.totalAmount.toFixed(2)),
    }))
    .sort((left, right) => {
      if (left.groupLabel !== right.groupLabel) return left.groupLabel.localeCompare(right.groupLabel)
      if (left.monthKey !== right.monthKey) return left.monthKey.localeCompare(right.monthKey)
      return receiptStatusOrder.indexOf(left.status as ReceiptStatus) - receiptStatusOrder.indexOf(right.status as ReceiptStatus)
    })
}

function buildReceiptOverviewRows(options: FinanceAnalysisReportOptions) {
  const { t, locale, startDate, endDate, formatDate, receiptStatusLabels } = options
  const groupedRows = buildReceiptOverviewAggregates(options)
  const hasGroupingColumn = options.exportGrouping !== 'none'
  const hasMonthColumn = options.exportSplitByMonth
  const hasStatusColumn = options.exportSplitByPaymentStatus
  const headerCells: SpreadsheetCell[] = []

  if (hasGroupingColumn) {
    headerCells.push({
      value: options.exportGrouping === 'costCentres' ? t('financeAnalysis.exportGroupingCostCentres') : t('financeAnalysis.exportGroupingSpheres'),
      styleId: 'Header',
    })
  }
  if (hasMonthColumn) headerCells.push({ value: t('financeAnalysis.quickMonth'), styleId: 'Header' })
  if (hasStatusColumn) headerCells.push({ value: t('receipt.paymentStatus'), styleId: 'Header' })
  headerCells.push({ value: t('financeAnalysis.countHeader'), styleId: 'Header' })
  headerCells.push({ value: t('financeAnalysis.cards.receiptTotal'), styleId: 'Header' })

  const mergeAcross = Math.max(headerCells.length - 1, 0)
  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.receiptOverviewExportTitle'), styleId: 'Title', mergeAcross }], 24),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.countLabel', { count: groupedRows.length }), styleId: 'BodyMuted', mergeAcross }]),
    createSpreadsheetRow(headerCells),
  ]

  if (groupedRows.length === 0) {
    rows.push(createSpreadsheetRow([{ value: t('financeAnalysis.noReceipts'), styleId: 'Body', mergeAcross }]))
    return rows
  }

  rows.push(...groupedRows.map(group => {
    const cells: SpreadsheetCell[] = []
    if (hasGroupingColumn) cells.push({ value: group.groupLabel, styleId: 'TextCell' })
    if (hasMonthColumn) cells.push({ value: formatMonthKey(group.monthKey, locale), styleId: 'TextCell' })
    if (hasStatusColumn) cells.push({ value: receiptStatusLabels[group.status as ReceiptStatus], styleId: 'TextCell' })
    cells.push(countCell(group.receiptCount))
    cells.push(currencyCell(group.totalAmount))
    return createSpreadsheetRow(cells)
  }))

  return rows
}

function buildInvoiceOverviewAggregates(options: FinanceAnalysisReportOptions) {
  const groups = new Map<string, InvoiceOverviewAggregate>()

  const pushAggregate = (groupLabel: string, monthKey: string, status: InvoiceStatus | '', invoiceCount: number, totalAmount: number) => {
    const key = [groupLabel, monthKey, status].join('|')
    const current = groups.get(key)
    if (current) {
      current.invoiceCount += invoiceCount
      current.totalAmount += totalAmount
      return
    }

    groups.set(key, {
      groupLabel,
      monthKey,
      status,
      invoiceCount,
      totalAmount,
    })
  }

  if (options.exportGrouping === 'none') {
    options.analysis.invoices.forEach((invoice) => {
      const invoiceDate = getInvoiceDateValue(invoice, options.invoiceDateField) || invoice.invoice_date
      pushAggregate(
        '',
        options.exportSplitByMonth ? invoiceDate.slice(0, 7) : '',
        options.exportSplitByPaymentStatus ? invoice.status : '',
        1,
        invoice.total_amount,
      )
    })
  } else {
    const targetGroupType: FinanceAnalysisInvoiceBreakdownItem['group_type'] = options.exportGrouping === 'costCentres' ? 'costCentre' : 'sphere'

    options.analysis.invoiceBreakdown
      .filter(item => item.group_type === targetGroupType)
      .forEach((item) => {
        const groupLabel = [item.group_code, item.group_name].filter(Boolean).join(' - ') || options.t('financeAnalysis.noneSelected')
        pushAggregate(
          groupLabel,
          options.exportSplitByMonth ? item.month_key : '',
          options.exportSplitByPaymentStatus ? item.status : '',
          item.invoice_count,
          item.total_amount,
        )
      })
  }

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      invoiceCount: Number(group.invoiceCount.toFixed(0)),
      totalAmount: Number(group.totalAmount.toFixed(2)),
    }))
    .sort((left, right) => {
      if (left.groupLabel !== right.groupLabel) return left.groupLabel.localeCompare(right.groupLabel)
      if (left.monthKey !== right.monthKey) return left.monthKey.localeCompare(right.monthKey)
      return invoiceStatusOrder.indexOf(left.status as InvoiceStatus) - invoiceStatusOrder.indexOf(right.status as InvoiceStatus)
    })
}

function buildInvoiceOverviewRows(options: FinanceAnalysisReportOptions) {
  const { t, locale, startDate, endDate, formatDate } = options
  const groupedRows = buildInvoiceOverviewAggregates(options)
  const hasGroupingColumn = options.exportGrouping !== 'none'
  const hasMonthColumn = options.exportSplitByMonth
  const hasStatusColumn = options.exportSplitByPaymentStatus
  const headerCells: SpreadsheetCell[] = []

  if (hasGroupingColumn) {
    headerCells.push({
      value: options.exportGrouping === 'costCentres' ? t('financeAnalysis.exportGroupingCostCentres') : t('financeAnalysis.exportGroupingSpheres'),
      styleId: 'Header',
    })
  }
  if (hasMonthColumn) headerCells.push({ value: t('financeAnalysis.quickMonth'), styleId: 'Header' })
  if (hasStatusColumn) headerCells.push({ value: t('receipt.paymentStatus'), styleId: 'Header' })
  headerCells.push({ value: t('financeAnalysis.countHeader'), styleId: 'Header' })
  headerCells.push({ value: t('financeAnalysis.cards.invoiceRevenue'), styleId: 'Header' })

  const mergeAcross = Math.max(headerCells.length - 1, 0)
  const rows = [
    createSpreadsheetRow([{ value: t('financeAnalysis.invoiceOverviewExportTitle'), styleId: 'Title', mergeAcross }], 24),
    createSpreadsheetRow([{ value: t('financeAnalysis.periodLabel', { start: formatDate(startDate), end: formatDate(endDate) }), styleId: 'Subtitle', mergeAcross }]),
    createSpreadsheetRow([{ value: t('financeAnalysis.countLabel', { count: groupedRows.length }), styleId: 'BodyMuted', mergeAcross }]),
    createSpreadsheetRow(headerCells),
  ]

  if (groupedRows.length === 0) {
    rows.push(createSpreadsheetRow([{ value: t('financeAnalysis.noInvoices'), styleId: 'Body', mergeAcross }]))
    return rows
  }

  rows.push(...groupedRows.map(group => {
    const cells: SpreadsheetCell[] = []
    if (hasGroupingColumn) cells.push({ value: group.groupLabel, styleId: 'TextCell' })
    if (hasMonthColumn) cells.push({ value: formatMonthKey(group.monthKey, locale), styleId: 'TextCell' })
    if (hasStatusColumn) cells.push({ value: t(`invoice.states.${group.status}`), styleId: 'TextCell' })
    cells.push(countCell(group.invoiceCount))
    cells.push(currencyCell(group.totalAmount))
    return createSpreadsheetRow(cells)
  }))

  return rows
}

function buildReceiptOverviewColumnWidths(options: FinanceAnalysisReportOptions) {
  const widths: number[] = []
  if (options.exportGrouping !== 'none') widths.push(210)
  if (options.exportSplitByMonth) widths.push(120)
  if (options.exportSplitByPaymentStatus) widths.push(120)
  widths.push(85, 120)
  return widths
}

function scaleColumnWidthsToTotal(widths: number[], targetTotal: number) {
  if (widths.length === 0) return []

  const currentTotal = widths.reduce((sum, width) => sum + width, 0)
  if (currentTotal === targetTotal) return [...widths]

  const scale = targetTotal / currentTotal
  const scaledWidths = widths.map(width => Math.max(40, Math.round(width * scale)))
  const difference = targetTotal - scaledWidths.reduce((sum, width) => sum + width, 0)
  const lastIndex = scaledWidths.length - 1
  scaledWidths[lastIndex] = (scaledWidths[lastIndex] || 0) + difference

  return scaledWidths
}

function buildWorkbook(options: FinanceAnalysisReportOptions) {
  const overviewColumnWidths = [190, 95, 120, 120]
  const overviewSheetTargetWidth = 780
  const receiptColumnWidths = [95, 160, 190, 95, 85]
  const cashCountColumnWidths = [120, 170, 110, 110, 110, 70, 90, 90]
  const invoiceColumnWidths = [95, 150, 220, 100, 95]
  const receiptOverviewColumnWidths = buildReceiptOverviewColumnWidths(options)
  const detailSheetTargetWidth = 1100
  const detailSheetWidth = Math.max(
    detailSheetTargetWidth,
    receiptColumnWidths.reduce((sum, width) => sum + width, 0),
    cashCountColumnWidths.reduce((sum, width) => sum + width, 0),
    invoiceColumnWidths.reduce((sum, width) => sum + width, 0),
    receiptOverviewColumnWidths.reduce((sum, width) => sum + width, 0),
  )

  const sheets: SpreadsheetWorksheetDefinition[] = [
    {
      name: options.t('financeAnalysis.analysisTitle'),
      columnWidths: scaleColumnWidthsToTotal(overviewColumnWidths, overviewSheetTargetWidth),
      rows: buildOverviewRows(options),
      orientation: 'portrait',
    },
  ]

  if (hasReceiptOverviewExport(options)) {
    sheets.push({
      name: options.t('financeAnalysis.receiptOverviewExportTitle'),
      columnWidths: scaleColumnWidthsToTotal(receiptOverviewColumnWidths, detailSheetWidth),
      rows: buildReceiptOverviewRows(options),
      orientation: 'landscape',
    })
    sheets.push({
      name: options.t('financeAnalysis.invoiceOverviewExportTitle'),
      columnWidths: scaleColumnWidthsToTotal(receiptOverviewColumnWidths, detailSheetWidth),
      rows: buildInvoiceOverviewRows(options),
      orientation: 'landscape',
    })
  }

  sheets.push(
    {
      name: options.t('financeAnalysis.receiptsTableTitle'),
      columnWidths: scaleColumnWidthsToTotal(receiptColumnWidths, detailSheetWidth),
      rows: buildReceiptRows(options),
      orientation: 'landscape',
    },
    {
      name: options.t('financeAnalysis.cashCountsTableTitle'),
      columnWidths: scaleColumnWidthsToTotal(cashCountColumnWidths, detailSheetWidth),
      rows: buildCashCountRows(options),
      orientation: 'landscape',
    },
    {
      name: options.t('financeAnalysis.invoicesTableTitle'),
      columnWidths: scaleColumnWidthsToTotal(invoiceColumnWidths, detailSheetWidth),
      rows: buildInvoiceRows(options),
      orientation: 'landscape',
    },
  )

  return createSpreadsheetWorkbook({
    sheets,
  })
}

export function downloadFinanceAnalysisReport(options: FinanceAnalysisReportOptions) {
  const workbook = buildWorkbook(options)
  downloadExcelWorkbook(workbook, exportFileName(options.startDate, options.endDate, options.selectedCostCentre))
}
