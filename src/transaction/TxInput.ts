import {Script, ScriptBuilder} from '../script'

/**
 * 交易输入类
 * 表示交易的输入，引用之前的 UTXO
 * 支持传统签名模式和脚本模式
 */
export class TxInput {
  /** 解锁脚本 (scriptSig) */
  private _scriptSig?: Script

  /**
   * @param txId 引用的交易 ID
   * @param outputIndex 引用的输出索引
   * @param signature 签名（传统模式，可选）
   * @param publicKey 公钥（传统模式，可选）
   */
  constructor(
    public readonly txId: string,
    public readonly outputIndex: number,
    public signature: string = '',
    public publicKey: string = ''
  ) {
    if (!txId || txId.trim().length === 0) {
      throw new Error('交易 ID 不能为空')
    }
    if (outputIndex < 0) {
      throw new Error('输出索引不能为负数')
    }
  }

  /**
   * 设置签名（传统模式）
   * @param signature 签名
   * @param publicKey 公钥
   */
  setSignature(signature: string, publicKey: string): void {
    this.signature = signature
    this.publicKey = publicKey
    // 同时更新 scriptSig
    this._scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature,
      publicKey
    )
  }

  /**
   * 设置解锁脚本 (scriptSig)
   */
  setScriptSig(scriptSig: Script): void {
    this._scriptSig = scriptSig
    // 尝试从脚本中提取签名和公钥（用于向后兼容）
    const elements = scriptSig.getElements()
    if (elements.length >= 2) {
      if (elements[0].type === 'data') {
        this.signature = elements[0].data
      }
      if (elements[1].type === 'data') {
        this.publicKey = elements[1].data
      }
    }
  }

  /**
   * 获取解锁脚本
   */
  getScriptSig(): Script {
    if (this._scriptSig) {
      return this._scriptSig
    }
    // 从传统字段构建脚本
    if (this.signature && this.publicKey) {
      return ScriptBuilder.buildP2PKHUnlockingScript(
        this.signature,
        this.publicKey
      )
    }
    return new Script()
  }

  /**
   * 是否已签名
   */
  isSigned(): boolean {
    return (
      (this.signature.length > 0 && this.publicKey.length > 0) ||
      (this._scriptSig !== undefined && !this._scriptSig.isEmpty())
    )
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): {
    txId: string
    outputIndex: number
    signature: string
    publicKey: string
    scriptSig?: string
  } {
    const json: any = {
      txId: this.txId,
      outputIndex: this.outputIndex,
      signature: this.signature,
      publicKey: this.publicKey,
    }
    if (this._scriptSig) {
      json.scriptSig = this._scriptSig.toHex()
    }
    return json
  }

  /**
   * 从 JSON 对象创建
   */
  static fromJSON(json: {
    txId: string
    outputIndex: number
    signature?: string
    publicKey?: string
    scriptSig?: string
  }): TxInput {
    const input = new TxInput(
      json.txId,
      json.outputIndex,
      json.signature || '',
      json.publicKey || ''
    )
    if (json.scriptSig) {
      input._scriptSig = Script.fromHex(json.scriptSig)
    }
    return input
  }

  /**
   * 转换为字符串（用于哈希计算，不包含签名）
   */
  toStringForSigning(): string {
    return JSON.stringify({
      txId: this.txId,
      outputIndex: this.outputIndex,
    })
  }

  /**
   * 转换为字符串（包含签名）
   */
  toString(): string {
    return JSON.stringify(this.toJSON())
  }

  /**
   * 获取 UTXO 引用的唯一标识
   * 格式: txId:outputIndex
   */
  getUTXOKey(): string {
    return `${this.txId}:${this.outputIndex}`
  }

  /**
   * 克隆输入
   */
  clone(): TxInput {
    const cloned = new TxInput(
      this.txId,
      this.outputIndex,
      this.signature,
      this.publicKey
    )
    if (this._scriptSig) {
      cloned._scriptSig = this._scriptSig.clone()
    }
    return cloned
  }
}
