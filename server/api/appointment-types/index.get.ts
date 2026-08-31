import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { toAppointmentType } from '~/server/utils/appointments'
import type { AppointmentTypeRow } from '~/types/appointment'

interface GetAppointmentTypesSuccess {
  ok: true
  appointmentTypes: AppointmentTypeRow[]
}

interface GetAppointmentTypesError {
  ok: false
  error: string
}

export type GetAppointmentTypesResponse = GetAppointmentTypesSuccess | GetAppointmentTypesError

export default defineEventHandler(async (event): Promise<GetAppointmentTypesResponse> => {
  const current = await requirePermission(event, 'calendar.view')
  if (!current.ok) return current

  const rows = await query<Array<Record<string, any>>>(
    `SELECT id, name, color, icon, sort_order, is_active, description
     FROM appointment_types
     ORDER BY sort_order ASC, name ASC`,
  )

  return { ok: true, appointmentTypes: rows.map(toAppointmentType) }
})
