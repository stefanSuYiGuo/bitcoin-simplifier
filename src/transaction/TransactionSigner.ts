import {Transaction} from './Transaction'
import {Wallet} from '../wallet/Wallet'
import {Signature} from '../crypto/signature'
import {Hash} from '../crypto/hash'
import {encodeBase58} from '../utils/base58'

/**
 * 交易签名器
 * 负责对交易进行签名和验证签名
 */
export class TransactionSigner {
  /**
   * 对交易的单个输入进行签名
   * @param transaction 要签名的交易
   * @param inputIndex 要签名的输入索引
   * @param wallet 签名者的钱包
   * @returns 是否签名成功
   */
  static signInput(
    transaction: Transaction,
    inputIndex: number,
    wallet: Wallet
  ): boolean {
    if (inputIndex < 0 || inputIndex >= transaction.inputs.length) {
      return false
    }

    const input = transaction.inputs[inputIndex]

    // 如果已签名，跳过
    if (input.isSigned()) {
      return true
    }

    const txData = transaction.getContentForSigning()
    const signature = wallet.sign(txData)

    // 设置签名和公钥
    input.setSignature(signature, wallet.publicKey)

    return true
  }

  /**
   * 对交易进行签名（所有输入使用同一个钱包）
   * @param transaction 要签名的交易
   * @param wallet 签名者的钱包
   * @returns 签名后的交易（会修改输入的签名字段）
   */
  static signTransaction(
    transaction: Transaction,
    wallet: Wallet
  ): Transaction {
    const txData = transaction.getContentForSigning()

    // 对每个输入进行签名
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]

      // 跳过已签名的输入
      if (input.isSigned()) {
        continue
      }

      // 使用钱包的私钥签名
      const signature = wallet.sign(txData)

      // 设置签名和公钥
      input.setSignature(signature, wallet.publicKey)
    }

    // 重新计算交易 ID（签名后可能会变化）
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * 对交易进行签名（支持不同输入使用不同钱包）
   * @param transaction 要签名的交易
   * @param wallets 钱包数组，索引对应输入索引
   * @returns 签名后的交易
   */
  static signTransactionWithWallets(
    transaction: Transaction,
    wallets: Wallet[]
  ): Transaction {
    if (wallets.length !== transaction.inputs.length) {
      throw new Error(
        `钱包数量 (${wallets.length}) 与输入数量 (${transaction.inputs.length}) 不匹配`
      )
    }

    const txData = transaction.getContentForSigning()

    // 对每个输入使用对应的钱包签名
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]
      const wallet = wallets[i]

      // 跳过已签名的输入
      if (input.isSigned()) {
        continue
      }

      // 使用对应钱包的私钥签名
      const signature = wallet.sign(txData)

      // 设置签名和公钥
      input.setSignature(signature, wallet.publicKey)
    }

    // 重新计算交易 ID
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * 对交易进行签名（使用钱包映射，根据 UTXO 地址匹配钱包）
   * @param transaction 要签名的交易
   * @param walletMap 地址到钱包的映射
   * @param utxoSet UTXO 集合（用于查找每个输入对应的地址）
   * @returns 签名后的交易
   */
  static signTransactionWithWalletMap(
    transaction: Transaction,
    walletMap: Map<string, Wallet>,
    utxoSet: Map<string, {amount: number; address: string}>
  ): Transaction {
    const txData = transaction.getContentForSigning()

    // 对每个输入找到对应的钱包并签名
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]

      // 跳过已签名的输入
      if (input.isSigned()) {
        continue
      }

      // 查找这个 UTXO 的所有者地址
      const utxoKey = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(utxoKey)

      if (!utxo) {
        throw new Error(`UTXO 不存在: ${utxoKey}`)
      }

      // 找到对应地址的钱包
      const wallet = walletMap.get(utxo.address)

      if (!wallet) {
        throw new Error(
          `没有找到地址 ${utxo.address} 对应的钱包来签名输入 ${i}`
        )
      }

      // 使用该钱包签名
      const signature = wallet.sign(txData)
      input.setSignature(signature, wallet.publicKey)
    }

    // 重新计算交易 ID
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * 验证交易的所有签名
   * @param transaction 要验证的交易
   * @param utxoSet UTXO 集合（用于查找输出所有者）
   * @returns 是否所有签名都有效
   */
  static verifyTransaction(
    transaction: Transaction,
    utxoSet: Map<string, {amount: number; address: string}>
  ): boolean {
    // Coinbase 交易不需要验证签名
    if (transaction.isCoinbase()) {
      return true
    }

    const txData = transaction.getContentForSigning()

    // 验证每个输入的签名
    for (const input of transaction.inputs) {
      // 检查输入是否已签名
      if (!input.isSigned()) {
        console.error(`输入未签名: ${input.txId}:${input.outputIndex}`)
        return false
      }

      // 验证签名
      if (!Signature.verify(txData, input.signature, input.publicKey)) {
        console.error(`签名验证失败: ${input.txId}:${input.outputIndex}`)
        return false
      }

      // 验证公钥对应的地址是否拥有被引用的 UTXO
      const utxoKey = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(utxoKey)

      if (!utxo) {
        console.error(`UTXO 不存在: ${utxoKey}`)
        return false
      }

      // 从公钥计算地址
      const sha256Hash = Hash.sha256(input.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // 验证地址是否匹配
      if (addressFromPublicKey !== utxo.address) {
        console.error(
          `地址不匹配: 公钥地址 ${addressFromPublicKey}, UTXO 所有者 ${utxo.address}`
        )
        return false
      }
    }

    return true
  }

  /**
   * 验证单个输入的签名
   * @param transaction 交易
   * @param inputIndex 输入索引
   * @param utxoSet UTXO 集合
   * @returns 签名是否有效
   */
  static verifyInput(
    transaction: Transaction,
    inputIndex: number,
    utxoSet: Map<string, {amount: number; address: string}>
  ): boolean {
    if (inputIndex < 0 || inputIndex >= transaction.inputs.length) {
      return false
    }

    const input = transaction.inputs[inputIndex]
    const txData = transaction.getContentForSigning()

    // 验证签名
    if (!Signature.verify(txData, input.signature, input.publicKey)) {
      return false
    }

    // 验证地址
    const utxoKey = `${input.txId}:${input.outputIndex}`
    const utxo = utxoSet.get(utxoKey)

    if (!utxo) {
      return false
    }

    const sha256Hash = Hash.sha256(input.publicKey)
    const ripemd160Hash = Hash.ripemd160(sha256Hash)
    const addressFromPublicKey = encodeBase58(ripemd160Hash)

    return addressFromPublicKey === utxo.address
  }

  /**
   * 检查交易是否所有输入都已签名
   * @param transaction 交易
   * @returns 是否所有输入都已签名
   */
  static isFullySigned(transaction: Transaction): boolean {
    if (transaction.isCoinbase()) {
      return true
    }

    return transaction.inputs.every((input) => input.isSigned())
  }

  /**
   * 获取未签名的输入索引列表
   * @param transaction 交易
   * @returns 未签名的输入索引数组
   */
  static getUnsignedInputIndices(transaction: Transaction): number[] {
    const indices: number[] = []
    for (let i = 0; i < transaction.inputs.length; i++) {
      if (!transaction.inputs[i].isSigned()) {
        indices.push(i)
      }
    }
    return indices
  }
}
