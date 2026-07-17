import {UTXOSet} from '../UTXO'
import {TxOutput} from '../TxOutput'

describe('UTXOSet', () => {
  let utxoSet: UTXOSet

  beforeEach(() => {
    utxoSet = new UTXOSet()
  })

  describe('add 和 get', () => {
    it('应该能够添加和获取 UTXO', () => {
      const output = new TxOutput(50, 'alice')

      utxoSet.add('tx1', 0, output)
      const retrieved = utxoSet.get('tx1', 0)

      expect(retrieved).toBeDefined()
      expect(retrieved?.amount).toBe(50)
      expect(retrieved?.address).toBe('alice')
    })

    it('获取不存在的 UTXO 应该返回 undefined', () => {
      const output = utxoSet.get('nonexistent', 0)

      expect(output).toBeUndefined()
    })
  })

  describe('has', () => {
    it('存在的 UTXO 应该返回 true', () => {
      const output = new TxOutput(100, 'bob')
      utxoSet.add('tx2', 1, output)

      expect(utxoSet.has('tx2', 1)).toBe(true)
    })

    it('不存在的 UTXO 应该返回 false', () => {
      expect(utxoSet.has('tx999', 0)).toBe(false)
    })
  })

  describe('remove', () => {
    it('应该能够移除 UTXO', () => {
      const output = new TxOutput(75, 'carol')
      utxoSet.add('tx3', 0, output)

      const removed = utxoSet.remove('tx3', 0)

      expect(removed).toBe(true)
      expect(utxoSet.has('tx3', 0)).toBe(false)
    })

    it('移除不存在的 UTXO 应该返回 false', () => {
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

    it('应该返回指定地址的所有 UTXO', () => {
      const aliceUTXOs = utxoSet.getUTXOsByAddress('alice')

      expect(aliceUTXOs).toHaveLength(2)
      expect(aliceUTXOs[0].output.address).toBe('alice')
      expect(aliceUTXOs[1].output.address).toBe('alice')
    })

    it('应该返回正确的 txId 和 outputIndex', () => {
      const aliceUTXOs = utxoSet.getUTXOsByAddress('alice')

      const utxo1 = aliceUTXOs.find(u => u.txId === 'tx1' && u.outputIndex === 0)
      const utxo2 = aliceUTXOs.find(u => u.txId === 'tx2' && u.outputIndex === 0)

      expect(utxo1).toBeDefined()
      expect(utxo2).toBeDefined()
      expect(utxo1?.output.amount).toBe(50)
      expect(utxo2?.output.amount).toBe(20)
    })

    it('不存在的地址应该返回空数组', () => {
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

    it('应该正确计算余额', () => {
      expect(utxoSet.getBalance('alice')).toBe(70)
      expect(utxoSet.getBalance('bob')).toBe(30)
      expect(utxoSet.getBalance('carol')).toBe(100)
    })

    it('不存在的地址余额应该为 0', () => {
      expect(utxoSet.getBalance('unknown')).toBe(0)
    })

    it('移除 UTXO 后余额应该减少', () => {
      utxoSet.remove('tx1', 0)

      expect(utxoSet.getBalance('alice')).toBe(20)
    })
  })

  describe('size', () => {
    it('空集合大小应该为 0', () => {
      expect(utxoSet.size()).toBe(0)
    })

    it('应该正确返回 UTXO 数量', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'alice'))

      expect(utxoSet.size()).toBe(3)
    })

    it('移除 UTXO 后大小应该减少', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      utxoSet.remove('tx1', 0)

      expect(utxoSet.size()).toBe(1)
    })
  })

  describe('clear', () => {
    it('应该清空所有 UTXO', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      utxoSet.clear()

      expect(utxoSet.size()).toBe(0)
      expect(utxoSet.has('tx1', 0)).toBe(false)
      expect(utxoSet.has('tx1', 1)).toBe(false)
    })
  })

  describe('clone', () => {
    it('应该创建副本', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      const cloned = utxoSet.clone()

      expect(cloned.size()).toBe(utxoSet.size())
      expect(cloned.has('tx1', 0)).toBe(true)
      expect(cloned.has('tx1', 1)).toBe(true)
    })

    it('修改副本不应该影响原始集合', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))

      const cloned = utxoSet.clone()
      cloned.remove('tx1', 0)
      cloned.add('tx2', 0, new TxOutput(100, 'bob'))

      expect(utxoSet.has('tx1', 0)).toBe(true)
      expect(utxoSet.has('tx2', 0)).toBe(false)
    })
  })

  describe('JSON 序列化', () => {
    beforeEach(() => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))
      utxoSet.add('tx2', 0, new TxOutput(20, 'carol'))
    })

    it('应该能够导出为 JSON', () => {
      const json = utxoSet.toJSON()

      expect(json).toHaveLength(3)
      expect(json[0]).toHaveProperty('txId')
      expect(json[0]).toHaveProperty('outputIndex')
      expect(json[0]).toHaveProperty('output')
    })

    it('应该能够从 JSON 导入', () => {
      const json = utxoSet.toJSON()
      const restored = UTXOSet.fromJSON(json)

      expect(restored.size()).toBe(utxoSet.size())
      expect(restored.has('tx1', 0)).toBe(true)
      expect(restored.has('tx1', 1)).toBe(true)
      expect(restored.has('tx2', 0)).toBe(true)
    })

    it('导出导入后数据应该一致', () => {
      const json = utxoSet.toJSON()
      const restored = UTXOSet.fromJSON(json)

      expect(restored.getBalance('alice')).toBe(utxoSet.getBalance('alice'))
      expect(restored.getBalance('bob')).toBe(utxoSet.getBalance('bob'))
      expect(restored.getBalance('carol')).toBe(utxoSet.getBalance('carol'))
    })
  })

  describe('getAll', () => {
    it('应该返回所有 UTXO 的副本', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))
      utxoSet.add('tx1', 1, new TxOutput(30, 'bob'))

      const all = utxoSet.getAll()

      expect(all.size).toBe(2)
      expect(all.get('tx1:0')).toBeDefined()
      expect(all.get('tx1:1')).toBeDefined()
    })

    it('修改返回的 Map 不应该影响原始集合', () => {
      utxoSet.add('tx1', 0, new TxOutput(50, 'alice'))

      const all = utxoSet.getAll()
      all.clear()

      expect(utxoSet.size()).toBe(1)
    })
  })
})


