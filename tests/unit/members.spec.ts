import { describe, expect, it } from 'vitest'
import { isMemberStatus, parseMemberStatus, validateMemberPayload } from '~/server/utils/members'
import { MemberStatus, type SaveMemberBody } from '~/types/member'

function validMember(overrides: Record<string, any> = {}): SaveMemberBody {
  return {
    first_name: 'Anna',
    last_name: 'Muster',
    birthdate: '2000-01-01',
    street: 'Teststr.',
    street_number: '1',
    postal_code: '12345',
    city: 'Teststadt',
    phone: '0123',
    email: 'anna@test.invalid',
    status: MemberStatus.Active,
    applied_at: '2024-01-01',
    joined_at: '2024-02-01',
    subject_name: 'Informatik',
    left_at: null,
    ...overrides,
  } as SaveMemberBody
}

describe('isMemberStatus', () => {
  it('recognises every member status', () => {
    for (const status of Object.values(MemberStatus)) {
      expect(isMemberStatus(status)).toBe(true)
    }
  })

  it.each([['archived'], [''], [null], [undefined], [1]])('rejects %s', (value) => {
    expect(isMemberStatus(value)).toBe(false)
  })
})

describe('parseMemberStatus', () => {
  it('passes a known status through', () => {
    expect(parseMemberStatus(MemberStatus.Passive)).toBe(MemberStatus.Passive)
  })

  it('falls back to active for anything unknown', () => {
    expect(parseMemberStatus('archived')).toBe(MemberStatus.Active)
    expect(parseMemberStatus(undefined)).toBe(MemberStatus.Active)
  })
})

describe('validateMemberPayload', () => {
  it('accepts a complete payload', () => {
    expect(validateMemberPayload(validMember())).toBeNull()
  })

  it.each([
    'first_name',
    'last_name',
    'birthdate',
    'street',
    'street_number',
    'postal_code',
    'city',
    'phone',
    'email',
    'applied_at',
    'joined_at',
  ])('rejects a payload without %s', (field) => {
    expect(validateMemberPayload(validMember({ [field]: '' }))).toBe('Missing fields')
  })

  it('rejects a whitespace-only subject', () => {
    expect(validateMemberPayload(validMember({ subject_name: '   ' }))).toBe('Missing fields')
  })

  it('rejects an unknown status', () => {
    expect(validateMemberPayload(validMember({ status: 'archived' }))).toBe('Invalid status')
  })

  it('requires left_at exactly for the left status', () => {
    expect(validateMemberPayload(validMember({ status: MemberStatus.Left, left_at: null })))
      .toBe('Status left requires left_at')
    expect(validateMemberPayload(validMember({ status: MemberStatus.Active, left_at: '2026-01-01' })))
      .toBe('left_at is only allowed with status left')
    expect(validateMemberPayload(validMember({ status: MemberStatus.Left, left_at: '2026-01-01' })))
      .toBeNull()
  })
})
