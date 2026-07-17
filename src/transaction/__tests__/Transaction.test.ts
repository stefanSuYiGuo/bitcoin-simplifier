import {Transaction} from '../Transaction'
import {TxInput} from '../TxInput'
import {TxOutput} from '../TxOutput'
import {TransactionSigner} from '../TransactionSigner'
import {Wallet} from '../../wallet/Wallet'

describe('Transaction', () => {
  describe('constructor', () => {
    it('creates a valid transaction', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.inputs).toHaveLength(1)
      expect(tx.outputs).toHaveLength(1)
      expect(tx.id).toBeDefined()
      expect(tx.timestamp).toBeDefined()
    })

    it('rejects a transaction without inputs', () => {
      const output = new TxOutput(50, 'receiver_address')
      expect(() => new Transaction([], [output])).toThrow(
        'Transaction must have at least one input'
      )
    })

    it('rejects a transaction without outputs', () => {
      const input = new TxInput('prev_tx_id', 0)
      expect(() => new Transaction([input], [])).toThrow(
        'Transaction must have at least one output'
      )
    })

    it('generates a unique ID for each transaction', () => {
      const input1 = new TxInput('prev_tx_id_1', 0)
      const output1 = new TxOutput(50, 'receiver_address')
      const tx1 = new Transaction([input1], [output1])

      const input2 = new TxInput('prev_tx_id_2', 0)
      const output2 = new TxOutput(50, 'receiver_address')
      const tx2 = new Transaction([input2], [output2])

      expect(tx1.id).not.toBe(tx2.id)
    })
  })

  describe('amount calculations', () => {
    it('calculates the total output amount', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output1 = new TxOutput(30, 'address1')
      const output2 = new TxOutput(20, 'address2')
      const tx = new Transaction([input], [output1, output2])

      expect(tx.getOutputAmount()).toBe(50)
    })

    it('calculates the total input amount', () => {
      const input1 = new TxInput('prev_tx_id_1', 0)
      const input2 = new TxInput('prev_tx_id_2', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input1, input2], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id_1:0', new TxOutput(30, 'sender_address'))
      utxoSet.set('prev_tx_id_2:0', new TxOutput(25, 'sender_address'))

      expect(tx.getInputAmount(utxoSet)).toBe(55)
    })

    it('calculates the mining fee', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.calculateFee(utxoSet)).toBe(5)
    })
  })

  describe('transaction validation', () => {
    it('accepts a valid transaction', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.isValid(utxoSet)).toBe(true)
    })

    it('rejects a transaction whose outputs exceed its inputs', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(55, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.isValid(utxoSet)).toBe(false)
    })

    it('rejects a negative output amount', () => {
      const input = new TxInput('prev_tx_id', 0)
      expect(() => new TxOutput(-10, 'receiver_address')).toThrow(
        'Output amount must be greater than 0'
      )
    })

    it('rejects a reference to a missing UTXO', () => {
      const input = new TxInput('non_existent_tx', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()

      expect(tx.isValid(utxoSet)).toBe(false)
    })
  })

  describe('coinbase transactions', () => {
    it('creates a coinbase transaction', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 1)

      expect(coinbase.isCoinbase()).toBe(true)
      expect(coinbase.inputs).toHaveLength(1)
      expect(coinbase.outputs).toHaveLength(1)
      expect(coinbase.outputs[0].amount).toBe(50)
      expect(coinbase.outputs[0].address).toBe('miner_address')
    })

    it('uses the special input transaction ID for a coinbase transaction', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50)

      expect(coinbase.inputs[0].txId).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000'
      )
    })

    it('does not identify a regular transaction as coinbase', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.isCoinbase()).toBe(false)
    })
  })

  describe('serialization and deserialization', () => {
    it('serializes to JSON', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output], 1234567890)

      const json = tx.toJSON()

      expect(json.id).toBe(tx.id)
      expect(json.inputs).toHaveLength(1)
      expect(json.outputs).toHaveLength(1)
      expect(json.timestamp).toBe(1234567890)
    })

    it('deserializes from JSON', () => {
      const json = {
        inputs: [
          {
            txId: 'prev_tx_id',
            outputIndex: 0,
            signature: 'signature',
            publicKey: 'publicKey',
          },
        ],
        outputs: [
          {
            amount: 50,
            address: 'receiver_address',
          },
        ],
        timestamp: 1234567890,
      }

      const tx = Transaction.fromJSON(json)

      expect(tx.inputs).toHaveLength(1)
      expect(tx.inputs[0].txId).toBe('prev_tx_id')
      expect(tx.outputs).toHaveLength(1)
      expect(tx.outputs[0].amount).toBe(50)
      expect(tx.timestamp).toBe(1234567890)
    })

    it('preserves transaction data across serialization', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const originalTx = new Transaction([input], [output])

      const json = originalTx.toJSON()
      const restoredTx = Transaction.fromJSON(json)

      expect(restoredTx.inputs[0].txId).toBe(originalTx.inputs[0].txId)
      expect(restoredTx.outputs[0].amount).toBe(originalTx.outputs[0].amount)
      expect(restoredTx.timestamp).toBe(originalTx.timestamp)
    })
  })

  describe('transaction signing and verification', () => {
    it('signs a transaction', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.inputs[0].isSigned()).toBe(false)

      TransactionSigner.signTransaction(tx, wallet)

      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[0].signature).toBeDefined()
      expect(tx.inputs[0].publicKey).toBe(wallet.publicKey)
    })

    it('verifies a signed transaction', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      // Prepare the UTXO set
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // Sign the transaction
      TransactionSigner.signTransaction(tx, wallet)

      // Verify the transaction
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(true)
    })

    it('rejects an unsigned transaction', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // Verify without signing
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })

    it('rejects a transaction with an invalid signature', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // Sign the transaction
      TransactionSigner.signTransaction(tx, wallet)

      // Tamper with the transaction content
      tx.outputs[0] = new TxOutput(100, 'attacker_address')

      // Verification should fail
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })

    it('rejects a transaction signed with the wrong public key', () => {
      const aliceWallet = new Wallet()
      const bobWallet = new Wallet()

      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, bobWallet.address)
      const tx = new Transaction([input], [output])

      // Alice owns this UTXO
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: aliceWallet.address,
      })

      // Bob attempts to sign with his own private key
      TransactionSigner.signTransaction(tx, bobWallet)

      // Verification should fail because the public key does not match the UTXO owner
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })
  })

  describe('transaction cloning', () => {
    it('clones a transaction', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const originalTx = new Transaction([input], [output])

      const clonedTx = originalTx.clone()

      expect(clonedTx.id).toBe(originalTx.id)
      expect(clonedTx.inputs[0].txId).toBe(originalTx.inputs[0].txId)
      expect(clonedTx.outputs[0].amount).toBe(originalTx.outputs[0].amount)

      // Changing the clone should not affect the original transaction
      clonedTx.inputs[0].signature = 'new_signature'
      expect(originalTx.inputs[0].signature).toBe('signature')
    })
  })

  describe('signing content', () => {
    it('returns transaction content without signature data', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const content = tx.getContentForSigning()
      const parsed = JSON.parse(content)

      // Signing content should exclude signatures and public keys
      expect(parsed.inputs[0].signature).toBeUndefined()
      expect(parsed.inputs[0].publicKey).toBeUndefined()

      // It should retain the core transaction data
      expect(parsed.inputs[0].txId).toBe('prev_tx_id')
      expect(parsed.outputs[0].amount).toBe(50)
    })
  })

  describe('toString', () => {
    it('returns a readable string representation', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const str = tx.toString()

      expect(str).toContain('Transaction')
      expect(str).toContain('inputs: 1')
      expect(str).toContain('outputs: 1')
      expect(str).toContain('amount: 50')
    })
  })

  describe('multi-party transaction signing', () => {
    it('supports signing different inputs with different wallets', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      // Create a transaction with multiple inputs
      // Alice has a 50 BTC UTXO
      // Bob has a 30 BTC UTXO
      // Together they send 75 BTC to Charlie
      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output1 = new TxOutput(75, charlie.address)
      const output2 = new TxOutput(5, alice.address) // Return change to Alice

      const tx = new Transaction([input1, input2], [output1, output2])

      // Prepare the UTXO set
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // Sign each input with a different wallet
      TransactionSigner.signTransactionWithWallets(tx, [alice, bob])

      // Confirm that each input has a distinct signature
      expect(tx.inputs[0].signature).toBeDefined()
      expect(tx.inputs[1].signature).toBeDefined()
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // Confirm that each input has a distinct public key
      expect(tx.inputs[0].publicKey).toBe(alice.publicKey)
      expect(tx.inputs[1].publicKey).toBe(bob.publicKey)

      // Verify the transaction
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)
    })

    it('supports signing with a wallet map', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, charlie.address)

      const tx = new Transaction([input1, input2], [output])

      // Prepare the UTXO set
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // Create the wallet map
      const walletMap = new Map<string, Wallet>()
      walletMap.set(alice.address, alice)
      walletMap.set(bob.address, bob)

      // Sign with the wallet map
      TransactionSigner.signTransactionWithWalletMap(tx, walletMap, utxoSet)

      // Confirm that the signatures differ
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // Verify the transaction
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)
    })

    it('supports signing one input at a time', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, charlie.address)

      const tx = new Transaction([input1, input2], [output])

      // Alice signs her input first
      const success1 = TransactionSigner.signInput(tx, 0, alice)
      expect(success1).toBe(true)
      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[1].isSigned()).toBe(false)

      // Bob then signs his input
      const success2 = TransactionSigner.signInput(tx, 1, bob)
      expect(success2).toBe(true)
      expect(tx.inputs[1].isSigned()).toBe(true)

      // The two signatures should differ
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)
      expect(tx.inputs[0].publicKey).toBe(alice.publicKey)
      expect(tx.inputs[1].publicKey).toBe(bob.publicKey)
    })

    it('rejects a mismatched wallet count in signTransactionWithWallets', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, 'charlie_address')

      const tx = new Transaction([input1, input2], [output])

      // Provide only one wallet for two inputs
      expect(() => {
        TransactionSigner.signTransactionWithWallets(tx, [alice])
      }).toThrow('Wallet count')
    })

    it('rejects a missing wallet in signTransactionWithWalletMap', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, 'charlie_address')

      const tx = new Transaction([input1, input2], [output])

      // Prepare the UTXO set
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // Provide Alice's wallet but omit Bob's
      const walletMap = new Map<string, Wallet>()
      walletMap.set(alice.address, alice)

      expect(() => {
        TransactionSigner.signTransactionWithWalletMap(tx, walletMap, utxoSet)
      }).toThrow('No wallet found for address')
    })

    it('supports Alice and Bob jointly purchasing an item', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const merchant = new Wallet()

      // Alice has 40 BTC and Bob has 35 BTC
      // They jointly purchase an item priced at 70 BTC
      const input1 = new TxInput('tx_alice_prev', 0)
      const input2 = new TxInput('tx_bob_prev', 0)
      const output1 = new TxOutput(70, merchant.address) // Pay the merchant
      const output2 = new TxOutput(5, alice.address) // Return change to Alice

      const tx = new Transaction([input1, input2], [output1, output2])

      // Prepare the UTXO set
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice_prev:0', {amount: 40, address: alice.address})
      utxoSet.set('tx_bob_prev:0', {amount: 35, address: bob.address})

      // Alice and Bob each sign their own input
      TransactionSigner.signInput(tx, 0, alice)
      TransactionSigner.signInput(tx, 1, bob)

      // Confirm that the signatures differ
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // Verify the complete transaction
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)

      // Verify the amounts
      expect(
        tx.getInputAmount(
          new Map([
            ['tx_alice_prev:0', new TxOutput(40, alice.address)],
            ['tx_bob_prev:0', new TxOutput(35, bob.address)],
          ] as any)
        )
      ).toBe(75)
      expect(tx.getOutputAmount()).toBe(75)
      expect(
        tx.calculateFee(
          new Map([
            ['tx_alice_prev:0', new TxOutput(40, alice.address)],
            ['tx_bob_prev:0', new TxOutput(35, bob.address)],
          ] as any)
        )
      ).toBe(0)
    })
  })
})
