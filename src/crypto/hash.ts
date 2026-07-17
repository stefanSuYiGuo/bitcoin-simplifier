import * as CryptoJS from 'crypto-js'

/**
 * SHA-256 hashing utilities.
 */
export class Hash {
  /**
   * Calculate a single SHA-256 hash.
   */
  static sha256(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  /**
   * Calculate the double SHA-256 hash commonly used by Bitcoin.
   */
  static doubleSha256(data: string): string {
    const firstHash = this.sha256(data)
    return this.sha256(firstHash)
  }

  /**
   * Calculate a RIPEMD-160 hash for address generation.
   */
  static ripemd160(data: string): string {
    return CryptoJS.RIPEMD160(data).toString()
  }

  /**
   * Hash an object after serializing it to JSON.
   */
  static hashObject(obj: any): string {
    const jsonString = JSON.stringify(obj)
    return this.sha256(jsonString)
  }
}
