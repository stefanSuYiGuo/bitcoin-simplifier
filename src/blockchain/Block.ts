import {Transaction, TxOutput} from '../transaction'
import {MerkleTree} from '../merkle'
import {Hash} from '../crypto'

/**
 * 区块类
 * 包含区块头和交易列表
 */
export class Block {
  // 区块索引（高度）
  public index: number

  // 区块头
  public previousHash: string // 前一个区块的哈希
  public timestamp: number // 区块创建时间
  public merkleRoot: string // 交易 Merkle 根
  public difficulty: number // 挖矿难度
  public nonce: number // 工作量证明的随机数

  // 区块体
  public transactions: Transaction[]

  // 区块哈希（缓存）
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
      throw new Error('区块至少需要一笔交易（Coinbase 交易）')
    }

    this.index = index
    this.previousHash = previousHash
    this.timestamp = timestamp
    this.transactions = transactions
    this.difficulty = difficulty
    this.nonce = nonce

    // 计算 Merkle 根
    this.merkleRoot = this.calculateMerkleRoot()
  }

  /**
   * 计算 Merkle 根
   */
  private calculateMerkleRoot(): string {
    const txIds = this.transactions.map((tx) => tx.id)
    const merkleTree = new MerkleTree(txIds)
    return merkleTree.getRoot()
  }

  /**
   * 计算区块哈希
   */
  calculateHash(): string {
    const blockHeader = this.getHeaderString()
    return Hash.doubleSha256(blockHeader)
  }

  /**
   * 获取区块头字符串
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
   * 获取区块哈希（缓存）
   */
  get hash(): string {
    if (!this._hash) {
      this._hash = this.calculateHash()
    }
    return this._hash
  }

  /**
   * 设置 nonce（挖矿时使用）
   */
  setNonce(nonce: number): void {
    this.nonce = nonce
    this._hash = undefined // 清除缓存
  }

  /**
   * 验证区块哈希是否满足难度要求
   */
  hasValidHash(): boolean {
    const prefix = '0'.repeat(this.difficulty)
    return this.hash.startsWith(prefix)
  }

  /**
   * 创建创世区块
   */
  static createGenesisBlock(coinbaseTx: Transaction): Block {
    return new Block(
      0, // 索引
      '0', // 前区块哈希（创世区块没有前区块）
      Date.now(),
      [coinbaseTx],
      1 // 初始难度
    )
  }

  /**
   * 获取区块大小（字节）
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
   * 获取区块中的 Coinbase 交易
   */
  getCoinbaseTransaction(): Transaction | null {
    return this.transactions.find((tx) => tx.isCoinbase()) || null
  }

  /**
   * 获取区块总手续费
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
        // UTXO 不存在，跳过
      }
    }

    return totalFees
  }

  /**
   * 序列化为 JSON
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
   * 从 JSON 反序列化
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
   * 克隆区块
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
   * 转换为字符串（用于调试）
   */
  toString(): string {
    return `Block #${this.index} [${this.hash.substring(0, 10)}...] - ${
      this.transactions.length
    } txs`
  }
}
