import {Hash} from '../hash'

describe('Hash', () => {
  describe('sha256', () => {
    it('应该正确计算 SHA-256 哈希', () => {
      const data = 'hello world'
      const hash = Hash.sha256(data)

      expect(hash).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      )
      expect(hash).toHaveLength(64)
    })

    it('对相同输入应产生相同哈希', () => {
      const data = 'test data'
      const hash1 = Hash.sha256(data)
      const hash2 = Hash.sha256(data)

      expect(hash1).toBe(hash2)
    })

    it('对不同输入应产生不同哈希', () => {
      const hash1 = Hash.sha256('data1')
      const hash2 = Hash.sha256('data2')

      expect(hash1).not.toBe(hash2)
    })

    it('应该处理空字符串', () => {
      const hash = Hash.sha256('')

      expect(hash).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      )
    })
  })

  describe('doubleSha256', () => {
    it('应该正确计算双重 SHA-256 哈希', () => {
      const data = 'hello'
      const hash = Hash.doubleSha256(data)

      expect(hash).toHaveLength(64)

      // 验证确实是两次哈希
      const firstHash = Hash.sha256(data)
      const expectedHash = Hash.sha256(firstHash)
      expect(hash).toBe(expectedHash)
    })

    it('双重哈希应不同于单次哈希', () => {
      const data = 'test'
      const singleHash = Hash.sha256(data)
      const doubleHash = Hash.doubleSha256(data)

      expect(singleHash).not.toBe(doubleHash)
    })
  })

  describe('ripemd160', () => {
    it('应该正确计算 RIPEMD-160 哈希', () => {
      const data = 'hello world'
      const hash = Hash.ripemd160(data)

      expect(hash).toBe('98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f')
      expect(hash).toHaveLength(40)
    })
  })

  describe('hashObject', () => {
    it('应该正确计算对象的哈希', () => {
      const obj = {name: 'Alice', amount: 100}
      const hash = Hash.hashObject(obj)

      expect(hash).toHaveLength(64)
    })

    it('相同对象应产生相同哈希', () => {
      const obj1 = {a: 1, b: 2}
      const obj2 = {a: 1, b: 2}

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      expect(hash1).toBe(hash2)
    })

    it('不同对象应产生不同哈希', () => {
      const obj1 = {a: 1}
      const obj2 = {a: 2}

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      expect(hash1).not.toBe(hash2)
    })

    it('属性顺序不同应产生不同哈希', () => {
      // JSON.stringify 会保持属性插入顺序
      const obj1 = JSON.parse('{"a":1,"b":2}')
      const obj2 = JSON.parse('{"b":2,"a":1}')

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      // 因为 JSON.stringify 的顺序不同，哈希也不同
      expect(hash1).not.toBe(hash2)
    })
  })
})
