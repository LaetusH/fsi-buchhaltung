import type { H3Event } from 'h3'
import { getRouterParam, readMultipartFormData } from 'h3'

export function getNumericRouteParam(
  event: H3Event,
  name = 'id',
): number | null {
  const value = getRouterParam(event, name) ?? event.context.params?.[name]
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function toDbBoolean(value: unknown): 0 | 1 {
  return value ? 1 : 0
}

export async function readMultipart(event: H3Event) {
  const formData = await readMultipartFormData(event)
  if (!formData) return null

  const getField = (name: string) =>
    formData.find(field => field.name === name)?.data?.toString()

  const file = formData.find(field => field.type && field.filename) ?? null

  return {
    formData,
    getField,
    file,
  }
}
