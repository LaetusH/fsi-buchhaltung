import { describe, expect, it } from 'vitest'
import { getBudgetPeriod } from '~/server/utils/budgets'

describe('getBudgetPeriod', () => {
  // April-September is the summer semester; everything else is booked as winter of the
  // year the period starts in -- including a period that runs across New Year.
  it('classifies April to September as summer', () => {
    expect(getBudgetPeriod('2026-04-01', '2026-09-30')).toEqual({ year: 2026, semester: 'summer' })
  })

  it('classifies October to March as winter of the starting year', () => {
    expect(getBudgetPeriod('2026-10-01', '2027-03-31')).toEqual({ year: 2026, semester: 'winter' })
  })

  it('treats any other month pairing as winter', () => {
    expect(getBudgetPeriod('2026-01-01', '2026-12-31')).toEqual({ year: 2026, semester: 'winter' })
    expect(getBudgetPeriod('2026-04-01', '2026-08-31')).toEqual({ year: 2026, semester: 'winter' })
    expect(getBudgetPeriod('2026-05-01', '2026-09-30')).toEqual({ year: 2026, semester: 'winter' })
  })
})
