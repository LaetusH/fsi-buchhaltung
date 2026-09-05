import { afterEach, describe, expect, it } from 'vitest'
import { assertTestDatabase } from '../setup/guard'

describe('assertTestDatabase', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env.DB_HOST = original.DB_HOST
    process.env.DB_PORT = original.DB_PORT
    process.env.DB_USER = original.DB_USER
    process.env.DB_NAME = original.DB_NAME
  })

  it('accepts the configured test target', () => {
    expect(assertTestDatabase()).toMatchObject({ database: expect.stringMatching(/_test$/) })
  })

  it('rejects a database whose name is not suffixed _test', () => {
    process.env.DB_NAME = 'fsi_buchhaltung'
    expect(() => assertTestDatabase()).toThrow(/must end in "_test"/)
  })

  it('rejects the development port', () => {
    process.env.DB_PORT = '3308'
    expect(() => assertTestDatabase()).toThrow(/DB_PORT must be 3309/)
  })

  it('rejects a deployment database host', () => {
    process.env.DB_HOST = 'buchhaltung-db'
    expect(() => assertTestDatabase()).toThrow(/non-test host/)
  })

  it('rejects an empty host', () => {
    process.env.DB_HOST = ''
    expect(() => assertTestDatabase()).toThrow(/DB_HOST is empty/)
  })

  it('reports every problem at once', () => {
    process.env.DB_NAME = 'fsi_buchhaltung'
    process.env.DB_PORT = '3306'
    expect(() => assertTestDatabase()).toThrow(/_test[\s\S]*DB_PORT/)
  })
})
