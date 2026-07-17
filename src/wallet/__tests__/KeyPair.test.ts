import {KeyPair} from '../KeyPair'

describe('KeyPair', () => {
  describe('constructor', () => {
    it('generates a new key pair without arguments', () => {
      const keyPair = new KeyPair()

      expect(keyPair.privateKey).toBeTruthy()
      expect(keyPair.publicKey).toBeTruthy()
      expect(keyPair.privateKey).toHaveLength(64)
      expect(keyPair.publicKey).toHaveLength(130)
    })

    it('creates a key pair from a private key', () => {
      const keyPair1 = new KeyPair()
      const privateKey = keyPair1.privateKey

      const keyPair2 = new KeyPair(privateKey)

      expect(keyPair2.privateKey).toBe(privateKey)
      expect(keyPair2.publicKey).toBe(keyPair1.publicKey)
    })

    it('generates distinct keys for different instances', () => {
      const keyPair1 = new KeyPair()
      const keyPair2 = new KeyPair()

      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
    })
  })

  describe('sign and verify', () => {
    it('signs and verifies data', () => {
      const keyPair = new KeyPair()
      const data = 'Hello, Bitcoin!'

      const signature = keyPair.sign(data)
      const isValid = keyPair.verify(data, signature)

      expect(signature).toBeTruthy()
      expect(isValid).toBe(true)
    })

    it('rejects a signature after the data changes', () => {
      const keyPair = new KeyPair()
      const data = 'original data'
      const modifiedData = 'modified data'

      const signature = keyPair.sign(data)
      const isValid = keyPair.verify(modifiedData, signature)

      expect(isValid).toBe(false)
    })

    it('does not verify a signature with another key pair', () => {
      const keyPair1 = new KeyPair()
      const keyPair2 = new KeyPair()
      const data = 'test data'

      const signature = keyPair1.sign(data)
      const isValid = keyPair2.verify(data, signature)

      expect(isValid).toBe(false)
    })

    it('verifies a signature with the public key from a message', () => {
      // Create Alice's key pair
      const aliceKeyPair = new KeyPair()

      // Build a transaction message containing the public key
      const message = {
        data: 'Transfer 100 BTC',
        publicKey: aliceKeyPair.publicKey, // Include the public key in the transaction
      }
      const messageStr = JSON.stringify(message)

      // Alice signs the message
      const signature = aliceKeyPair.sign(messageStr)

      // Another participant reads the public key and verifies the signature
      const {Signature} = require('../../crypto/signature')
      const publicKeyFromMessage = message.publicKey // Read it from the transaction
      const isValid = Signature.verify(
        messageStr,
        signature,
        publicKeyFromMessage
      )

      expect(isValid).toBe(true)
    })

    it('requires the correct public key to verify a signature', () => {
      const alice = new KeyPair()
      const bob = new KeyPair()

      // Alice creates and signs a message
      const message = {
        content: 'test message',
        publicKey: alice.publicKey,
      }
      const messageStr = JSON.stringify(message)
      const signature = alice.sign(messageStr)

      const {Signature} = require('../../crypto/signature')

      // Verification succeeds with the public key from the message
      const publicKeyFromMessage = message.publicKey
      expect(
        Signature.verify(messageStr, signature, publicKeyFromMessage)
      ).toBe(true)

      // Verification fails if the public key is replaced with Bob's
      const tamperedMessage = {
        ...message,
        publicKey: bob.publicKey,
      }
      expect(
        Signature.verify(messageStr, signature, tamperedMessage.publicKey)
      ).toBe(false)
    })
  })

  describe('isValid', () => {
    it('returns true for a valid key pair', () => {
      const keyPair = new KeyPair()

      expect(keyPair.isValid()).toBe(true)
    })

    it('accepts a key pair restored from a private key', () => {
      const keyPair1 = new KeyPair()
      const keyPair2 = new KeyPair(keyPair1.privateKey)

      expect(keyPair2.isValid()).toBe(true)
    })
  })

  describe('JSON serialization', () => {
    it('exports to JSON-compatible data', () => {
      const keyPair = new KeyPair()
      const json = keyPair.toJSON()

      expect(json).toHaveProperty('privateKey')
      expect(json).toHaveProperty('publicKey')
      expect(json.privateKey).toBe(keyPair.privateKey)
      expect(json.publicKey).toBe(keyPair.publicKey)
    })

    it('imports from JSON-compatible data', () => {
      const keyPair1 = new KeyPair()
      const json = keyPair1.toJSON()

      const keyPair2 = KeyPair.fromJSON(json)

      expect(keyPair2.privateKey).toBe(keyPair1.privateKey)
      expect(keyPair2.publicKey).toBe(keyPair1.publicKey)
    })

    it('keeps the key pair usable after export and import', () => {
      const keyPair1 = new KeyPair()
      const data = 'test message'
      const signature = keyPair1.sign(data)

      const json = keyPair1.toJSON()
      const keyPair2 = KeyPair.fromJSON(json)

      const isValid = keyPair2.verify(data, signature)
      expect(isValid).toBe(true)
    })
  })
})
