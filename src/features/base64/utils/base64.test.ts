import { describe, expect, it } from 'vitest'

import { decodeBase64, encodeBase64 } from './base64'

describe('base64 utilities', () => {
  it('encodes text to base64', () => {
    const result = encodeBase64('Tuneer')

    expect(result).toEqual({ ok: true, value: 'VHVuZWVy' })
  })

  it('decodes base64 to text', () => {
    const result = decodeBase64('aGVsbG8gd29ybGQ=')

    expect(result).toEqual({ ok: true, value: 'hello world' })
  })

  it('returns failure for invalid strings', () => {
    const result = decodeBase64('***invalid***')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0)
    }
  })
})
