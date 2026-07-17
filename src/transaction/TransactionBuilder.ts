import {Transaction} from './Transaction'
import {TxInput} from './TxInput'
import {TxOutput} from './TxOutput'
import {UTXOSet} from './UTXO'
import {Wallet} from '../wallet/Wallet'
import {TransactionSigner} from './TransactionSigner'

/**
 * 交易构建器
 * 用于构建和签名交易
 */
export class TransactionBuilder {
  private utxoSet: UTXOSet
  private fromWallet?: Wallet
  private recipients: Array<{address: string; amount: number}> = []
  private feePerByte: number = 0
  private changeAddress?: string

  constructor(utxoSet: UTXOSet) {
    this.utxoSet = utxoSet
  }

  /**
   * 设置发送者钱包
   * @param wallet 发送者的钱包
   */
  from(wallet: Wallet): TransactionBuilder {
    this.fromWallet = wallet
    this.changeAddress = wallet.address // 默认找零到发送者地址
    return this
  }

  /**
   * 添加接收者
   * @param address 接收者地址
   * @param amount 金额
   */
  to(address: string, amount: number): TransactionBuilder {
    if (amount <= 0) {
      throw new Error('转账金额必须大于 0')
    }
    this.recipients.push({address, amount})
    return this
  }

  /**
   * 设置矿工费（每字节）
   * @param feePerByte 每字节的矿工费
   */
  withFee(feePerByte: number): TransactionBuilder {
    this.feePerByte = feePerByte
    return this
  }

  /**
   * 设置找零地址
   * @param address 找零地址
   */
  withChangeAddress(address: string): TransactionBuilder {
    this.changeAddress = address
    return this
  }

  /**
   * 构建交易
   * @returns 未签名的交易
   */
  build(): Transaction {
    if (!this.fromWallet) {
      throw new Error('必须指定发送者钱包')
    }

    if (this.recipients.length === 0) {
      throw new Error('必须至少有一个接收者')
    }

    // 计算需要的总金额
    const totalOutput = this.recipients.reduce(
      (sum, recipient) => sum + recipient.amount,
      0
    )

    // 获取发送者的所有 UTXO
    const senderUTXOs = this.utxoSet.getUTXOsByAddress(this.fromWallet.address)

    if (senderUTXOs.length === 0) {
      throw new Error(`发送者没有可用的 UTXO: ${this.fromWallet.address}`)
    }

    // 选择 UTXO（贪心算法：按金额从大到小选择）
    const selectedUTXOs = this.selectUTXOs(senderUTXOs, totalOutput)

    if (selectedUTXOs.length === 0) {
      const balance = this.utxoSet.getBalance(this.fromWallet.address)
      throw new Error(`余额不足。需要: ${totalOutput}, 可用: ${balance}`)
    }

    // 计算输入总额
    const totalInput = selectedUTXOs.reduce(
      (sum, utxo) => sum + utxo.output.amount,
      0
    )

    // 构建输入
    const inputs = selectedUTXOs.map(
      (utxo) => new TxInput(utxo.txId, utxo.outputIndex)
    )

    // 构建输出
    const outputs = this.recipients.map(
      (recipient) => new TxOutput(recipient.amount, recipient.address)
    )

    // 计算找零
    const change = totalInput - totalOutput

    if (change < 0) {
      throw new Error('输入金额小于输出金额')
    }

    // 如果有找零，添加找零输出
    if (change > 0) {
      const changeAddr = this.changeAddress || this.fromWallet.address
      outputs.push(new TxOutput(change, changeAddr))
    }

    // 创建交易
    return new Transaction(inputs, outputs)
  }

  /**
   * 构建并签名交易
   * @returns 已签名的交易
   */
  buildAndSign(): Transaction {
    if (!this.fromWallet) {
      throw new Error('必须指定发送者钱包')
    }

    const transaction = this.build()
    return TransactionSigner.signTransaction(transaction, this.fromWallet)
  }

  /**
   * 选择 UTXO（贪心算法）
   * 按金额从大到小排序，然后选择直到满足需求
   */
  private selectUTXOs(
    utxos: Array<{txId: string; outputIndex: number; output: TxOutput}>,
    targetAmount: number
  ): Array<{txId: string; outputIndex: number; output: TxOutput}> {
    // 按金额从大到小排序
    const sorted = [...utxos].sort((a, b) => b.output.amount - a.output.amount)

    const selected: Array<{
      txId: string
      outputIndex: number
      output: TxOutput
    }> = []
    let total = 0

    for (const utxo of sorted) {
      selected.push(utxo)
      total += utxo.output.amount

      // 如果已经足够，停止选择
      if (total >= targetAmount) {
        break
      }
    }

    // 检查是否足够
    if (total < targetAmount) {
      return []
    }

    return selected
  }

  /**
   * 估算交易大小（字节）
   * 这是一个简化的估算
   */
  private estimateTransactionSize(
    inputCount: number,
    outputCount: number
  ): number {
    // 简化估算：每个输入约 150 字节，每个输出约 34 字节
    const inputSize = inputCount * 150
    const outputSize = outputCount * 34
    const overhead = 10 // 交易头部开销
    return inputSize + outputSize + overhead
  }

  /**
   * 静态方法：创建简单转账交易
   * @param fromWallet 发送者钱包
   * @param toAddress 接收者地址
   * @param amount 金额
   * @param utxoSet UTXO 集合
   */
  static createSimpleTransfer(
    fromWallet: Wallet,
    toAddress: string,
    amount: number,
    utxoSet: UTXOSet
  ): Transaction {
    return new TransactionBuilder(utxoSet)
      .from(fromWallet)
      .to(toAddress, amount)
      .buildAndSign()
  }
}
