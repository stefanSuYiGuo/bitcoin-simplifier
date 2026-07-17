import {Block} from './Block'
import {Transaction, TxOutput, UTXOSet} from '../transaction'
import {ProofOfWork} from './ProofOfWork'

/**
 * 区块链配置
 */
export interface BlockchainConfig {
  targetBlockTime: number // 目标出块时间（秒）
  difficultyAdjustmentInterval: number // 难度调整间隔（区块数）
  initialDifficulty: number // 初始难度
  blockReward: number // 区块奖励
}

/**
 * 区块链类
 * 管理整个区块链、UTXO 集合、难度调整
 */
export class Blockchain {
  private chain: Block[] = []
  private utxoSet: UTXOSet
  private config: BlockchainConfig

  constructor(config?: Partial<BlockchainConfig>) {
    this.config = {
      targetBlockTime: 10, // 10 秒
      difficultyAdjustmentInterval: 10, // 每 10 个区块调整一次
      initialDifficulty: 1,
      blockReward: 50,
      ...config,
    }

    this.utxoSet = new UTXOSet()
  }

  /**
   * 初始化创世区块
   */
  initializeWithGenesisBlock(genesisBlock: Block): void {
    if (this.chain.length > 0) {
      throw new Error('区块链已经初始化')
    }

    if (genesisBlock.index !== 0) {
      throw new Error('创世区块索引必须为 0')
    }

    this.chain.push(genesisBlock)
    this.updateUTXOSet(genesisBlock)
  }

  /**
   * 添加新区块
   */
  addBlock(block: Block): boolean {
    // 验证区块
    if (!this.isValidNewBlock(block, this.getLatestBlock())) {
      return false
    }

    // 添加区块
    this.chain.push(block)

    // 更新 UTXO 集合
    this.updateUTXOSet(block)

    return true
  }

  /**
   * 验证新区块是否有效
   */
  private isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
    // 检查索引
    if (newBlock.index !== previousBlock.index + 1) {
      console.error('区块索引无效')
      return false
    }

    // 检查前区块哈希
    if (newBlock.previousHash !== previousBlock.hash) {
      console.error('前区块哈希不匹配')
      return false
    }

    // 检查工作量证明
    if (!ProofOfWork.verify(newBlock)) {
      console.error('工作量证明无效')
      return false
    }

    // 检查时间戳
    if (newBlock.timestamp <= previousBlock.timestamp) {
      console.error('区块时间戳无效')
      return false
    }

    // 验证交易
    for (const tx of newBlock.transactions) {
      // Coinbase 交易跳过 UTXO 验证
      if (tx.isCoinbase()) {
        continue
      }

      // 验证交易签名和 UTXO
      if (!this.isValidTransaction(tx)) {
        console.error(`无效交易: ${tx.id}`)
        return false
      }
    }

    return true
  }

  /**
   * 验证交易是否有效
   */
  private isValidTransaction(tx: Transaction): boolean {
    // 检查所有输入的 UTXO 是否存在
    for (const input of tx.inputs) {
      if (!this.utxoSet.has(input.txId, input.outputIndex)) {
        return false
      }
    }

    return true
  }

  /**
   * 更新 UTXO 集合
   */
  private updateUTXOSet(block: Block): void {
    for (const tx of block.transactions) {
      // 移除花费的 UTXO
      if (!tx.isCoinbase()) {
        for (const input of tx.inputs) {
          this.utxoSet.remove(input.txId, input.outputIndex)
        }
      }

      // 添加新的 UTXO
      tx.outputs.forEach((output, index) => {
        this.utxoSet.add(tx.id, index, output)
      })
    }
  }

  /**
   * 计算下一个区块的难度
   */
  calculateNextDifficulty(): number {
    const latestBlock = this.getLatestBlock()

    // 如果还没到调整间隔，保持当前难度
    if (
      (latestBlock.index + 1) % this.config.difficultyAdjustmentInterval !==
      0
    ) {
      return latestBlock.difficulty
    }

    // 获取上一个调整周期的第一个区块
    const adjustmentBlock =
      this.chain[this.chain.length - this.config.difficultyAdjustmentInterval]

    // 计算实际时间
    const actualTime =
      (latestBlock.timestamp - adjustmentBlock.timestamp) / 1000 // 秒

    // 计算预期时间
    const expectedTime =
      this.config.targetBlockTime * this.config.difficultyAdjustmentInterval

    // 计算难度调整比例
    const ratio = actualTime / expectedTime

    // 如果实际时间比预期快 2 倍以上，增加难度
    if (ratio < 0.5) {
      return latestBlock.difficulty + 1
    }

    // 如果实际时间比预期慢 2 倍以上，降低难度
    if (ratio > 2) {
      return Math.max(1, latestBlock.difficulty - 1)
    }

    // 否则保持当前难度
    return latestBlock.difficulty
  }

  /**
   * 获取最新区块
   */
  getLatestBlock(): Block {
    if (this.chain.length === 0) {
      throw new Error('区块链为空')
    }
    return this.chain[this.chain.length - 1]
  }

  /**
   * 获取指定高度的区块
   */
  getBlockByIndex(index: number): Block | null {
    return this.chain.find((block) => block.index === index) || null
  }

  /**
   * 获取指定哈希的区块
   */
  getBlockByHash(hash: string): Block | null {
    return this.chain.find((block) => block.hash === hash) || null
  }

  /**
   * 获取区块链长度
   */
  getLength(): number {
    return this.chain.length
  }

  /**
   * 获取整个区块链
   */
  getChain(): Block[] {
    return [...this.chain]
  }

  /**
   * 获取 UTXO 集合
   */
  getUTXOSet(): UTXOSet {
    return this.utxoSet
  }

  /**
   * 验证整个区块链
   */
  isValidChain(): boolean {
    // 验证创世区块
    if (this.chain.length === 0) {
      return false
    }

    const genesisBlock = this.chain[0]
    if (genesisBlock.index !== 0 || genesisBlock.previousHash !== '0') {
      return false
    }

    // 验证每个区块
    for (let i = 1; i < this.chain.length; i++) {
      if (!this.isValidNewBlock(this.chain[i], this.chain[i - 1])) {
        return false
      }
    }

    return true
  }

  /**
   * 替换区块链（用于接收更长的链）
   */
  replaceChain(newChain: Block[]): boolean {
    if (newChain.length <= this.chain.length) {
      console.log('新链不比当前链长，拒绝替换')
      return false
    }

    // 验证新链
    const tempBlockchain = new Blockchain(this.config)
    tempBlockchain.chain = newChain

    if (!tempBlockchain.isValidChain()) {
      console.error('新链无效，拒绝替换')
      return false
    }

    // 重建 UTXO 集合
    this.chain = newChain
    this.utxoSet = new UTXOSet()
    for (const block of this.chain) {
      this.updateUTXOSet(block)
    }

    console.log('区块链已替换')
    return true
  }

  /**
   * 获取区块奖励
   */
  getBlockReward(): number {
    return this.config.blockReward
  }

  /**
   * 获取配置
   */
  getConfig(): BlockchainConfig {
    return {...this.config}
  }

  /**
   * 获取区块链统计信息
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
   * 序列化为 JSON
   */
  toJSON(): object {
    return {
      chain: this.chain.map((block) => block.toJSON()),
      config: this.config,
      stats: this.getStats(),
    }
  }
}
