import {encodeBase58, decodeBase58} from '../base58'

describe('Base58', () => {
  describe('encodeBase58', () => {
    it('应该正确编码十六进制字符串', () => {
      const hex = '00010966776006953d5567439e5e39f86a0d273bee'
      const encoded = encodeBase58(hex)

      expect(encoded).toBeTruthy()
      expect(encoded).toMatch(/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/)
    })

    it('应该正确处理简单的十六进制', () => {
      const hex = '0000287fb4cd'
      const encoded = encodeBase58(hex)

      expect(encoded).toBeTruthy()
    })

    it('应该处理空字符串', () => {
      const encoded = encodeBase58('')

      expect(encoded).toBe('')
    })

    it('应该处理前导零', () => {
      const hex = '000000'
      const encoded = encodeBase58(hex)

      // 每个 00 应该编码为 '1'
      expect(encoded).toBe('111')
    })

    it('相同输入应产生相同输出', () => {
      const hex = 'abcdef1234567890'
      const encoded1 = encodeBase58(hex)
      const encoded2 = encodeBase58(hex)

      expect(encoded1).toBe(encoded2)
    })
  })

  describe('decodeBase58', () => {
    it('应该正确解码 Base58 字符串', () => {
      const base58 = '16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM'
      const decoded = decodeBase58(base58)

      expect(decoded).toBeTruthy()
      expect(decoded).toMatch(/^[0-9a-f]+$/i)
    })

    it('应该处理空字符串', () => {
      const decoded = decodeBase58('')

      expect(decoded).toBe('')
    })

    it('应该拒绝无效字符', () => {
      // 包含 '0' (零)，不是有效的 Base58 字符
      expect(() => {
        decodeBase58('0OIl')
      }).toThrow('Invalid Base58 character')
    })

    it('应该正确处理前导 1', () => {
      const base58 = '111'
      const decoded = decodeBase58(base58)

      // 每个前导 '1' 应该解码为 '00'
      expect(decoded).toBe('000000')
    })
  })

  describe('编码和解码往返', () => {
    it('编码后解码应该得到原始值', () => {
      const original = 'abcdef1234567890'
      const encoded = encodeBase58(original)
      const decoded = decodeBase58(encoded)

      expect(decoded).toBe(original)
    })

    it('应该处理各种十六进制值', () => {
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

    it('应该处理长字符串', () => {
      const longHex = 'a'.repeat(100)
      const encoded = encodeBase58(longHex)
      const decoded = decodeBase58(encoded)

      expect(decoded).toBe(longHex)
    })
  })
})


