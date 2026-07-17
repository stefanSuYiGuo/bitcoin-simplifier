import {Block} from './Block'
import {Blockchain} from './Blockchain'
import {ProofOfWork, MiningResult} from './ProofOfWork'
import {Transaction, TxInput, TxOutput} from '../transaction'
import {Wallet} from '../wallet'

/**
 * Miner implementation.
 * Packages transactions, creates blocks, and performs mining.
 */
export class Miner {
  private wallet: Wallet
  private blockchain: Blockchain

  constructor(wallet: Wallet, blockchain: Blockchain) {
    this.wallet = wallet
    this.blockchain = blockchain
  }

  /**
   * Create and mine a new block.
   */
  mineBlock(transactions: Transaction[]): {
    block: Block
    miningResult: MiningResult
  } {
    // Get the latest block
    const latestBlock = this.blockchain.getLatestBlock()

    // Calculate the block reward and total transaction fees
    const blockReward = this.blockchain.getBlockReward()
    const totalFees = this.calculateTotalFees(transactions)
    const minerReward = blockReward + totalFees

    // Create the coinbase transaction
    const coinbaseTx = Transaction.createCoinbase(
      this.wallet.address,
      minerReward,
      latestBlock.index + 1
    )

    // Place the coinbase transaction first
    const allTransactions = [coinbaseTx, ...transactions]

    // Calculate the next block's difficulty
    const difficulty = this.blockchain.calculateNextDifficulty()

    // Create the new block
    const newBlock = new Block(
      latestBlock.index + 1,
      latestBlock.hash,
      Date.now(),
      allTransactions,
      difficulty
    )

    // Perform proof of work
    console.log(`Mining block #${newBlock.index} at difficulty ${difficulty}...`)
    const miningResult = ProofOfWork.mine(newBlock)
    console.log(
      `Block mined! Hash: ${miningResult.hash.substring(0, 20)}..., attempts: ${
        miningResult.attempts
      }, duration: ${miningResult.duration}ms`
    )

    return {
      block: newBlock,
      miningResult,
    }
  }

  /**
   * Mine an empty block containing only a coinbase transaction.
   */
  mineEmptyBlock(): {
    block: Block
    miningResult: MiningResult
  } {
    return this.mineBlock([])
  }

  /**
   * Select transactions for inclusion in a block.
   * Sorts them by transaction fee in descending order.
   */
  selectTransactions(
    candidateTransactions: Transaction[],
    maxTransactions: number = 100
  ): Transaction[] {
    const utxoSet = this.blockchain.getUTXOSet()

    // Filter valid transactions and calculate their fees
    const txWithFees = candidateTransactions
      .filter((tx) => !tx.isCoinbase()) // Exclude coinbase transactions
      .map((tx) => {
        try {
          const fee = tx.calculateFee(utxoSet.getAll())
          return {tx, fee}
        } catch (error) {
          return null
        }
      })
      .filter((item) => item !== null) as Array<{
      tx: Transaction
      fee: number
    }>

    // Sort by fee in descending order
    txWithFees.sort((a, b) => b.fee - a.fee)

    // Take the first N transactions
    return txWithFees.slice(0, maxTransactions).map((item) => item.tx)
  }

  /**
   * Calculate total transaction fees.
   */
  private calculateTotalFees(transactions: Transaction[]): number {
    const utxoSet = this.blockchain.getUTXOSet()
    let totalFees = 0

    for (const tx of transactions) {
      if (tx.isCoinbase()) {
        continue
      }

      try {
        totalFees += tx.calculateFee(utxoSet.getAll())
      } catch (error) {
        // Skip inputs that reference a missing UTXO
      }
    }

    return totalFees
  }

  /**
   * Get the miner's wallet.
   */
  getWallet(): Wallet {
    return this.wallet
  }

  /**
   * Get the miner's address.
   */
  getAddress(): string {
    return this.wallet.address
  }

  /**
   * Get the miner's balance on the blockchain.
   */
  getBalance(): number {
    const utxoSet = this.blockchain.getUTXOSet()
    return utxoSet.getBalance(this.wallet.address)
  }

  /**
   * Estimate the mining time.
   */
  estimateMiningTime(): string {
    const latestBlock = this.blockchain.getLatestBlock()
    const difficulty = this.blockchain.calculateNextDifficulty()
    const attempts = ProofOfWork.estimateAttempts(difficulty)

    // Assume a reference hash rate of 100,000 hashes per second
    const estimatedHashRate = 100000
    const estimatedSeconds = attempts / estimatedHashRate

    if (estimatedSeconds < 1) {
      return '< 1 second'
    } else if (estimatedSeconds < 60) {
      return `~${Math.round(estimatedSeconds)} seconds`
    } else if (estimatedSeconds < 3600) {
      return `~${Math.round(estimatedSeconds / 60)} minutes`
    } else {
      return `~${Math.round(estimatedSeconds / 3600)} hours`
    }
  }

  /**
   * Get miner statistics.
   */
  getStats(): object {
    return {
      address: this.wallet.address,
      balance: this.getBalance(),
      publicKey: this.wallet.publicKey,
    }
  }
}
