import {Transaction, TxOutput} from '../transaction'
import {MerkleTree} from '../merkle'
import {Hash} from '../crypto'

/**
 * Block representation.
 * Contains the block header and transaction list.
 */
export class Block {
  // Block index (height)
  public index: number

  // Block header
  public previousHash: string // Previous block hash
  public timestamp: number // Block creation time
  public merkleRoot: string // Transaction Merkle root
  public difficulty: number // Mining difficulty
  public nonce: number // Proof-of-work nonce

  // Block body
  public transactions: Transaction[]

  // Cached block hash
  private _hash?: string

  constructor(
    index: number,
    previousHash: string,
    timestamp: number,
    transactions: Transaction[],
    difficulty: number = 1,
    nonce: number = 0
  ) {
    if (transactions.length === 0) {
      throw new Error('A block must contain at least one transaction (the coinbase transaction)')
    }

    this.index = index
    this.previousHash = previousHash
    this.timestamp = timestamp
    this.transactions = transactions
    this.difficulty = difficulty
    this.nonce = nonce

    // Calculate the Merkle root
    this.merkleRoot = this.calculateMerkleRoot()
  }

  /**
   * Calculate the Merkle root.
   */
  private calculateMerkleRoot(): string {
    const txIds = this.transactions.map((tx) => tx.id)
    const merkleTree = new MerkleTree(txIds)
    return merkleTree.getRoot()
  }

  /**
   * Calculate the block hash.
   */
  calculateHash(): string {
    const blockHeader = this.getHeaderString()
    return Hash.doubleSha256(blockHeader)
  }

  /**
   * Get the serialized block header.
   */
  private getHeaderString(): string {
    return JSON.stringify({
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      merkleRoot: this.merkleRoot,
      difficulty: this.difficulty,
      nonce: this.nonce,
    })
  }

  /**
   * Get the cached block hash.
   */
  get hash(): string {
    if (!this._hash) {
      this._hash = this.calculateHash()
    }
    return this._hash
  }

  /**
   * Set the nonce during mining.
   */
  setNonce(nonce: number): void {
    this.nonce = nonce
    this._hash = undefined // Clear the cache
  }

  /**
   * Check whether the block hash meets the difficulty target.
   */
  hasValidHash(): boolean {
    const prefix = '0'.repeat(this.difficulty)
    return this.hash.startsWith(prefix)
  }

  /**
   * Create the genesis block.
   */
  static createGenesisBlock(coinbaseTx: Transaction): Block {
    return new Block(
      0, // Index
      '0', // The genesis block has no previous block
      Date.now(),
      [coinbaseTx],
      1 // Initial difficulty
    )
  }

  /**
   * Get the block size in bytes.
   */
  getSize(): number {
    const blockData = {
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      merkleRoot: this.merkleRoot,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      transactions: this.transactions.map((tx) => tx.toJSON()),
      transactionCount: this.transactions.length,
    }
    return JSON.stringify(blockData).length
  }

  /**
   * Get the coinbase transaction from the block.
   */
  getCoinbaseTransaction(): Transaction | null {
    return this.transactions.find((tx) => tx.isCoinbase()) || null
  }

  /**
   * Calculate the block's total transaction fees.
   */
  getTotalFees(utxoSet: Map<string, TxOutput>): number {
    let totalFees = 0

    for (const tx of this.transactions) {
      if (tx.isCoinbase()) {
        continue
      }

      try {
        totalFees += tx.calculateFee(utxoSet)
      } catch (error) {
        // Skip inputs that reference a missing UTXO
      }
    }

    return totalFees
  }

  /**
   * Serialize the block to JSON.
   */
  toJSON(): object {
    return {
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      merkleRoot: this.merkleRoot,
      difficulty: this.difficulty,
      nonce: this.nonce,
      hash: this.hash,
      transactions: this.transactions.map((tx) => tx.toJSON()),
      transactionCount: this.transactions.length,
      size: this.getSize(),
    }
  }

  /**
   * Deserialize a block from JSON.
   */
  static fromJSON(data: any): Block {
    const transactions = data.transactions.map((txData: any) =>
      Transaction.fromJSON(txData)
    )

    const block = new Block(
      data.index,
      data.previousHash,
      data.timestamp,
      transactions,
      data.difficulty,
      data.nonce
    )

    return block
  }

  /**
   * Clone the block.
   */
  clone(): Block {
    const transactions = this.transactions.map((tx) => tx.clone())
    return new Block(
      this.index,
      this.previousHash,
      this.timestamp,
      transactions,
      this.difficulty,
      this.nonce
    )
  }

  /**
   * Convert the block to a debug string.
   */
  toString(): string {
    return `Block #${this.index} [${this.hash.substring(0, 10)}...] - ${
      this.transactions.length
    } txs`
  }
}
