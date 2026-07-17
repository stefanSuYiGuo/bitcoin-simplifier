import {Transaction} from './Transaction'
import {TxInput} from './TxInput'
import {TxOutput} from './TxOutput'
import {UTXOSet} from './UTXO'
import {Wallet} from '../wallet/Wallet'
import {TransactionSigner} from './TransactionSigner'

/**
 * Transaction builder.
 * Builds and signs transactions.
 */
export class TransactionBuilder {
  private utxoSet: UTXOSet
  private fromWallet?: Wallet
  private recipients: Array<{address: string; amount: number}> = []
  private feePerByte: number = 0
  private changeAddress?: string

  constructor(utxoSet: UTXOSet) {
    this.utxoSet = utxoSet
  }

  /**
   * Set the sender wallet.
   * @param wallet Sender wallet.
   */
  from(wallet: Wallet): TransactionBuilder {
    this.fromWallet = wallet
    this.changeAddress = wallet.address // Send change to the sender by default
    return this
  }

  /**
   * Add a recipient.
   * @param address Recipient address.
   * @param amount Transfer amount.
   */
  to(address: string, amount: number): TransactionBuilder {
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0')
    }
    this.recipients.push({address, amount})
    return this
  }

  /**
   * Set the transaction fee per byte.
   * @param feePerByte Transaction fee per byte.
   */
  withFee(feePerByte: number): TransactionBuilder {
    this.feePerByte = feePerByte
    return this
  }

  /**
   * Set the change address.
   * @param address Change address.
   */
  withChangeAddress(address: string): TransactionBuilder {
    this.changeAddress = address
    return this
  }

  /**
   * Build a transaction.
   * @returns Unsigned transaction.
   */
  build(): Transaction {
    if (!this.fromWallet) {
      throw new Error('A sender wallet is required')
    }

    if (this.recipients.length === 0) {
      throw new Error('At least one recipient is required')
    }

    // Calculate the total amount required
    const totalOutput = this.recipients.reduce(
      (sum, recipient) => sum + recipient.amount,
      0
    )

    // Get all UTXOs owned by the sender
    const senderUTXOs = this.utxoSet.getUTXOsByAddress(this.fromWallet.address)

    if (senderUTXOs.length === 0) {
      throw new Error(`Sender has no available UTXOs: ${this.fromWallet.address}`)
    }

    // Select UTXOs greedily from largest to smallest
    const selectedUTXOs = this.selectUTXOs(senderUTXOs, totalOutput)

    if (selectedUTXOs.length === 0) {
      const balance = this.utxoSet.getBalance(this.fromWallet.address)
      throw new Error(`Insufficient balance. Required: ${totalOutput}, available: ${balance}`)
    }

    // Calculate the total input amount
    const totalInput = selectedUTXOs.reduce(
      (sum, utxo) => sum + utxo.output.amount,
      0
    )

    // Build inputs
    const inputs = selectedUTXOs.map(
      (utxo) => new TxInput(utxo.txId, utxo.outputIndex)
    )

    // Build outputs
    const outputs = this.recipients.map(
      (recipient) => new TxOutput(recipient.amount, recipient.address)
    )

    // Calculate change
    const change = totalInput - totalOutput

    if (change < 0) {
      throw new Error('Input amount is less than output amount')
    }

    // Add a change output when needed
    if (change > 0) {
      const changeAddr = this.changeAddress || this.fromWallet.address
      outputs.push(new TxOutput(change, changeAddr))
    }

    // Create the transaction
    return new Transaction(inputs, outputs)
  }

  /**
   * Build and sign a transaction.
   * @returns Signed transaction.
   */
  buildAndSign(): Transaction {
    if (!this.fromWallet) {
      throw new Error('A sender wallet is required')
    }

    const transaction = this.build()
    return TransactionSigner.signTransaction(transaction, this.fromWallet)
  }

  /**
   * Select UTXOs using a greedy strategy.
   * Sorts by amount from largest to smallest until the target is met.
   */
  private selectUTXOs(
    utxos: Array<{txId: string; outputIndex: number; output: TxOutput}>,
    targetAmount: number
  ): Array<{txId: string; outputIndex: number; output: TxOutput}> {
    // Sort by amount from largest to smallest
    const sorted = [...utxos].sort((a, b) => b.output.amount - a.output.amount)

    const selected: Array<{
      txId: string
      outputIndex: number
      output: TxOutput
    }> = []
    let total = 0

    for (const utxo of sorted) {
      selected.push(utxo)
      total += utxo.output.amount

      // Stop when the target has been met
      if (total >= targetAmount) {
        break
      }
    }

    // Check whether the selected amount is sufficient
    if (total < targetAmount) {
      return []
    }

    return selected
  }

  /**
   * Estimate the transaction size in bytes.
   * This is a simplified estimate.
   */
  private estimateTransactionSize(
    inputCount: number,
    outputCount: number
  ): number {
    // Simplified estimate: about 150 bytes per input and 34 bytes per output
    const inputSize = inputCount * 150
    const outputSize = outputCount * 34
    const overhead = 10 // Transaction header overhead
    return inputSize + outputSize + overhead
  }

  /**
   * Create a simple transfer transaction.
   * @param fromWallet Sender wallet.
   * @param toAddress Recipient address.
   * @param amount Transfer amount.
   * @param utxoSet UTXO set.
   */
  static createSimpleTransfer(
    fromWallet: Wallet,
    toAddress: string,
    amount: number,
    utxoSet: UTXOSet
  ): Transaction {
    return new TransactionBuilder(utxoSet)
      .from(fromWallet)
      .to(toAddress, amount)
      .buildAndSign()
  }
}
