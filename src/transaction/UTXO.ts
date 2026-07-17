import { TxOutput } from './TxOutput'

/**
 * UTXO set manager.
 * Tracks all unspent transaction outputs.
 */
export class UTXOSet {
  // Store UTXOs in a map keyed by txId:outputIndex
  private utxos: Map<string, TxOutput>

  constructor() {
    this.utxos = new Map()
  }

  /**
   * Adds a UTXO.
   * @param txId Transaction ID
   * @param outputIndex Output index
   * @param output Transaction output
   */
  add(txId: string, outputIndex: number, output: TxOutput): void {
    const key = this.makeKey(txId, outputIndex)
    this.utxos.set(key, output)
  }

  /**
   * Removes a UTXO after it is spent.
   * @param txId Transaction ID
   * @param outputIndex Output index
   * @returns Whether the UTXO was removed
   */
  remove(txId: string, outputIndex: number): boolean {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.delete(key)
  }

  /**
   * Returns a UTXO.
   * @param txId Transaction ID
   * @param outputIndex Output index
   * @returns The UTXO, or undefined when it does not exist
   */
  get(txId: string, outputIndex: number): TxOutput | undefined {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.get(key)
  }

  /**
   * Checks whether a UTXO exists.
   * @param txId Transaction ID
   * @param outputIndex Output index
   */
  has(txId: string, outputIndex: number): boolean {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.has(key)
  }

  /**
   * Returns every UTXO owned by an address.
   * @param address Owner address
   * @returns UTXOs with their transaction IDs and output indexes
   */
  getUTXOsByAddress(address: string): Array<{
    txId: string
    outputIndex: number
    output: TxOutput
  }> {
    const result: Array<{
      txId: string
      outputIndex: number
      output: TxOutput
    }> = []

    for (const [key, output] of this.utxos.entries()) {
      if (output.address === address) {
        const [txId, outputIndex] = this.parseKey(key)
        result.push({
          txId,
          outputIndex,
          output
        })
      }
    }

    return result
  }

  /**
   * Calculates the balance of an address.
   * @param address Owner address
   * @returns Total unspent balance
   */
  getBalance(address: string): number {
    let balance = 0

    for (const output of this.utxos.values()) {
      if (output.address === address) {
        balance += output.amount
      }
    }

    return balance
  }

  /**
   * Returns a copy of all UTXOs.
   */
  getAll(): Map<string, TxOutput> {
    return new Map(this.utxos)
  }

  /**
   * Returns the number of UTXOs.
   */
  size(): number {
    return this.utxos.size
  }

  /**
   * Removes every UTXO.
   */
  clear(): void {
    this.utxos.clear()
  }

  /**
   * Creates a copy of the UTXO set.
   */
  clone(): UTXOSet {
    const newSet = new UTXOSet()
    newSet.utxos = new Map(this.utxos)
    return newSet
  }

  /**
   * Builds a UTXO map key.
   * @param txId Transaction ID
   * @param outputIndex Output index
   */
  private makeKey(txId: string, outputIndex: number): string {
    return `${txId}:${outputIndex}`
  }

  /**
   * Parses a UTXO map key.
   * @param key UTXO map key
   * @returns [txId, outputIndex]
   */
  private parseKey(key: string): [string, number] {
    const parts = key.split(':')
    return [parts[0], parseInt(parts[1], 10)]
  }

  /**
   * Exports the UTXO set as JSON-compatible data.
   */
  toJSON(): Array<{
    txId: string
    outputIndex: number
    output: { amount: number; address: string }
  }> {
    const result: Array<{
      txId: string
      outputIndex: number
      output: { amount: number; address: string }
    }> = []

    for (const [key, output] of this.utxos.entries()) {
      const [txId, outputIndex] = this.parseKey(key)
      result.push({
        txId,
        outputIndex,
        output: output.toJSON()
      })
    }

    return result
  }

  /**
   * Creates a UTXO set from JSON-compatible data.
   */
  static fromJSON(json: Array<{
    txId: string
    outputIndex: number
    output: { amount: number; address: string }
  }>): UTXOSet {
    const set = new UTXOSet()

    for (const item of json) {
      const output = TxOutput.fromJSON(item.output)
      set.add(item.txId, item.outputIndex, output)
    }

    return set
  }
}

