import { describe, expect, it } from 'vitest'
import { getAgreementTextByProgram } from '../src/lib/agreement-texts'

const ROBERT = 'd0b6bc3f-1d1f-4723-90ac-ccac86b0fe8e'

describe('Robert Parker PEA agreement pricing', () => {
  it('shows $9,000 regular and $7,500 today for Robert', () => {
    const text = getAgreementTextByProgram('The Private Estate Accelerator', null, ROBERT)!
    expect(text).toContain('Regularly $9,000, but today for ONLY $7,500')
    expect(text).toContain('$497 per quarter for the Digital Family Office Software')
    expect(text).not.toContain('Regularly $12,000')
    expect(text).toContain('the total investment is Nine Thousand Dollars ($9,000.00)')
  })

  it('keeps standard pricing for other clients', () => {
    const text = getAgreementTextByProgram('The Private Estate Accelerator', null, 'someone-else')!
    expect(text).toContain('Regularly $12,000, but today for ONLY $9,000.')
  })
})
