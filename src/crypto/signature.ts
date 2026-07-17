import * as elliptic from 'elliptic'
import {Hash} from './hash'

const ec = new elliptic.ec('secp256k1')

/**
 * ECDSA 签名和验证工具类
 * 使用 secp256k1 椭圆曲线（与比特币相同）
 */
export class Signature {
  /**
   * 生成新的密钥对
   * @returns 包含私钥和公钥的对象
   */
  static generateKeyPair(): {privateKey: string; publicKey: string} {
    const keyPair = ec.genKeyPair()
    const privateKey = keyPair.getPrivate('hex')
    const publicKey = keyPair.getPublic('hex')

    return {privateKey, publicKey}
  }

  /**
   * 从私钥导出公钥
   * @param privateKey 私钥（十六进制字符串）
   * @returns 公钥（十六进制字符串）
   */
  static getPublicKeyFromPrivate(privateKey: string): string {
    const keyPair = ec.keyFromPrivate(privateKey, 'hex')
    return keyPair.getPublic('hex')
  }

  /**
   * 对数据进行签名
   * @param data 要签名的数据
   * @param privateKey 私钥
   * @returns 签名（十六进制字符串）
   */
  static sign(data: string, privateKey: string): string {
    const hash = Hash.sha256(data)
    const keyPair = ec.keyFromPrivate(privateKey, 'hex')
    const signature = keyPair.sign(hash)

    return signature.toDER('hex')
  }

  /**
   * 验证签名
   * @param data 原始数据
   * @param signature 签名
   * @param publicKey 公钥
   * @returns 签名是否有效
   */
  static verify(data: string, signature: string, publicKey: string): boolean {
    try {
      const hash = Hash.sha256(data)
      const key = ec.keyFromPublic(publicKey, 'hex')
      return key.verify(hash, signature)
    } catch (error) {
      return false
    }
  }

  /**
   * 验证密钥对是否匹配
   * @param privateKey 私钥
   * @param publicKey 公钥
   * @returns 是否匹配
   */
  static verifyKeyPair(privateKey: string, publicKey: string): boolean {
    const derivedPublicKey = this.getPublicKeyFromPrivate(privateKey)
    return derivedPublicKey === publicKey
  }
}
