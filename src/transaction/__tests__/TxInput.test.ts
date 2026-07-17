import {TxInput} from '../TxInput'

describe('TxInput', () => {
  describe('constructor', () => {
    it('creates an unsigned transaction input', () => {
      const input = new TxInput('tx123', 0)

      expect(input.txId).toBe('tx123')
      expect(input.outputIndex).toBe(0)
      expect(input.signature).toBe('')
      expect(input.publicKey).toBe('')
    })

    it('creates a signed transaction input', () => {
      const input = new TxInput('tx456', 1, 'sig123', 'pubkey456')

      expect(input.txId).toBe('tx456')
      expect(input.outputIndex).toBe(1)
      expect(input.signature).toBe('sig123')
      expect(input.publicKey).toBe('pubkey456')
    })

    it('rejects an empty transaction ID', () => {
      expect(() => {
        new TxInput('', 0)
      }).toThrow('Transaction ID cannot be empty')
    })

    it('rejects a whitespace-only transaction ID', () => {
      expect(() => {
        new TxInput('   ', 0)
      }).toThrow('Transaction ID cannot be empty')
    })

    it('rejects a negative output index', () => {
      expect(() => {
        new TxInput('tx789', -1)
      }).toThrow('Output index cannot be negative')
    })
  })

  describe('setSignature', () => {
    it('sets the signature and public key', () => {
      const input = new TxInput('tx123', 0)

      input.setSignature('new_sig', 'new_pubkey')

      expect(input.signature).toBe('new_sig')
      expect(input.publicKey).toBe('new_pubkey')
    })
  })

  describe('isSigned', () => {
    it('returns false for an unsigned input', () => {
      const input = new TxInput('tx123', 0)

      expect(input.isSigned()).toBe(false)
    })

    it('returns true for a signed input', () => {
      const input = new TxInput('tx123', 0, 'sig', 'pubkey')

      expect(input.isSigned()).toBe(true)
    })

    it('returns true after setting a signature', () => {
      const input = new TxInput('tx123', 0)

      input.setSignature('sig', 'pubkey')

      expect(input.isSigned()).toBe(true)
    })
  })

  describe('toJSON', () => {
    it('serializes to JSON', () => {
      const input = new TxInput('tx_abc', 2, 'signature', 'public_key')
      const json = input.toJSON()

      expect(json).toEqual({
        txId: 'tx_abc',
        outputIndex: 2,
        signature: 'signature',
        publicKey: 'public_key'
      })
    })

    it('includes empty signature fields for an unsigned input', () => {
      const input = new TxInput('tx_xyz', 0)
      const json = input.toJSON()

      expect(json.signature).toBe('')
      expect(json.publicKey).toBe('')
    })
  })

  describe('fromJSON', () => {
    it('deserializes from complete JSON data', () => {
      const json = {
        txId: 'tx_def',
        outputIndex: 3,
        signature: 'my_sig',
        publicKey: 'my_pubkey'
      }

      const input = TxInput.fromJSON(json)

      expect(input.txId).toBe('tx_def')
      expect(input.outputIndex).toBe(3)
      expect(input.signature).toBe('my_sig')
      expect(input.publicKey).toBe('my_pubkey')
    })

    it('handles JSON data without signature fields', () => {
      const json = {
        txId: 'tx_ghi',
        outputIndex: 1
      }

      const input = TxInput.fromJSON(json)

      expect(input.txId).toBe('tx_ghi')
      expect(input.outputIndex).toBe(1)
      expect(input.signature).toBe('')
      expect(input.publicKey).toBe('')
    })
  })

  describe('JSON round trip', () => {
    it('preserves data through serialization and deserialization', () => {
      const original = new TxInput('tx_original', 5, 'orig_sig', 'orig_pub')

      const json = original.toJSON()
      const restored = TxInput.fromJSON(json)

      expect(restored.txId).toBe(original.txId)
      expect(restored.outputIndex).toBe(original.outputIndex)
      expect(restored.signature).toBe(original.signature)
      expect(restored.publicKey).toBe(original.publicKey)
    })
  })

  describe('toStringForSigning', () => {
    it('returns a string without signature data', () => {
      const input = new TxInput('transaction_abc', 1, 'my_signature', 'my_publickey')
      const str = input.toStringForSigning()

      expect(str).toBeTruthy()
      expect(str).not.toContain('my_signature')
      expect(str).not.toContain('my_publickey')

      const parsed = JSON.parse(str)
      expect(parsed.txId).toBe('transaction_abc')
      expect(parsed.outputIndex).toBe(1)
      expect(parsed).not.toHaveProperty('signature')
      expect(parsed).not.toHaveProperty('publicKey')
    })
  })

  describe('toString', () => {
    it('returns a JSON string containing every field', () => {
      const input = new TxInput('tx_full', 2, 'full_sig', 'full_pub')
      const str = input.toString()

      expect(str).toBeTruthy()

      const parsed = JSON.parse(str)
      expect(parsed.txId).toBe('tx_full')
      expect(parsed.outputIndex).toBe(2)
      expect(parsed.signature).toBe('full_sig')
      expect(parsed.publicKey).toBe('full_pub')
    })
  })

  describe('getUTXOKey', () => {
    it('returns a correctly formatted UTXO key', () => {
      const input = new TxInput('transaction_id', 7)
      const key = input.getUTXOKey()

      expect(key).toBe('transaction_id:7')
    })

    it('returns distinct keys for different inputs', () => {
      const input1 = new TxInput('tx1', 0)
      const input2 = new TxInput('tx1', 1)
      const input3 = new TxInput('tx2', 0)

      expect(input1.getUTXOKey()).not.toBe(input2.getUTXOKey())
      expect(input1.getUTXOKey()).not.toBe(input3.getUTXOKey())
      expect(input2.getUTXOKey()).not.toBe(input3.getUTXOKey())
    })
  })

  describe('clone', () => {
    it('creates a copy', () => {
      const original = new TxInput('clone_tx', 4, 'clone_sig', 'clone_pub')
      const cloned = original.clone()

      expect(cloned.txId).toBe(original.txId)
      expect(cloned.outputIndex).toBe(original.outputIndex)
      expect(cloned.signature).toBe(original.signature)
      expect(cloned.publicKey).toBe(original.publicKey)
      expect(cloned).not.toBe(original)
    })
  })
})

