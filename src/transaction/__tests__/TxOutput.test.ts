import {TxOutput} from '../TxOutput'

describe('TxOutput', () => {
  describe('constructor', () => {
    it('creates a valid transaction output', () => {
      const output = new TxOutput(50, 'recipient_address')

      expect(output.amount).toBe(50)
      expect(output.address).toBe('recipient_address')
    })

    it('rejects a zero amount', () => {
      expect(() => {
        new TxOutput(0, 'address')
      }).toThrow('Output amount must be greater than 0')
    })

    it('rejects a negative amount', () => {
      expect(() => {
        new TxOutput(-10, 'address')
      }).toThrow('Output amount must be greater than 0')
    })

    it('rejects an empty address', () => {
      expect(() => {
        new TxOutput(10, '')
      }).toThrow('Recipient address cannot be empty')
    })

    it('rejects a whitespace-only address', () => {
      expect(() => {
        new TxOutput(10, '   ')
      }).toThrow('Recipient address cannot be empty')
    })
  })

  describe('toJSON', () => {
    it('serializes to JSON', () => {
      const output = new TxOutput(100, 'test_address')
      const json = output.toJSON()

      expect(json).toEqual({
        amount: 100,
        address: 'test_address'
      })
    })
  })

  describe('fromJSON', () => {
    it('deserializes from JSON', () => {
      const json = {
        amount: 75,
        address: 'another_address'
      }

      const output = TxOutput.fromJSON(json)

      expect(output.amount).toBe(75)
      expect(output.address).toBe('another_address')
    })
  })

  describe('JSON round trip', () => {
    it('preserves data through serialization and deserialization', () => {
      const original = new TxOutput(42.5, 'my_address')

      const json = original.toJSON()
      const restored = TxOutput.fromJSON(json)

      expect(restored.amount).toBe(original.amount)
      expect(restored.address).toBe(original.address)
    })
  })

  describe('toString', () => {
    it('returns a JSON string', () => {
      const output = new TxOutput(25, 'addr123')
      const str = output.toString()

      expect(str).toBeTruthy()
      expect(() => JSON.parse(str)).not.toThrow()

      const parsed = JSON.parse(str)
      expect(parsed.amount).toBe(25)
      expect(parsed.address).toBe('addr123')
    })
  })

  describe('clone', () => {
    it('creates a copy', () => {
      const original = new TxOutput(60, 'original_addr')
      const cloned = original.clone()

      expect(cloned.amount).toBe(original.amount)
      expect(cloned.address).toBe(original.address)
      expect(cloned).not.toBe(original)
    })
  })

  describe('amount ranges', () => {
    it('supports fractional amounts', () => {
      const output = new TxOutput(0.00000001, 'satoshi_addr')

      expect(output.amount).toBe(0.00000001)
    })

    it('supports large amounts', () => {
      const output = new TxOutput(21000000, 'big_addr')

      expect(output.amount).toBe(21000000)
    })
  })
})

