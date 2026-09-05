import { describe, expect, it } from 'vitest'
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_SIZE, validateUploadedFile } from '~/server/utils/files'

// tests/setup/unit-env.ts pins MAX_UPLOAD_MB to 5, so the size limit is deterministic.
describe('validateUploadedFile', () => {
  it('derives the size limit from MAX_UPLOAD_MB', () => {
    expect(MAX_UPLOAD_SIZE).toBe(5 * 1024 * 1024)
  })

  it.each(ALLOWED_UPLOAD_MIME)('accepts %s', (type) => {
    expect(validateUploadedFile({ filename: 'beleg', type, data: Buffer.alloc(10) })).toBeNull()
  })

  it.each([
    ['application/zip'],
    ['text/html'],
    ['image/svg+xml'],
    ['application/octet-stream'],
    [''],
  ])('rejects the type %s', (type) => {
    expect(validateUploadedFile({ filename: 'x', type, data: Buffer.alloc(10) })).toBe('Invalid file type')
  })

  it('rejects a file without a declared type', () => {
    expect(validateUploadedFile({ filename: 'x', data: Buffer.alloc(10) })).toBe('Invalid file type')
  })

  it('rejects a file over the limit but accepts one exactly at it', () => {
    expect(validateUploadedFile({ type: 'application/pdf', data: Buffer.alloc(MAX_UPLOAD_SIZE + 1) }))
      .toBe('File too large')
    expect(validateUploadedFile({ type: 'application/pdf', data: Buffer.alloc(MAX_UPLOAD_SIZE) }))
      .toBeNull()
  })

  // An absent file is only an error where the caller says it is required
  it('treats an absent file as valid unless a required message is given', () => {
    expect(validateUploadedFile(null)).toBeNull()
    expect(validateUploadedFile(null, 'Beleg fehlt')).toBe('Beleg fehlt')
  })
})
