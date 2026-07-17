import {Hash} from '../hash'

describe('Hash', () => {
  describe('sha256', () => {
    it('calculates a SHA-256 hash correctly', () => {
      const data = 'hello world'
      const hash = Hash.sha256(data)

      expect(hash).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      )
      expect(hash).toHaveLength(64)
    })

    it('produces the same hash for identical input', () => {
      const data = 'test data'
      const hash1 = Hash.sha256(data)
      const hash2 = Hash.sha256(data)

      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different input', () => {
      const hash1 = Hash.sha256('data1')
      const hash2 = Hash.sha256('data2')

      expect(hash1).not.toBe(hash2)
    })

    it('handles an empty string', () => {
      const hash = Hash.sha256('')

      expect(hash).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      )
    })
  })

  describe('doubleSha256', () => {
    it('calculates a double SHA-256 hash correctly', () => {
      const data = 'hello'
      const hash = Hash.doubleSha256(data)

      expect(hash).toHaveLength(64)

      // Verify that hashing is performed twice
      const firstHash = Hash.sha256(data)
      const expectedHash = Hash.sha256(firstHash)
      expect(hash).toBe(expectedHash)
    })

    it('produces a double hash that differs from a single hash', () => {
      const data = 'test'
      const singleHash = Hash.sha256(data)
      const doubleHash = Hash.doubleSha256(data)

      expect(singleHash).not.toBe(doubleHash)
    })
  })

  describe('ripemd160', () => {
    it('calculates a RIPEMD-160 hash correctly', () => {
      const data = 'hello world'
      const hash = Hash.ripemd160(data)

      expect(hash).toBe('98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f')
      expect(hash).toHaveLength(40)
    })
  })

  describe('hashObject', () => {
    it('calculates an object hash correctly', () => {
      const obj = {name: 'Alice', amount: 100}
      const hash = Hash.hashObject(obj)

      expect(hash).toHaveLength(64)
    })

    it('produces the same hash for identical objects', () => {
      const obj1 = {a: 1, b: 2}
      const obj2 = {a: 1, b: 2}

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      expect(hash1).toBe(hash2)
    })

    it('produces different hashes for different objects', () => {
      const obj1 = {a: 1}
      const obj2 = {a: 2}

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      expect(hash1).not.toBe(hash2)
    })

    it('produces different hashes when property order differs', () => {
      // JSON.stringify preserves property insertion order
      const obj1 = JSON.parse('{"a":1,"b":2}')
      const obj2 = JSON.parse('{"b":2,"a":1}')

      const hash1 = Hash.hashObject(obj1)
      const hash2 = Hash.hashObject(obj2)

      // Different JSON.stringify output produces different hashes
      expect(hash1).not.toBe(hash2)
    })
  })
})
