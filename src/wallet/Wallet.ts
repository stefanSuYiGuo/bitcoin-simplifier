import { KeyPair } from './KeyPair'
import { Hash } from '../crypto/hash'
import { encodeBase58 } from '../utils/base58'

/**
 * 钱包类
 * 管理密钥对、生成地址、签名交易
 */
export class Wallet {
  private keyPair: KeyPair
  private _address: string

  /**
   * 构造函数
   * @param privateKey 私钥（可选，不提供则生成新钱包）
   */
  constructor(privateKey?: string) {
    this.keyPair = new KeyPair(privateKey)
    this._address = this.generateAddress()
  }

  /**
   * 获取公钥
   */
  get publicKey(): string {
    return this.keyPair.publicKey
  }

  /**
   * 获取私钥
   */
  get privateKey(): string {
    return this.keyPair.privateKey
  }

  /**
   * 获取地址
   */
  get address(): string {
    return this._address
  }

  /**
   * 生成比特币地址
   * 算法: Base58(RIPEMD160(SHA256(publicKey)))
   * @returns 比特币地址
   */
  private generateAddress(): string {
    // 1. 对公钥进行 SHA-256 哈希
    const sha256Hash = Hash.sha256(this.keyPair.publicKey)
    
    // 2. 对结果进行 RIPEMD-160 哈希
    const ripemd160Hash = Hash.ripemd160(sha256Hash)
    
    // 3. Base58 编码
    const address = encodeBase58(ripemd160Hash)
    
    return address
  }

  /**
   * 对数据进行签名
   * @param data 要签名的数据
   * @returns 签名字符串
   */
  sign(data: string): string {
    return this.keyPair.sign(data)
  }

  /**
   * 验证签名
   * @param data 原始数据
   * @param signature 签名
   * @returns 签名是否有效
   */
  verify(data: string, signature: string): boolean {
    return this.keyPair.verify(data, signature)
  }

  /**
   * 导出钱包信息（包含私钥，需谨慎处理）
   */
  export(): { privateKey: string; publicKey: string; address: string } {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    }
  }

  /**
   * 从私钥导入钱包
   * @param privateKey 私钥
   */
  static fromPrivateKey(privateKey: string): Wallet {
    return new Wallet(privateKey)
  }

  /**
   * 验证地址格式是否有效
   * @param address 地址
   * @returns 是否有效
   */
  static isValidAddress(address: string): boolean {
    // 简单验证：检查是否为 Base58 字符
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
    return base58Regex.test(address) && address.length >= 26 && address.length <= 35
  }

  /**
   * 生成钱包信息的字符串表示
   */
  toString(): string {
    return `Wallet(address: ${this.address.substring(0, 10)}...)`
  }
}
