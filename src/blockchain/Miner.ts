import {Block} from './Block'
import {Blockchain} from './Blockchain'
import {ProofOfWork, MiningResult} from './ProofOfWork'
import {Transaction, TxInput, TxOutput} from '../transaction'
import {Wallet} from '../wallet'

/**
 * 矿工类
 * 负责打包交易、创建区块、执行挖矿
 */
export class Miner {
  private wallet: Wallet
  private blockchain: Blockchain

  constructor(wallet: Wallet, blockchain: Blockchain) {
    this.wallet = wallet
    this.blockchain = blockchain
  }

  /**
   * 挖矿：创建并挖掘一个新区块
   */
  mineBlock(transactions: Transaction[]): {
    block: Block
    miningResult: MiningResult
  } {
    // 获取最新区块
    const latestBlock = this.blockchain.getLatestBlock()

    // 计算区块奖励和总手续费
    const blockReward = this.blockchain.getBlockReward()
    const totalFees = this.calculateTotalFees(transactions)
    const minerReward = blockReward + totalFees

    // 创建 Coinbase 交易
    const coinbaseTx = Transaction.createCoinbase(
      this.wallet.address,
      minerReward,
      latestBlock.index + 1
    )

    // 将 Coinbase 交易放在第一位
    const allTransactions = [coinbaseTx, ...transactions]

    // 计算下一个区块的难度
    const difficulty = this.blockchain.calculateNextDifficulty()

    // 创建新区块
    const newBlock = new Block(
      latestBlock.index + 1,
      latestBlock.hash,
      Date.now(),
      allTransactions,
      difficulty
    )

    // 执行工作量证明
    console.log(`开始挖矿区块 #${newBlock.index}，难度: ${difficulty}...`)
    const miningResult = ProofOfWork.mine(newBlock)
    console.log(
      `挖矿成功！哈希: ${miningResult.hash.substring(0, 20)}...，尝试次数: ${
        miningResult.attempts
      }，用时: ${miningResult.duration}ms`
    )

    return {
      block: newBlock,
      miningResult,
    }
  }

  /**
   * 挖掘空区块（仅包含 Coinbase 交易）
   */
  mineEmptyBlock(): {
    block: Block
    miningResult: MiningResult
  } {
    return this.mineBlock([])
  }

  /**
   * 选择交易进行打包
   * 按手续费从高到低排序
   */
  selectTransactions(
    candidateTransactions: Transaction[],
    maxTransactions: number = 100
  ): Transaction[] {
    const utxoSet = this.blockchain.getUTXOSet()

    // 过滤有效交易并计算手续费
    const txWithFees = candidateTransactions
      .filter((tx) => !tx.isCoinbase()) // 排除 Coinbase 交易
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

    // 按手续费降序排序
    txWithFees.sort((a, b) => b.fee - a.fee)

    // 取前 N 个交易
    return txWithFees.slice(0, maxTransactions).map((item) => item.tx)
  }

  /**
   * 计算交易总手续费
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
        // UTXO 不存在，跳过
      }
    }

    return totalFees
  }

  /**
   * 获取矿工钱包
   */
  getWallet(): Wallet {
    return this.wallet
  }

  /**
   * 获取矿工地址
   */
  getAddress(): string {
    return this.wallet.address
  }

  /**
   * 获取矿工在区块链上的余额
   */
  getBalance(): number {
    const utxoSet = this.blockchain.getUTXOSet()
    return utxoSet.getBalance(this.wallet.address)
  }

  /**
   * 估算挖矿时间
   */
  estimateMiningTime(): string {
    const latestBlock = this.blockchain.getLatestBlock()
    const difficulty = this.blockchain.calculateNextDifficulty()
    const attempts = ProofOfWork.estimateAttempts(difficulty)

    // 假设哈希率为 100,000 哈希/秒（仅供参考）
    const estimatedHashRate = 100000
    const estimatedSeconds = attempts / estimatedHashRate

    if (estimatedSeconds < 1) {
      return '< 1 秒'
    } else if (estimatedSeconds < 60) {
      return `~${Math.round(estimatedSeconds)} 秒`
    } else if (estimatedSeconds < 3600) {
      return `~${Math.round(estimatedSeconds / 60)} 分钟`
    } else {
      return `~${Math.round(estimatedSeconds / 3600)} 小时`
    }
  }

  /**
   * 获取矿工统计信息
   */
  getStats(): object {
    return {
      address: this.wallet.address,
      balance: this.getBalance(),
      publicKey: this.wallet.publicKey,
    }
  }
}
