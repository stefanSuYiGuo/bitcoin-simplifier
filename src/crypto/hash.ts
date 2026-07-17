import * as CryptoJS from 'crypto-js'

/**
 * SHA-256 哈希函数封装
 */
export class Hash {
  /**
   * 计算单次 SHA-256 哈希
   */
  static sha256(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  /**
   * 计算双重 SHA-256 哈希 (比特币常用)
   */
  static doubleSha256(data: string): string {
    const firstHash = this.sha256(data)
    return this.sha256(firstHash)
  }

  /**
   * RIPEMD-160 哈希 (用于地址生成)
   */
  static ripemd160(data: string): string {
    return CryptoJS.RIPEMD160(data).toString()
  }

  /**
   * 计算对象的哈希 (先序列化为 JSON)
   */
  static hashObject(obj: any): string {
    const jsonString = JSON.stringify(obj)
    return this.sha256(jsonString)
  }
}
