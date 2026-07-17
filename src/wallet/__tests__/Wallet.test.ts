import {Wallet} from '../Wallet'

describe('Wallet', () => {
  describe('constructor', () => {
    it('creates a new wallet', () => {
      const wallet = new Wallet()

      expect(wallet.privateKey).toBeTruthy()
      expect(wallet.publicKey).toBeTruthy()
      expect(wallet.address).toBeTruthy()
    })

    it('creates a wallet from a private key', () => {
      const wallet1 = new Wallet()
      const privateKey = wallet1.privateKey

      const wallet2 = Wallet.fromPrivateKey(privateKey)

      expect(wallet2.privateKey).toBe(wallet1.privateKey)
      expect(wallet2.publicKey).toBe(wallet1.publicKey)
      expect(wallet2.address).toBe(wallet1.address)
    })

    it('creates distinct addresses for different wallets', () => {
      const wallet1 = new Wallet()
      const wallet2 = new Wallet()

      expect(wallet1.address).not.toBe(wallet2.address)
    })
  })

  describe('address generation', () => {
    it('generates a Base58 address', () => {
      const wallet = new Wallet()

      // The Base58 alphabet excludes 0, O, I, and l
      const base58Regex =
        /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
      expect(wallet.address).toMatch(base58Regex)
    })

    it('generates an address within the expected length range', () => {
      const wallet = new Wallet()

      expect(wallet.address.length).toBeGreaterThanOrEqual(20)
      expect(wallet.address.length).toBeLessThanOrEqual(40)
    })

    it('generates the same address from the same private key', () => {
      const wallet1 = new Wallet()
      const wallet2 = new Wallet(wallet1.privateKey)

      expect(wallet2.address).toBe(wallet1.address)
    })
  })

  describe('signing and verification', () => {
    it('signs and verifies data', () => {
      const wallet = new Wallet()
      const data = 'transaction data'

      const signature = wallet.sign(data)
      const isValid = wallet.verify(data, signature)

      expect(signature).toBeTruthy()
      expect(isValid).toBe(true)
    })

    it('rejects a signature after the data changes', () => {
      const wallet = new Wallet()
      const data = 'original data'

      const signature = wallet.sign(data)
      const isValid = wallet.verify('modified data', signature)

      expect(isValid).toBe(false)
    })

    it('signs a transaction object', () => {
      const wallet = new Wallet()
      const transaction = {
        from: wallet.address,
        to: 'recipient address',
        amount: 50,
      }

      const txData = JSON.stringify(transaction)
      const signature = wallet.sign(txData)
      const isValid = wallet.verify(txData, signature)

      expect(isValid).toBe(true)
    })

    it('supports signature verification by another participant', () => {
      // Alice creates a wallet and signs a transaction
      const alice = new Wallet()
      const bob = new Wallet()

      // Build a transaction that includes the public key
      const transaction = {
        from: alice.address,
        to: bob.address,
        amount: 50,
        publicKey: alice.publicKey, // Include the sender's public key
      }
      const txData = JSON.stringify(transaction)

      // Alice signs the transaction
      const signature = alice.sign(txData)

      // Bob or a miner reads the public key and verifies the signature
      // This demonstrates the core verification relationship
      const {Signature} = require('../../crypto/signature')
      const publicKeyFromTx = transaction.publicKey // Read it from the transaction
      const isValid = Signature.verify(txData, signature, publicKeyFromTx)

      expect(isValid).toBe(true)
    })

    it('rejects verification with the wrong public key', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      // Alice creates a transaction
      const transaction = {
        data: 'transaction data',
        publicKey: alice.publicKey,
      }
      const txData = JSON.stringify(transaction)
      const signature = alice.sign(txData)

      // Replace the transaction public key with Bob's
      const tamperedTransaction = {
        ...transaction,
        publicKey: bob.publicKey, // Tamper with the public key
      }

      // Alice's signature should fail verification with the tampered key
      const {Signature} = require('../../crypto/signature')
      const isValid = Signature.verify(
        txData,
        signature,
        tamperedTransaction.publicKey
      )

      expect(isValid).toBe(false)
    })

    it('demonstrates a complete signing and verification flow', () => {
      // Create three participants
      const alice = new Wallet()
      const bob = new Wallet()
      const miner = new Wallet()

      // Alice creates a transaction that pays Bob
      const transaction = {
        inputs: [
          {
            txId: 'prev_tx_id',
            outputIndex: 0,
            publicKey: alice.publicKey, // Include the public key
            signature: '', // Start with an empty signature
          },
        ],
        outputs: [
          {
            amount: 50,
            address: bob.address,
          },
        ],
        timestamp: Date.now(),
      }

      const txData = JSON.stringify(transaction)
      const signature = alice.sign(txData)

      // Add the signature to the transaction
      transaction.inputs[0].signature = signature

      // The miner reads the input public key and verifies the signature
      const {Signature} = require('../../crypto/signature')
      const publicKeyFromInput = transaction.inputs[0].publicKey // Read it from the transaction
      const isValidForMiner = Signature.verify(
        txData,
        signature,
        publicKeyFromInput
      )

      // Bob can also read the public key and verify the signature
      const publicKeyForBob = transaction.inputs[0].publicKey // Read it from the transaction
      const isValidForBob = Signature.verify(txData, signature, publicKeyForBob)

      expect(isValidForMiner).toBe(true)
      expect(isValidForBob).toBe(true)

      // Derive the address as an additional ownership check
      // A real validation flow must also confirm ownership of the referenced UTXO
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')
      const sha256Hash = Hash.sha256(publicKeyFromInput)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // The derived address should match Alice's address
      expect(addressFromPublicKey).toBe(alice.address)
    })

    it('prevents one wallet from forging another wallet\'s transaction', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')

      // Bob attempts to forge a transaction spending Alice's funds

      // Attempt 1: Bob uses Alice's public key but signs with his own private key
      const transaction1 = {
        from: alice.address,
        to: bob.address,
        amount: 100,
        publicKey: alice.publicKey, // Use Alice's public key
      }
      const txData1 = JSON.stringify(transaction1)
      const bobSignature = bob.sign(txData1) // Bob signs with his private key

      // Verification fails because the signature and public key do not match
      const isValid1 = Signature.verify(
        txData1,
        bobSignature,
        transaction1.publicKey
      )
      expect(isValid1).toBe(false) // Bob's signature cannot be verified with Alice's public key

      // Attempt 2: Bob uses his public key but claims to spend from Alice's address
      const transaction2 = {
        from: alice.address, // Claim to send from Alice
        to: bob.address,
        amount: 100,
        publicKey: bob.publicKey, // Use Bob's public key
      }
      const txData2 = JSON.stringify(transaction2)
      const bobSignature2 = bob.sign(txData2) // Bob signs with his private key

      // Signature verification succeeds, but address verification fails
      const isSignatureValid = Signature.verify(
        txData2,
        bobSignature2,
        transaction2.publicKey
      )
      expect(isSignatureValid).toBe(true) // The signature itself is valid

      // The address derived from the public key is not Alice's
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')
      const sha256Hash = Hash.sha256(transaction2.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      expect(addressFromPublicKey).not.toBe(alice.address) // The addresses do not match
      expect(addressFromPublicKey).toBe(bob.address) // It is Bob's address

      // The system rejects the transaction because:
      // 1. It claims to spend from Alice's address
      // 2. The public key maps to Bob's address
      // 3. Bob therefore cannot spend Alice's UTXO
    })

    it('requires the private key owner to create a valid transaction', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // Alice creates a valid transaction
      const validTransaction = {
        from: alice.address,
        to: bob.address,
        amount: 50,
        publicKey: alice.publicKey,
      }
      const txData = JSON.stringify(validTransaction)
      const aliceSignature = alice.sign(txData)

      // Verify the signature
      const isSignatureValid = Signature.verify(
        txData,
        aliceSignature,
        validTransaction.publicKey
      )
      expect(isSignatureValid).toBe(true)

      // Verify the address derived from the public key
      const sha256Hash = Hash.sha256(validTransaction.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)
      expect(addressFromPublicKey).toBe(alice.address)

      // Both checks must pass for the transaction to be valid:
      // ✓ The signature proves control of the private key
      // ✓ The address match proves authority to spend the UTXO
      const isTransactionValid =
        isSignatureValid && addressFromPublicKey === validTransaction.from

      expect(isTransactionValid).toBe(true)
    })

    it('shows why Bob cannot spend Alice\'s UTXO with his own public key', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // Alice owns a UTXO
      const aliceUTXO = {
        txId: 'utxo_123',
        outputIndex: 0,
        amount: 100,
        ownerAddress: alice.address, // This UTXO belongs to Alice
      }

      // Bob creates a transaction that attempts to spend it
      const bobFakeTransaction = {
        inputs: [
          {
            txId: aliceUTXO.txId, // Reference Alice's UTXO
            outputIndex: aliceUTXO.outputIndex,
            publicKey: bob.publicKey, // Bob supplies his public key
          },
        ],
        outputs: [
          {
            amount: 100,
            address: bob.address, // Pay himself
          },
        ],
      }

      const txData = JSON.stringify(bobFakeTransaction)
      const bobSignature = bob.sign(txData) // Bob signs with his private key

      // === Verification process ===

      // Step 1: Verify the signature, which succeeds
      const publicKeyFromTx = bobFakeTransaction.inputs[0].publicKey
      const isSignatureValid = Signature.verify(
        txData,
        bobSignature,
        publicKeyFromTx
      )
      expect(isSignatureValid).toBe(true) // ✓ The signature is valid

      // Step 2: Verify spending authority, which fails
      // Derive the address from the transaction public key
      const sha256Hash = Hash.sha256(publicKeyFromTx)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // Compare the derived address with the UTXO owner address
      console.log('Address derived from public key:', addressFromPublicKey)
      console.log('UTXO owner address:', aliceUTXO.ownerAddress)

      expect(addressFromPublicKey).toBe(bob.address) // It is Bob's address
      expect(addressFromPublicKey).not.toBe(aliceUTXO.ownerAddress) // It is not Alice's address

      // The authority check fails
      const hasPermission = addressFromPublicKey === aliceUTXO.ownerAddress
      expect(hasPermission).toBe(false) // ✗ Bob lacks permission

      // Conclusion:
      // Bob can:
      // ✓ Include his public key in the transaction
      // ✓ Produce a valid signature with his private key
      //
      // But he cannot:
      // ✗ Spend Alice's UTXO
      //
      // Because:
      // Bob's public key → Bob's address
      // Bob's address ≠ Alice's address, which owns the UTXO
      // → The system rejects the transaction
    })

    it('allows Alice to spend her own UTXO', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // Alice owns a UTXO
      const aliceUTXO = {
        txId: 'utxo_123',
        outputIndex: 0,
        amount: 100,
        ownerAddress: alice.address, // Belongs to Alice
      }

      // Alice creates a transaction
      const aliceTransaction = {
        inputs: [
          {
            txId: aliceUTXO.txId,
            outputIndex: aliceUTXO.outputIndex,
            publicKey: alice.publicKey, // Alice supplies her public key
          },
        ],
        outputs: [
          {
            amount: 50,
            address: bob.address,
          },
          {
            amount: 50,
            address: alice.address, // Return change
          },
        ],
      }

      const txData = JSON.stringify(aliceTransaction)
      const aliceSignature = alice.sign(txData)

      // === Verification process ===

      // Step 1: Verify the signature
      const publicKeyFromTx = aliceTransaction.inputs[0].publicKey
      const isSignatureValid = Signature.verify(
        txData,
        aliceSignature,
        publicKeyFromTx
      )
      expect(isSignatureValid).toBe(true) // ✓

      // Step 2: Verify spending authority
      const sha256Hash = Hash.sha256(publicKeyFromTx)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      expect(addressFromPublicKey).toBe(alice.address) // It is Alice's address
      expect(addressFromPublicKey).toBe(aliceUTXO.ownerAddress) // It matches the UTXO owner

      // The authority check succeeds
      const hasPermission = addressFromPublicKey === aliceUTXO.ownerAddress
      expect(hasPermission).toBe(true) // ✓ Alice has permission

      // The transaction is valid
      const isTransactionValid = isSignatureValid && hasPermission
      expect(isTransactionValid).toBe(true)
    })
  })

  describe('export', () => {
    it('exports wallet data', () => {
      const wallet = new Wallet()
      const exported = wallet.export()

      expect(exported).toHaveProperty('privateKey')
      expect(exported).toHaveProperty('publicKey')
      expect(exported).toHaveProperty('address')
      expect(exported.privateKey).toBe(wallet.privateKey)
      expect(exported.publicKey).toBe(wallet.publicKey)
      expect(exported.address).toBe(wallet.address)
    })

    it('restores a wallet from the exported private key', () => {
      const wallet1 = new Wallet()
      const exported = wallet1.export()

      const wallet2 = Wallet.fromPrivateKey(exported.privateKey)

      expect(wallet2.address).toBe(wallet1.address)
      expect(wallet2.publicKey).toBe(wallet1.publicKey)
    })
  })

  describe('isValidAddress', () => {
    it('accepts a valid address', () => {
      const wallet = new Wallet()

      const isValid = Wallet.isValidAddress(wallet.address)

      expect(isValid).toBe(true)
    })

    it('rejects an empty string', () => {
      expect(Wallet.isValidAddress('')).toBe(false)
    })

    it('rejects an address that is too short', () => {
      expect(Wallet.isValidAddress('1234')).toBe(false)
    })

    it('rejects an address containing invalid characters', () => {
      // Include characters excluded from Base58: 0, O, I, and l
      expect(Wallet.isValidAddress('0OIl' + 'a'.repeat(30))).toBe(false)
    })

    it('rejects an address that is too long', () => {
      const longAddress = '1' + 'a'.repeat(50)
      expect(Wallet.isValidAddress(longAddress)).toBe(false)
    })
  })

  describe('toString', () => {
    it('returns a readable string representation', () => {
      const wallet = new Wallet()
      const str = wallet.toString()

      expect(str).toContain('Wallet')
      expect(str).toContain(wallet.address.substring(0, 10))
    })
  })

  describe('edge cases', () => {
    it('signs an empty string', () => {
      const wallet = new Wallet()

      const signature = wallet.sign('')
      const isValid = wallet.verify('', signature)

      expect(isValid).toBe(true)
    })

    it('handles long data', () => {
      const wallet = new Wallet()
      const longData = 'x'.repeat(10000)

      const signature = wallet.sign(longData)
      const isValid = wallet.verify(longData, signature)

      expect(isValid).toBe(true)
    })
  })
})
