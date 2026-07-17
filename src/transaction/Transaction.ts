import {TxInput} from './TxInput'
import {TxOutput} from './TxOutput'
import {Hash} from '../crypto/hash'

/**
 * Transaction implementation.
 * Represents a complete Bitcoin transaction.
 */
export class Transaction {
  id: string
  inputs: TxInput[]
  outputs: TxOutput[]
  timestamp: number

  /**
   * Create a transaction.
   * @param inputs Transaction inputs.
   * @param outputs Transaction outputs.
   * @param timestamp Optional timestamp that defaults to the current time.
   */
  constructor(
    inputs: TxInput[],
    outputs: TxOutput[],
    timestamp: number = Date.now()
  ) {
    if (inputs.length === 0) {
      throw new Error('A transaction must have at least one input')
    }
    if (outputs.length === 0) {
      throw new Error('A transaction must have at least one output')
    }

    this.inputs = inputs
    this.outputs = outputs
    this.timestamp = timestamp
    this.id = this.calculateId()
  }

  /**
   * Calculate the transaction ID.
   * The ID hashes the transaction content without signatures.
   */
  private calculateId(): string {
    const content = this.getContentForSigning()
    return Hash.sha256(content)
  }

  /**
   * Get the transaction content used for signing.
   * Signature fields are excluded because signatures cover the transaction content.
   */
  getContentForSigning(): string {
    const inputsForSigning = this.inputs.map((input) => ({
      txId: input.txId,
      outputIndex: input.outputIndex,
    }))

    const content = {
      inputs: inputsForSigning,
      outputs: this.outputs.map((output) => output.toJSON()),
      timestamp: this.timestamp,
    }

    return JSON.stringify(content)
  }

  /**
   * Get the total input amount.
   * Requires a UTXO set to look up the amount of each input.
   */
  getInputAmount(utxoSet: Map<string, TxOutput>): number {
    let total = 0
    for (const input of this.inputs) {
      const key = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(key)
      if (!utxo) {
        throw new Error(`UTXO not found: ${key}`)
      }
      total += utxo.amount
    }
    return total
  }

  /**
   * Get the total output amount.
   */
  getOutputAmount(): number {
    return this.outputs.reduce((sum, output) => sum + output.amount, 0)
  }

  /**
   * Calculate the transaction fee.
   * Fee = total inputs - total outputs.
   */
  calculateFee(utxoSet: Map<string, TxOutput>): number {
    const inputAmount = this.getInputAmount(utxoSet)
    const outputAmount = this.getOutputAmount()
    return inputAmount - outputAmount
  }

  /**
   * Validate the transaction's basic structure and amounts.
   * Signature verification is performed separately.
   */
  isValid(utxoSet: Map<string, TxOutput>): boolean {
    try {
      // Require at least one input and output
      if (this.inputs.length === 0 || this.outputs.length === 0) {
        return false
      }

      // Require every output amount to be positive
      for (const output of this.outputs) {
        if (output.amount <= 0) {
          return false
        }
      }

      // Require total inputs to cover total outputs
      const inputAmount = this.getInputAmount(utxoSet)
      const outputAmount = this.getOutputAmount()
      if (inputAmount < outputAmount) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check whether this is a coinbase transaction.
   * A coinbase transaction pays the miner and uses a special input transaction ID.
   */
  isCoinbase(): boolean {
    return (
      this.inputs.length === 1 &&
      this.inputs[0].txId ===
        '0000000000000000000000000000000000000000000000000000000000000000'
    )
  }

  /**
   * Convert the transaction to a JSON object.
   */
  toJSON(): {
    id: string
    inputs: any[]
    outputs: any[]
    timestamp: number
  } {
    return {
      id: this.id,
      inputs: this.inputs.map((input) => input.toJSON()),
      outputs: this.outputs.map((output) => output.toJSON()),
      timestamp: this.timestamp,
    }
  }

  /**
   * Create a transaction from a JSON object.
   */
  static fromJSON(json: {
    inputs: any[]
    outputs: any[]
    timestamp?: number
  }): Transaction {
    const inputs = json.inputs.map((i) => TxInput.fromJSON(i))
    const outputs = json.outputs.map((o) => TxOutput.fromJSON(o))
    const timestamp = json.timestamp || Date.now()

    return new Transaction(inputs, outputs, timestamp)
  }

  /**
   * Create a coinbase transaction.
   * @param minerAddress Miner address.
   * @param amount Reward amount.
   * @param blockHeight Block height used by the coinbase input.
   */
  static createCoinbase(
    minerAddress: string,
    amount: number,
    blockHeight: number = 0
  ): Transaction {
    // A coinbase input uses a special transaction ID
    const coinbaseInput = new TxInput(
      '0000000000000000000000000000000000000000000000000000000000000000',
      blockHeight,
      '',
      ''
    )

    const coinbaseOutput = new TxOutput(amount, minerAddress)

    return new Transaction([coinbaseInput], [coinbaseOutput])
  }

  /**
   * Clone the transaction.
   */
  clone(): Transaction {
    const inputs = this.inputs.map((input) => input.clone())
    const outputs = this.outputs.map((output) => output.clone())
    return new Transaction(inputs, outputs, this.timestamp)
  }

  /**
   * Convert the transaction to a debug string.
   */
  toString(): string {
    return `Transaction(
  id: ${this.id.substring(0, 16)}...,
  inputs: ${this.inputs.length},
  outputs: ${this.outputs.length},
  amount: ${this.getOutputAmount()}
)`
  }
}
