import {Signature} from '../signature'

describe('Signature', () => {
  describe('generateKeyPair', () => {
    it('应该生成有效的密钥对', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()

      expect(privateKey).toBeTruthy()
      expect(publicKey).toBeTruthy()
      expect(typeof privateKey).toBe('string')
      expect(typeof publicKey).toBe('string')
    })

    it('应该生成 64 字符的私钥', () => {
      const {privateKey} = Signature.generateKeyPair()

      expect(privateKey).toHaveLength(64)
    })

    it('应该生成 130 字符的公钥（未压缩格式）', () => {
      const {publicKey} = Signature.generateKeyPair()

      expect(publicKey).toHaveLength(130)
    })

    it('每次生成的密钥对应该不同', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
    })
  })

  describe('getPublicKeyFromPrivate', () => {
    it('应该从私钥正确导出公钥', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const derivedPublicKey = Signature.getPublicKeyFromPrivate(privateKey)

      expect(derivedPublicKey).toBe(publicKey)
    })

    it('不同的私钥应该导出不同的公钥', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      const publicKey1 = Signature.getPublicKeyFromPrivate(keyPair1.privateKey)
      const publicKey2 = Signature.getPublicKeyFromPrivate(keyPair2.privateKey)

      expect(publicKey1).not.toBe(publicKey2)
    })
  })

  describe('sign and verify', () => {
    it('应该能够签名和验证数据', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'Hello, Bitcoin!'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, publicKey)

      expect(signature).toBeTruthy()
      expect(isValid).toBe(true)
    })

    it('签名应该是十六进制字符串', () => {
      const {privateKey} = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, privateKey)

      expect(signature).toMatch(/^[0-9a-f]+$/i)
    })

    it('修改数据后签名应该无效', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'original data'
      const modifiedData = 'modified data'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(modifiedData, signature, publicKey)

      expect(isValid).toBe(false)
    })

    it('使用错误的公钥验证应该失败', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, keyPair1.privateKey)
      const isValid = Signature.verify(data, signature, keyPair2.publicKey)

      expect(isValid).toBe(false)
    })

    it('修改签名后验证应该失败', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, privateKey)
      const tamperedSignature = signature.slice(0, -2) + 'ff'
      const isValid = Signature.verify(data, tamperedSignature, publicKey)

      expect(isValid).toBe(false)
    })

    it('应该能够验证复杂数据', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = JSON.stringify({
        from: 'Alice',
        to: 'Bob',
        amount: 50,
        timestamp: Date.now(),
      })

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, publicKey)

      expect(isValid).toBe(true)
    })

    it('空字符串也应该能够签名和验证', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = ''

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, publicKey)

      expect(isValid).toBe(true)
    })
  })

  describe('verifyKeyPair', () => {
    it('应该验证匹配的密钥对', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()

      const isValid = Signature.verifyKeyPair(privateKey, publicKey)

      expect(isValid).toBe(true)
    })

    it('应该拒绝不匹配的密钥对', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      const isValid = Signature.verifyKeyPair(
        keyPair1.privateKey,
        keyPair2.publicKey
      )

      expect(isValid).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理无效的签名字符串', () => {
      const {publicKey} = Signature.generateKeyPair()
      const data = 'test'
      const invalidSignature = 'invalid_signature'

      const isValid = Signature.verify(data, invalidSignature, publicKey)

      expect(isValid).toBe(false)
    })

    it('应该处理无效的公钥', () => {
      const {privateKey} = Signature.generateKeyPair()
      const data = 'test'
      const invalidPublicKey = 'invalid_public_key'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, invalidPublicKey)

      expect(isValid).toBe(false)
    })
  })
})
