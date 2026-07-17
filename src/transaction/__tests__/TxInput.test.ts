import {TxInput} from '../TxInput'

describe('TxInput', () => {
  describe('构造函数', () => {
    it('应该创建未签名的交易输入', () => {
      const input = new TxInput('tx123', 0)

      expect(input.txId).toBe('tx123')
      expect(input.outputIndex).toBe(0)
      expect(input.signature).toBe('')
      expect(input.publicKey).toBe('')
    })

    it('应该创建已签名的交易输入', () => {
      const input = new TxInput('tx456', 1, 'sig123', 'pubkey456')

      expect(input.txId).toBe('tx456')
      expect(input.outputIndex).toBe(1)
      expect(input.signature).toBe('sig123')
      expect(input.publicKey).toBe('pubkey456')
    })

    it('应该拒绝空交易 ID', () => {
      expect(() => {
        new TxInput('', 0)
      }).toThrow('交易 ID 不能为空')
    })

    it('应该拒绝只包含空格的交易 ID', () => {
      expect(() => {
        new TxInput('   ', 0)
      }).toThrow('交易 ID 不能为空')
    })

    it('应该拒绝负的输出索引', () => {
      expect(() => {
        new TxInput('tx789', -1)
      }).toThrow('输出索引不能为负数')
    })
  })

  describe('setSignature', () => {
    it('应该设置签名和公钥', () => {
      const input = new TxInput('tx123', 0)

      input.setSignature('new_sig', 'new_pubkey')

      expect(input.signature).toBe('new_sig')
      expect(input.publicKey).toBe('new_pubkey')
    })
  })

  describe('isSigned', () => {
    it('未签名的输入应该返回 false', () => {
      const input = new TxInput('tx123', 0)

      expect(input.isSigned()).toBe(false)
    })

    it('已签名的输入应该返回 true', () => {
      const input = new TxInput('tx123', 0, 'sig', 'pubkey')

      expect(input.isSigned()).toBe(true)
    })

    it('设置签名后应该返回 true', () => {
      const input = new TxInput('tx123', 0)

      input.setSignature('sig', 'pubkey')

      expect(input.isSigned()).toBe(true)
    })
  })

  describe('toJSON', () => {
    it('应该正确序列化为 JSON', () => {
      const input = new TxInput('tx_abc', 2, 'signature', 'public_key')
      const json = input.toJSON()

      expect(json).toEqual({
        txId: 'tx_abc',
        outputIndex: 2,
        signature: 'signature',
        publicKey: 'public_key'
      })
    })

    it('未签名的输入应该包含空签名', () => {
      const input = new TxInput('tx_xyz', 0)
      const json = input.toJSON()

      expect(json.signature).toBe('')
      expect(json.publicKey).toBe('')
    })
  })

  describe('fromJSON', () => {
    it('应该从完整 JSON 反序列化', () => {
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

    it('应该处理缺少签名字段的 JSON', () => {
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

  describe('JSON 往返', () => {
    it('序列化后反序列化应该得到相同数据', () => {
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
    it('应该返回不包含签名的字符串', () => {
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
    it('应该返回包含所有字段的 JSON 字符串', () => {
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
    it('应该返回正确格式的 UTXO 键', () => {
      const input = new TxInput('transaction_id', 7)
      const key = input.getUTXOKey()

      expect(key).toBe('transaction_id:7')
    })

    it('不同输入应该有不同的键', () => {
      const input1 = new TxInput('tx1', 0)
      const input2 = new TxInput('tx1', 1)
      const input3 = new TxInput('tx2', 0)

      expect(input1.getUTXOKey()).not.toBe(input2.getUTXOKey())
      expect(input1.getUTXOKey()).not.toBe(input3.getUTXOKey())
      expect(input2.getUTXOKey()).not.toBe(input3.getUTXOKey())
    })
  })

  describe('clone', () => {
    it('应该创建副本', () => {
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


