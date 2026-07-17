import {Block} from './Block'
import {Transaction, TxOutput, UTXOSet} from '../transaction'
import {ProofOfWork} from './ProofOfWork'

/**
 * Blockchain configuration.
 */
export interface BlockchainConfig {
  targetBlockTime: number // Target block time in seconds
  difficultyAdjustmentInterval: number // Difficulty adjustment interval in blocks
  initialDifficulty: number // Initial difficulty
  blockReward: number // Block reward
}

/**
 * Blockchain implementation.
 * Manages the chain, UTXO set, and difficulty adjustments.
 */
export class Blockchain {
  private chain: Block[] = []
  private utxoSet: UTXOSet
  private config: BlockchainConfig

  constructor(config?: Partial<BlockchainConfig>) {
    this.config = {
      targetBlockTime: 10, // 10 seconds
      difficultyAdjustmentInterval: 10, // Adjust every 10 blocks
      initialDifficulty: 1,
      blockReward: 50,
      ...config,
    }

    this.utxoSet = new UTXOSet()
  }

  /**
   * Initialize the chain with a genesis block.
   */
  initializeWithGenesisBlock(genesisBlock: Block): void {
    if (this.chain.length > 0) {
      throw new Error('Blockchain is already initialized')
    }

    if (genesisBlock.index !== 0) {
      throw new Error('Genesis block index must be 0')
    }

    this.chain.push(genesisBlock)
    this.updateUTXOSet(genesisBlock)
  }

  /**
   * Add a new block.
   */
  addBlock(block: Block): boolean {
    // Validate the block
    if (!this.isValidNewBlock(block, this.getLatestBlock())) {
      return false
    }

    // Add the block
    this.chain.push(block)

    // Update the UTXO set
    this.updateUTXOSet(block)

    return true
  }

  /**
   * Validate a new block against its predecessor.
   */
  private isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
    // Check the index
    if (newBlock.index !== previousBlock.index + 1) {
      console.error('Invalid block index')
      return false
    }

    // Check the previous block hash
    if (newBlock.previousHash !== previousBlock.hash) {
      console.error('Previous block hash does not match')
      return false
    }

    // Check the proof of work
    if (!ProofOfWork.verify(newBlock)) {
      console.error('Invalid proof of work')
      return false
    }

    // Check the timestamp
    if (newBlock.timestamp <= previousBlock.timestamp) {
      console.error('Invalid block timestamp')
      return false
    }

    // Validate transactions
    for (const tx of newBlock.transactions) {
      // Skip UTXO validation for coinbase transactions
      if (tx.isCoinbase()) {
        continue
      }

      // Validate transaction signatures and UTXOs
      if (!this.isValidTransaction(tx)) {
        console.error(`Invalid transaction: ${tx.id}`)
        return false
      }
    }

