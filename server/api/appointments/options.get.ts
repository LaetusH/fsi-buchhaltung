import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/api/guards'
import { toAppointmentType } from '~/server/utils/appointments'
import type { AppointmentTypeRow } from '~/types/appointment'

export interface AppointmentMemberOption {
  id: number
  full_name: string
}

export interface AppointmentSubdivisionOption {
  id: number
  code: string
  name: string
  is_active: boolean
}

interface GetAppointmentOptionsSuccess {
  ok: true
  members: AppointmentMemberOption[]
  subdivisions: AppointmentSubdivisionOption[]
  appointmentTypes: AppointmentTypeRow[]
}

interface GetAppointmentOptionsError {
  ok: false
  error: string
}

export type GetAppointmentOptionsResponse = GetAppointmentOptionsSuccess | GetAppointmentOptionsError

export default defineEventHandler(async (event): Promise<GetAppointmentOptionsResponse> => {
  const current = await requirePermission(event, 'calendar.create')
  if (!current.ok) return current

  const [members, subdivisions, types] = await Promise.all([
    query<Array<Record<string, any>>>(
      `SELECT id, TRIM(CONCAT(first_name, ' ', last_name)) AS full_name
       FROM members
       WHERE status != 'left'
       ORDER BY last_name ASC, first_name ASC`,
    ),
    query<Array<Record<string, any>>>(
      `SELECT id, code, name, is_active
       FROM subdivisions
       ORDER BY is_active DESC, code ASC, name ASC`,
    ),
    query<Array<Record<string, any>>>(
      `SELECT id, name, color, icon, sort_order, is_active, description
       FROM appointment_types
       ORDER BY sort_order ASC, name ASC`,
    ),
  ])

  return {
    ok: true,
    members: members.map(row => ({ id: Number(row.id), full_name: String(row.full_name) })),
    subdivisions: subdivisions.map(row => ({
      id: Number(row.id),
      code: String(row.code),
      name: String(row.name),
      is_active: Boolean(row.is_active),
    })),
    appointmentTypes: types.map(toAppointmentType),
  }
})
