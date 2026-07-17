import { TxOutput } from './TxOutput'

/**
 * UTXO (Unspent Transaction Output) 集合管理类
 * 管理所有未花费的交易输出
 */
export class UTXOSet {
  // 使用 Map 存储 UTXO，键格式：txId:outputIndex
  private utxos: Map<string, TxOutput>

  constructor() {
    this.utxos = new Map()
  }

  /**
   * 添加 UTXO
   * @param txId 交易 ID
   * @param outputIndex 输出索引
   * @param output 交易输出
   */
  add(txId: string, outputIndex: number, output: TxOutput): void {
    const key = this.makeKey(txId, outputIndex)
    this.utxos.set(key, output)
  }

  /**
   * 移除 UTXO（当被花费时）
   * @param txId 交易 ID
   * @param outputIndex 输出索引
   * @returns 是否成功移除
   */
  remove(txId: string, outputIndex: number): boolean {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.delete(key)
  }

  /**
   * 获取 UTXO
   * @param txId 交易 ID
   * @param outputIndex 输出索引
   * @returns UTXO 或 undefined
   */
  get(txId: string, outputIndex: number): TxOutput | undefined {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.get(key)
  }

  /**
   * 检查 UTXO 是否存在
   * @param txId 交易 ID
   * @param outputIndex 输出索引
   */
  has(txId: string, outputIndex: number): boolean {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.has(key)
  }

  /**
   * 获取指定地址的所有 UTXO
   * @param address 地址
   * @returns UTXO 列表，包含 txId、outputIndex 和 output
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
   * 计算指定地址的余额
   * @param address 地址
   * @returns 余额
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
   * 获取所有 UTXO
   */
  getAll(): Map<string, TxOutput> {
    return new Map(this.utxos)
  }

  /**
   * 获取 UTXO 总数
   */
  size(): number {
    return this.utxos.size
  }

  /**
   * 清空所有 UTXO
   */
  clear(): void {
    this.utxos.clear()
  }

  /**
   * 克隆 UTXO 集合
   */
  clone(): UTXOSet {
    const newSet = new UTXOSet()
    newSet.utxos = new Map(this.utxos)
    return newSet
  }

  /**
   * 生成 UTXO 的键
   * @param txId 交易 ID
   * @param outputIndex 输出索引
   */
  private makeKey(txId: string, outputIndex: number): string {
    return `${txId}:${outputIndex}`
  }

  /**
   * 解析 UTXO 的键
   * @param key 键
   * @returns [txId, outputIndex]
   */
  private parseKey(key: string): [string, number] {
    const parts = key.split(':')
    return [parts[0], parseInt(parts[1], 10)]
  }

  /**
   * 导出为 JSON
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
   * 从 JSON 导入
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


