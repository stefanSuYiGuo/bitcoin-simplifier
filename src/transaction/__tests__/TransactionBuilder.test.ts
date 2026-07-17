import {TransactionBuilder} from '../TransactionBuilder'
import {UTXOSet} from '../UTXO'
import {TxOutput} from '../TxOutput'
import {Wallet} from '../../wallet/Wallet'
import {TransactionSigner} from '../TransactionSigner'
import {Transaction} from '../Transaction'

describe('TransactionBuilder', () => {
  let utxoSet: UTXOSet
  let aliceWallet: Wallet
  let bobWallet: Wallet

  beforeEach(() => {
    utxoSet = new UTXOSet()
    aliceWallet = new Wallet()
    bobWallet = new Wallet()

    // Add several UTXOs for Alice
    utxoSet.add('tx1', 0, new TxOutput(100, aliceWallet.address))
    utxoSet.add('tx2', 0, new TxOutput(50, aliceWallet.address))
    utxoSet.add('tx3', 0, new TxOutput(25, aliceWallet.address))

    // Add a UTXO for Bob
    utxoSet.add('tx4', 0, new TxOutput(30, bobWallet.address))
  })

  describe('basic transaction building', () => {
    it('builds a simple transfer', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      expect(tx.inputs.length).toBeGreaterThan(0)
      expect(tx.outputs.length).toBeGreaterThanOrEqual(1)

      // Check the recipient output
      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput).toBeDefined()
      expect(bobOutput!.amount).toBe(40)
    })

    it('calculates change automatically', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // Alice has a balance of 100 + 50 + 25 = 175
      // Paying Bob 40 should produce change
      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )
      expect(changeOutput).toBeDefined()
    })

    it('selects enough UTXOs', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 120).build()

      // A payment of 120 should select the 100 and 50 UTXOs
      expect(tx.inputs.length).toBeGreaterThanOrEqual(2)
    })

    it('supports multiple recipients', () => {
      const charlie = new Wallet()

      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(charlie.address, 20)
        .build()

      expect(tx.outputs.length).toBeGreaterThanOrEqual(2)

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(30)

      const charlieOutput = tx.outputs.find(
        (o) => o.address === charlie.address
      )
      expect(charlieOutput!.amount).toBe(20)
    })
  })

  describe('transaction signing', () => {
    it('builds and signs a transaction', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .buildAndSign()

      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[0].publicKey).toBe(aliceWallet.publicKey)
    })

    it('produces a verifiable signed transaction', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .buildAndSign()

      const utxoMap = new Map<string, {amount: number; address: string}>()
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          utxoMap.set(`${input.txId}:${input.outputIndex}`, {
            amount: utxo.amount,
            address: utxo.address,
          })
        }
      }

      const isValid = TransactionSigner.verifyTransaction(tx, utxoMap)
      expect(isValid).toBe(true)
    })
  })

  describe('UTXO selection strategy', () => {
    it('prioritizes larger UTXOs with a greedy strategy', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // Select the largest UTXO, which is worth 100
      const hasLargestUTXO = tx.inputs.some((input) => {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        return utxo && utxo.amount === 100
      })

      expect(hasLargestUTXO).toBe(true)
    })

    it('selects the fewest UTXOs needed', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // One 100 or 50 UTXO can cover 40, so only one should be selected
      expect(tx.inputs.length).toBe(1)
    })
  })

  describe('change handling', () => {
    it('does not create a change output for an exact payment', () => {
      // Create an exact-payment scenario
      const exactUtxoSet = new UTXOSet()
      exactUtxoSet.add('tx1', 0, new TxOutput(50, aliceWallet.address))

      const builder = new TransactionBuilder(exactUtxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 50).build()

      // The transaction should contain only Bob's output and no change
      expect(tx.outputs.length).toBe(1)
      expect(tx.outputs[0].address).toBe(bobWallet.address)
    })

    it('supports a custom change address', () => {
      const changeAddress = new Wallet().address

      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .withChangeAddress(changeAddress)
        .build()

      const changeOutput = tx.outputs.find((o) => o.address === changeAddress)
      expect(changeOutput).toBeDefined()
    })

    it('uses the sender address as the default change address', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // Change should be sent to Alice's address
      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )
      expect(changeOutput).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('rejects a transaction without a sender', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.to(bobWallet.address, 40).build()
      }).toThrow('A sender wallet is required')
    })

    it('rejects a transaction without recipients', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).build()
      }).toThrow('At least one recipient is required')
    })

    it('rejects a transaction with insufficient funds', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, 1000).build()
      }).toThrow(/Insufficient balance/)
    })

    it('rejects zero and negative transfer amounts', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, 0)
      }).toThrow('Transfer amount must be greater than 0')

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, -10)
      }).toThrow('Transfer amount must be greater than 0')
    })

    it('rejects a sender without UTXOs', () => {
      const emptyWallet = new Wallet()
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(emptyWallet).to(bobWallet.address, 10).build()
      }).toThrow(/No UTXOs available/)
    })
  })

  describe('static methods', () => {
    it('creates a simple transfer with the static helper', () => {
      const tx = TransactionBuilder.createSimpleTransfer(
        aliceWallet,
        bobWallet.address,
        40,
        utxoSet
      )

      expect(tx.inputs.length).toBeGreaterThan(0)
      expect(tx.outputs.length).toBeGreaterThanOrEqual(1)

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput).toBeDefined()
      expect(bobOutput!.amount).toBe(40)

      // The transaction should already be signed
      expect(tx.inputs[0].isSigned()).toBe(true)
    })
  })

  describe('method chaining', () => {
    it('builds a transaction through chained calls', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(bobWallet.address, 20)
        .withChangeAddress(aliceWallet.address)
        .buildAndSign()

      expect(tx).toBeInstanceOf(Transaction)
      expect(tx.inputs[0].isSigned()).toBe(true)
    })
  })

  describe('practical scenarios', () => {
    it('scenario 1: Alice sends 50 BTC to Bob', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 50)
        .buildAndSign()

      // Verify the transaction
      const utxoMap = new Map<string, {amount: number; address: string}>()
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          utxoMap.set(`${input.txId}:${input.outputIndex}`, {
            amount: utxo.amount,
            address: utxo.address,
          })
        }
      }

      expect(TransactionSigner.verifyTransaction(tx, utxoMap)).toBe(true)

      // Check the amount
      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(50)
    })

    it('scenario 2: Alice sends funds to multiple recipients', () => {
      const charlie = new Wallet()
      const david = new Wallet()

      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(charlie.address, 40)
        .to(david.address, 20)
        .buildAndSign()

      expect(tx.outputs.length).toBeGreaterThanOrEqual(3)

      const totalSent = [bobWallet.address, charlie.address, david.address]
        .map((addr) => tx.outputs.find((o) => o.address === addr)?.amount || 0)
        .reduce((sum, amount) => sum + amount, 0)

      expect(totalSent).toBe(90)
    })

    it('scenario 3: calculates the correct change amount', () => {
      // Alice has 100 + 50 + 25 = 175
      // Send 100 to Bob
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 100)
        .build()

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(100)

      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )

      // Calculate the actual input amount
      let inputAmount = 0
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          inputAmount += utxo.amount
        }
      }

      // Change should equal inputs minus the 100 output
      if (changeOutput) {
        expect(changeOutput.amount).toBe(inputAmount - 100)
      }
    })
  })

  describe('amount calculations', () => {
    it('balances total input and output amounts', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .build()

      // Calculate the total input amount
      let inputAmount = 0
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          inputAmount += utxo.amount
        }
      }

      // Calculate the total output amount
      const outputAmount = tx.outputs.reduce((sum, o) => sum + o.amount, 0)

      expect(inputAmount).toBe(outputAmount)
    })
  })
})
