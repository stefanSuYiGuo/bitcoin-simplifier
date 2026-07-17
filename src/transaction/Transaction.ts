import {TxInput} from './TxInput'
import {TxOutput} from './TxOutput'
import {Hash} from '../crypto/hash'

/**
 * 交易类
 * 表示一笔完整的比特币交易
 */
export class Transaction {
  id: string
  inputs: TxInput[]
  outputs: TxOutput[]
  timestamp: number

  /**
   * 构造函数
   * @param inputs 交易输入列表
   * @param outputs 交易输出列表
   * @param timestamp 时间戳（可选，默认当前时间）
   */
  constructor(
    inputs: TxInput[],
    outputs: TxOutput[],
    timestamp: number = Date.now()
  ) {
    if (inputs.length === 0) {
      throw new Error('交易必须至少有一个输入')
    }
    if (outputs.length === 0) {
      throw new Error('交易必须至少有一个输出')
    }

    this.inputs = inputs
    this.outputs = outputs
    this.timestamp = timestamp
    this.id = this.calculateId()
  }

  /**
   * 计算交易 ID
   * 交易 ID 是交易内容的哈希值（不包含签名）
   */
  private calculateId(): string {
    const content = this.getContentForSigning()
    return Hash.sha256(content)
  }

  /**
   * 获取用于签名的交易内容
   * 不包含签名字段，因为签名是对交易内容的签名
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
   * 获取输入总金额
   * 注意：需要 UTXO 集合来查询每个输入的金额
   */
  getInputAmount(utxoSet: Map<string, TxOutput>): number {
    let total = 0
    for (const input of this.inputs) {
      const key = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(key)
      if (!utxo) {
        throw new Error(`UTXO 不存在: ${key}`)
      }
      total += utxo.amount
    }
    return total
  }

  /**
   * 获取输出总金额
   */
  getOutputAmount(): number {
    return this.outputs.reduce((sum, output) => sum + output.amount, 0)
  }

  /**
   * 计算矿工费
   * 矿工费 = 输入总额 - 输出总额
   */
  calculateFee(utxoSet: Map<string, TxOutput>): number {
    const inputAmount = this.getInputAmount(utxoSet)
    const outputAmount = this.getOutputAmount()
    return inputAmount - outputAmount
  }

  /**
   * 验证交易的基本有效性
   * 不包括签名验证（签名验证需要单独进行）
   */
  isValid(utxoSet: Map<string, TxOutput>): boolean {
    try {
      // 检查输入输出不为空
      if (this.inputs.length === 0 || this.outputs.length === 0) {
        return false
      }

      // 检查所有输出金额为正数
      for (const output of this.outputs) {
        if (output.amount <= 0) {
          return false
        }
      }

      // 检查输入总额 >= 输出总额
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
   * 检查交易是否为 Coinbase 交易
   * Coinbase 交易是矿工奖励交易，没有输入（或输入的 txId 为特殊值）
   */
  isCoinbase(): boolean {
    return (
      this.inputs.length === 1 &&
      this.inputs[0].txId ===
        '0000000000000000000000000000000000000000000000000000000000000000'
    )
  }

  /**
   * 转换为 JSON 对象
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
   * 从 JSON 对象创建交易
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
   * 创建 Coinbase 交易
   * @param minerAddress 矿工地址
   * @param amount 奖励金额
   * @param blockHeight 区块高度（用于 coinbase 输入）
   */
  static createCoinbase(
    minerAddress: string,
    amount: number,
    blockHeight: number = 0
  ): Transaction {
    // Coinbase 交易的输入使用特殊的 txId
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
   * 克隆交易
   */
  clone(): Transaction {
    const inputs = this.inputs.map((input) => input.clone())
    const outputs = this.outputs.map((output) => output.clone())
    return new Transaction(inputs, outputs, this.timestamp)
  }

  /**
   * 转换为字符串（用于调试）
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