    return true
  }

  /**
   * Validate a transaction.
   */
  private isValidTransaction(tx: Transaction): boolean {
    // Check that the UTXO for every input exists
    for (const input of tx.inputs) {
      if (!this.utxoSet.has(input.txId, input.outputIndex)) {
        return false
      }
    }

    return true
  }

  /**
   * Update the UTXO set for a block.
   */
  private updateUTXOSet(block: Block): void {
    for (const tx of block.transactions) {
      // Remove spent UTXOs
      if (!tx.isCoinbase()) {
        for (const input of tx.inputs) {
          this.utxoSet.remove(input.txId, input.outputIndex)
        }
      }

      // Add new UTXOs
      tx.outputs.forEach((output, index) => {
        this.utxoSet.add(tx.id, index, output)
      })
    }
  }

  /**
   * Calculate the difficulty for the next block.
   */
  calculateNextDifficulty(): number {
    const latestBlock = this.getLatestBlock()

    // Keep the current difficulty until the next adjustment interval
    if (
      (latestBlock.index + 1) % this.config.difficultyAdjustmentInterval !==
      0
    ) {
      return latestBlock.difficulty
    }

    // Get the first block in the previous adjustment period
    const adjustmentBlock =
      this.chain[this.chain.length - this.config.difficultyAdjustmentInterval]

    // Calculate the actual elapsed time
    const actualTime =
      (latestBlock.timestamp - adjustmentBlock.timestamp) / 1000 // Seconds

    // Calculate the expected elapsed time
    const expectedTime =
      this.config.targetBlockTime * this.config.difficultyAdjustmentInterval

    // Calculate the difficulty adjustment ratio
    const ratio = actualTime / expectedTime

    // Increase difficulty if blocks were mined more than twice as fast as expected
    if (ratio < 0.5) {
      return latestBlock.difficulty + 1
    }

    // Decrease difficulty if blocks were mined more than twice as slowly as expected
    if (ratio > 2) {
      return Math.max(1, latestBlock.difficulty - 1)
    }

    // Otherwise, keep the current difficulty
    return latestBlock.difficulty
  }

  /**
   * Get the latest block.
   */
  getLatestBlock(): Block {
    if (this.chain.length === 0) {
      throw new Error('Blockchain is empty')
    }
    return this.chain[this.chain.length - 1]
  }

  /**
   * Get a block by height.
   */
  getBlockByIndex(index: number): Block | null {
    return this.chain.find((block) => block.index === index) || null
  }

  /**
   * Get a block by hash.
   */
  getBlockByHash(hash: string): Block | null {
    return this.chain.find((block) => block.hash === hash) || null
  }

  /**
   * Get the blockchain length.
   */
  getLength(): number {
    return this.chain.length
  }

  /**
   * Get a copy of the complete blockchain.
   */
  getChain(): Block[] {
    return [...this.chain]
  }

  /**
   * Get the UTXO set.
   */
  getUTXOSet(): UTXOSet {
    return this.utxoSet
  }

  /**
   * Validate the entire blockchain.
   */
  isValidChain(): boolean {
    // Validate the genesis block
    if (this.chain.length === 0) {
      return false
    }

    const genesisBlock = this.chain[0]
    if (genesisBlock.index !== 0 || genesisBlock.previousHash !== '0') {
      return false
    }

    // Validate every block
    for (let i = 1; i < this.chain.length; i++) {
      if (!this.isValidNewBlock(this.chain[i], this.chain[i - 1])) {
        return false
      }
    }

    return true
  }

  /**
   * Replace the blockchain when a longer valid chain is received.
   */
  replaceChain(newChain: Block[]): boolean {
    if (newChain.length <= this.chain.length) {
      console.log('The new chain is not longer than the current chain; replacement rejected')
      return false
    }

    // Validate the new chain
    const tempBlockchain = new Blockchain(this.config)
    tempBlockchain.chain = newChain

    if (!tempBlockchain.isValidChain()) {
      console.error('The new chain is invalid; replacement rejected')
      return false
    }

    // Rebuild the UTXO set
    this.chain = newChain
    this.utxoSet = new UTXOSet()
    for (const block of this.chain) {
      this.updateUTXOSet(block)
    }

    console.log('Blockchain replaced')
    return true
  }

  /**
   * Get the block reward.
   */
  getBlockReward(): number {
    return this.config.blockReward
  }

  /**
   * Get the blockchain configuration.
   */
  getConfig(): BlockchainConfig {
    return {...this.config}
  }

  /**
   * Get blockchain statistics.
   */
  getStats(): object {
    const latestBlock = this.getLatestBlock()

    return {
      length: this.chain.length,
      latestBlock: {
        index: latestBlock.index,
        hash: latestBlock.hash,
        timestamp: latestBlock.timestamp,
        transactions: latestBlock.transactions.length,
      },
      difficulty: latestBlock.difficulty,
      utxoCount: this.utxoSet.size(),
      config: this.config,
    }
  }

  /**
   * Serialize the blockchain to JSON.
   */
  toJSON(): object {
    return {
      chain: this.chain.map((block) => block.toJSON()),
      config: this.config,
      stats: this.getStats(),
    }
  }
}
