interface ActivateSuccess {
  ok: true
}

interface ActivateError {
  ok: false
  error: string
}

export type ActivateResponse = ActivateSuccess | ActivateError

export interface ActivateBody {
  id: number,
  is_active: boolean
}