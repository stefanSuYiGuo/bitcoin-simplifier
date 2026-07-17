import {TxOutput} from '../TxOutput'

describe('TxOutput', () => {
  describe('构造函数', () => {
    it('应该创建有效的交易输出', () => {
      const output = new TxOutput(50, 'recipient_address')

      expect(output.amount).toBe(50)
      expect(output.address).toBe('recipient_address')
    })

    it('应该拒绝零金额', () => {
      expect(() => {
        new TxOutput(0, 'address')
      }).toThrow('输出金额必须大于 0')
    })

    it('应该拒绝负金额', () => {
      expect(() => {
        new TxOutput(-10, 'address')
      }).toThrow('输出金额必须大于 0')
    })

    it('应该拒绝空地址', () => {
      expect(() => {
        new TxOutput(10, '')
      }).toThrow('接收地址不能为空')
    })

    it('应该拒绝只包含空格的地址', () => {
      expect(() => {
        new TxOutput(10, '   ')
      }).toThrow('接收地址不能为空')
    })
  })

  describe('toJSON', () => {
    it('应该正确序列化为 JSON', () => {
      const output = new TxOutput(100, 'test_address')
      const json = output.toJSON()

      expect(json).toEqual({
        amount: 100,
        address: 'test_address'
      })
    })
  })

  describe('fromJSON', () => {
    it('应该从 JSON 反序列化', () => {
      const json = {
        amount: 75,
        address: 'another_address'
      }

      const output = TxOutput.fromJSON(json)

      expect(output.amount).toBe(75)
      expect(output.address).toBe('another_address')
    })
  })

  describe('JSON 往返', () => {
    it('序列化后反序列化应该得到相同数据', () => {
      const original = new TxOutput(42.5, 'my_address')

      const json = original.toJSON()
      const restored = TxOutput.fromJSON(json)

      expect(restored.amount).toBe(original.amount)
      expect(restored.address).toBe(original.address)
    })
  })

  describe('toString', () => {
    it('应该返回 JSON 字符串', () => {
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
    it('应该创建副本', () => {
      const original = new TxOutput(60, 'original_addr')
      const cloned = original.clone()

      expect(cloned.amount).toBe(original.amount)
      expect(cloned.address).toBe(original.address)
      expect(cloned).not.toBe(original)
    })
  })

  describe('小数金额', () => {
    it('应该支持小数金额', () => {
      const output = new TxOutput(0.00000001, 'satoshi_addr')

      expect(output.amount).toBe(0.00000001)
    })

    it('应该支持大金额', () => {
      const output = new TxOutput(21000000, 'big_addr')

      expect(output.amount).toBe(21000000)
    })
  })
})


