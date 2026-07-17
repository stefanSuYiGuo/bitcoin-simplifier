import { Signature } from '../crypto/signature'

/**
 * 密钥对管理类
 * 封装公私钥对的生成和管理
 */
export class KeyPair {
  private _privateKey: string
  private _publicKey: string

  /**
   * 构造函数
   * @param privateKey 私钥（可选，不提供则生成新的）
   */
  constructor(privateKey?: string) {
    if (privateKey) {
      this._privateKey = privateKey
      this._publicKey = Signature.getPublicKeyFromPrivate(privateKey)
    } else {
      const { privateKey: privKey, publicKey: pubKey } = Signature.generateKeyPair()
      this._privateKey = privKey
      this._publicKey = pubKey
    }
  }

  /**
   * 获取私钥
   */
  get privateKey(): string {
    return this._privateKey
  }

  /**
   * 获取公钥
   */
  get publicKey(): string {
    return this._publicKey
  }

  /**
   * 对数据进行签名
   * @param data 要签名的数据
   * @returns 签名字符串
   */
  sign(data: string): string {
    return Signature.sign(data, this._privateKey)
  }

  /**
   * 验证签名
   * @param data 原始数据
   * @param signature 签名
   * @returns 签名是否有效
   */
  verify(data: string, signature: string): boolean {
    return Signature.verify(data, signature, this._publicKey)
  }

  /**
   * 验证密钥对是否有效
   */
  isValid(): boolean {
    return Signature.verifyKeyPair(this._privateKey, this._publicKey)
  }

  /**
   * 导出为 JSON 对象（注意：包含私钥，需谨慎处理）
   */
  toJSON(): { privateKey: string; publicKey: string } {
    return {
      privateKey: this._privateKey,
      publicKey: this._publicKey
    }
  }

  /**
   * 从 JSON 对象导入
   */
  static fromJSON(json: { privateKey: string; publicKey: string }): KeyPair {
    return new KeyPair(json.privateKey)
  }
}
