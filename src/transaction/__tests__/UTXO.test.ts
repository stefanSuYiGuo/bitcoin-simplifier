import {UTXOSet} from '../UTXO'
import {TxOutput} from '../TxOutput'

describe('UTXOSet', () => {
  let utxoSet: UTXOSet

  beforeEach(() => {
    utxoSet = new UTXOSet()
  })

  describe('add and get', () => {
    it('adds and retrieves a UTXO', () => {
      const output = new TxOutput(50, 'alice')

      utxoSet.add('tx1', 0, output)
      const retrieved = utxoSet.get('tx1', 0)

      expect(retrieved).toBeDefined()
      expect(retrieved?.amount).toBe(50)
      expect(retrieved?.address).toBe('alice')
    })

    it('returns undefined for a missing UTXO', () => {
      const output = utxoSet.get('nonexistent', 0)

      expect(output).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true for an existing UTXO', () => {
      const output = new TxOutput(100, 'bob')
      utxoSet.add('tx2', 1, output)

      expect(utxoSet.has('tx2', 1)).toBe(true)
    })

    it('returns false for a missing UTXO', () => {
      expect(utxoSet.has('tx999', 0)).toBe(false)
    })
  })

  describe('remove', () => {
    it('removes a UTXO', () => {
      const output = new TxOutput(75, 'carol')
      utxoSet.add('tx3', 0, output)

      const removed = utxoSet.remove('tx3', 0)

      expect(removed).toBe(true)
      expect(utxoSet.has('tx3', 0)).toBe(false)
    })

    it('returns false when removing a missing UTXO', () => {
      const removed = utxoSet.remove('tx999', 0)

      expect(removed).toBe(false)
    })
  })

  describe('getUTXOsByAddress', () => {
    beforeEach(() => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'alice'))
      utxoSet.add('tx3', 0, new TxOutput(100, 'carol'))
    })

    it('returns every UTXO for an address', () => {
      const aliceUTXOs = utxoSet.getUTXOsByAddress('alice')

      expect(aliceUTXOs).toHaveLength(2)
      expect(aliceUTXOs[0].output.address).toBe('alice')
      expect(aliceUTXOs[1].output.address).toBe('alice')
    })

    it('returns the correct transaction IDs and output indexes', () => {
      const aliceUTXOs = utxoSet.getUTXOsByAddress('alice')

      const utxo1 = aliceUTXOs.find(u => u.txId === 'tx1' && u.outputIndex === 0)
      const utxo2 = aliceUTXOs.find(u => u.txId === 'tx2' && u.outputIndex === 0)

      expect(utxo1).toBeDefined()
      expect(utxo2).toBeDefined()
      expect(utxo1?.output.amount).toBe(50)
      expect(utxo2?.output.amount).toBe(20)
    })

    it('returns an empty array for an unknown address', () => {
      const utxos = utxoSet.getUTXOsByAddress('unknown')

      expect(utxos).toEqual([])
    })
  })

  describe('getBalance', () => {
    beforeEach(() => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'alice'))
      utxoSet.add('tx3', 0, new TxOutput(100, 'carol'))
    })

    it('calculates balances correctly', () => {
      expect(utxoSet.getBalance('alice')).toBe(70)
      expect(utxoSet.getBalance('bob')).toBe(30)
      expect(utxoSet.getBalance('carol')).toBe(100)
    })

    it('returns zero for an unknown address', () => {
      expect(utxoSet.getBalance('unknown')).toBe(0)
    })

    it('reduces the balance after removing a UTXO', () => {
      utxoSet.remove('tx1', 0)

      expect(utxoSet.getBalance('alice')).toBe(20)
    })
  })

  describe('size', () => {
    it('returns zero for an empty set', () => {
      expect(utxoSet.size()).toBe(0)
    })

    it('returns the number of UTXOs', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'alice'))

      expect(utxoSet.size()).toBe(3)
    })

    it('decreases after removing a UTXO', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      utxoSet.remove('tx1', 0)

      expect(utxoSet.size()).toBe(1)
    })
  })

  describe('clear', () => {
    it('removes every UTXO', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      utxoSet.clear()

      expect(utxoSet.size()).toBe(0)
      expect(utxoSet.has('tx1', 0)).toBe(false)
      expect(utxoSet.has('tx1', 1)).toBe(false)
    })
  })

  describe('clone', () => {
    it('creates a copy', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      const cloned = utxoSet.clone()

      expect(cloned.size()).toBe(utxoSet.size())
      expect(cloned.has('tx1', 0)).toBe(true)
      expect(cloned.has('tx1', 1)).toBe(true)
    })

    it('keeps the original set unchanged when modifying a copy', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))

      const cloned = utxoSet.clone()
      cloned.remove('tx1', 0)
      cloned.add('tx2', 0, new TxOutput(100, 'bob'))

      expect(utxoSet.has('tx1', 0)).toBe(true)
      expect(utxoSet.has('tx2', 0)).toBe(false)
    })
  })

  describe('JSON serialization', () => {
    beforeEach(() => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'carol'))
    })

    it('exports to JSON-compatible data', () => {
      const json = utxoSet.toJSON()

      expect(json).toHaveLength(3)
      expect(json[0]).toHaveProperty('txId')
      expect(json[0]).toHaveProperty('outputIndex')
      expect(json[0]).toHaveProperty('output')
    })

    it('imports from JSON-compatible data', () => {
      const json = utxoSet.toJSON()
      const restored = UTXOSet.fromJSON(json)

      expect(restored.size()).toBe(utxoSet.size())
      expect(restored.has('tx1', 0)).toBe(true)
      expect(restored.has('tx1', 1)).toBe(true)
      expect(restored.has('tx2', 0)).toBe(true)
    })

    it('preserves data across export and import', () => {
      const json = utxoSet.toJSON()
      const restored = UTXOSet.fromJSON(json)

      expect(restored.getBalance('alice')).toBe(utxoSet.getBalance('alice'))
      expect(restored.getBalance('bob')).toBe(utxoSet.getBalance('bob'))
      expect(restored.getBalance('carol')).toBe(utxoSet.getBalance('carol'))
    })
  })

  describe('getAll', () => {
    it('returns a copy of every UTXO', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      const all = utxoSet.getAll()

      expect(all.size).toBe(2)
      expect(all.get('tx1:0')).toBeDefined()
      expect(all.get('tx1:1')).toBeDefined()
    })

    it('keeps the original set unchanged when modifying the returned map', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))

      const all = utxoSet.getAll()
      all.clear()

      expect(utxoSet.size()).toBe(1)
    })
  })
})

