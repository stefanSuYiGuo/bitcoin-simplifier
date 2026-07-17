import {encodeBase58, decodeBase58} from '../base58'

describe('Base58', () => {
  describe('encodeBase58', () => {
    it('encodes a hexadecimal string', () => {
      const hex = '00010966776006953d5567439e5e39f86a0d273bee'
      const encoded = encodeBase58(hex)

      expect(encoded).toBeTruthy()
      expect(encoded).toMatch(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/)
    })

    it('handles a simple hexadecimal value', () => {
      const hex = '0000287fb4cd'
      const encoded = encodeBase58(hex)

      expect(encoded).toBeTruthy()
    })

    it('handles an empty string', () => {
      const encoded = encodeBase58('')

      expect(encoded).toBe('')
    })

    it('preserves leading zero bytes', () => {
      const hex = '000000'
      const encoded = encodeBase58(hex)

      // Each 00 byte should encode as 1
      expect(encoded).toBe('111')
    })

    it('produces the same result for the same input', () => {
      const hex = 'abcdef1234567890'
      const encoded1 = encodeBase58(hex)
      const encoded2 = encodeBase58(hex)

      expect(encoded1).toBe(encoded2)
    })
  })

  describe('decodeBase58', () => {
    it('decodes a Base58 string', () => {
      const base58 = '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM'
      const decoded = decodeBase58(base58)

      expect(decoded).toBeTruthy()
      expect(decoded).toMatch(/^[0-9a-f]+$/i)
    })

    it('handles an empty string', () => {
      const decoded = decodeBase58('')

      expect(decoded).toBe('')
    })

    it('rejects invalid characters', () => {
      // The digit 0 is not part of the Base58 alphabet
      expect(() => {
        decodeBase58('0OIl')
      }).toThrow('Invalid Base58 character')
    })

    it('converts leading 1 characters to zero bytes', () => {
      const base58 = '111'
      const decoded = decodeBase58(base58)

      // Each leading 1 should decode as a 00 byte
      expect(decoded).toBe('000000')
    })
  })

  describe('encoding and decoding round trip', () => {
    it('restores the original value after encoding and decoding', () => {
      const original = 'abcdef1234567890'
      const encoded = encodeBase58(original)
      const decoded = decodeBase58(encoded)

      expect(decoded).toBe(original)
    })

    it('handles a range of hexadecimal values', () => {
      const testCases = [
        'ff',
        '00ff',
        'deadbeef',
        '0000abcd',
        '123456789abcdef0'
      ]

      for (const hex of testCases) {
        const encoded = encodeBase58(hex)
        const decoded = decodeBase58(encoded)
        expect(decoded).toBe(hex)
      }
    })

    it('handles long strings', () => {
      const longHex = 'a'.repeat(100)
      const encoded = encodeBase58(longHex)
      const decoded = decodeBase58(encoded)

      expect(decoded).toBe(longHex)
    })
  })
})

