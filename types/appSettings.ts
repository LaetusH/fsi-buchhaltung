export interface InvoiceTextSettings {
  invoice_number_template: string
  invoice_number_next_increment: number
  invoice_number_increment_digits: number
  invoice_number_manual_edit_disabled: boolean
  subject: string
  intro_text: string
  notes: string
  is_kleinunternehmer_default: boolean
}

export interface InvoiceTextVariable {
  key: string
  label: string
}
