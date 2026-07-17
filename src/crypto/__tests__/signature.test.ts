import {Signature} from '../signature'

describe('Signature', () => {
  describe('generateKeyPair', () => {
    it('generates a valid key pair', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()

      expect(privateKey).toBeTruthy()
      expect(publicKey).toBeTruthy()
      expect(typeof privateKey).toBe('string')
      expect(typeof publicKey).toBe('string')
    })

    it('generates a 64-character private key', () => {
      const {privateKey} = Signature.generateKeyPair()

      expect(privateKey).toHaveLength(64)
    })

    it('generates a 130-character uncompressed public key', () => {
      const {publicKey} = Signature.generateKeyPair()

      expect(publicKey).toHaveLength(130)
    })

    it('generates a different key pair each time', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
    })
  })

  describe('getPublicKeyFromPrivate', () => {
    it('derives the correct public key from a private key', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const derivedPublicKey = Signature.getPublicKeyFromPrivate(privateKey)

      expect(derivedPublicKey).toBe(publicKey)
    })

    it('derives different public keys from different private keys', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      const publicKey1 = Signature.getPublicKeyFromPrivate(keyPair1.privateKey)
      const publicKey2 = Signature.getPublicKeyFromPrivate(keyPair2.privateKey)

      expect(publicKey1).not.toBe(publicKey2)
    })
  })

  describe('sign and verify', () => {
    it('signs and verifies data', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'Hello, Bitcoin!'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, publicKey)

      expect(signature).toBeTruthy()
      expect(isValid).toBe(true)
    })

    it('returns the signature as a hexadecimal string', () => {
      const {privateKey} = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, privateKey)

      expect(signature).toMatch(/^[0-9a-f]+$/i)
    })

    it('rejects a signature when the data is modified', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'original data'
      const modifiedData = 'modified data'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(modifiedData, signature, publicKey)

      expect(isValid).toBe(false)
    })

    it('fails verification with the wrong public key', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, keyPair1.privateKey)
      const isValid = Signature.verify(data, signature, keyPair2.publicKey)

      expect(isValid).toBe(false)
    })

    it('fails verification after the signature is modified', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = 'test data'

      const signature = Signature.sign(data, privateKey)
      const tamperedSignature = signature.slice(0, -2) + 'ff'
      const isValid = Signature.verify(data, tamperedSignature, publicKey)

      expect(isValid).toBe(false)
    })

    it('verifies structured data', () => {
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

    it('signs and verifies an empty string', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()
      const data = ''

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, publicKey)

      expect(isValid).toBe(true)
    })
  })

  describe('verifyKeyPair', () => {
    it('accepts a matching key pair', () => {
      const {privateKey, publicKey} = Signature.generateKeyPair()

      const isValid = Signature.verifyKeyPair(privateKey, publicKey)

      expect(isValid).toBe(true)
    })

    it('rejects a mismatched key pair', () => {
      const keyPair1 = Signature.generateKeyPair()
      const keyPair2 = Signature.generateKeyPair()

      const isValid = Signature.verifyKeyPair(
        keyPair1.privateKey,
        keyPair2.publicKey
      )

      expect(isValid).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles an invalid signature string', () => {
      const {publicKey} = Signature.generateKeyPair()
      const data = 'test'
      const invalidSignature = 'invalid_signature'

      const isValid = Signature.verify(data, invalidSignature, publicKey)

      expect(isValid).toBe(false)
    })

    it('handles an invalid public key', () => {
      const {privateKey} = Signature.generateKeyPair()
      const data = 'test'
      const invalidPublicKey = 'invalid_public_key'

      const signature = Signature.sign(data, privateKey)
      const isValid = Signature.verify(data, signature, invalidPublicKey)

      expect(isValid).toBe(false)
    })
  })
})
