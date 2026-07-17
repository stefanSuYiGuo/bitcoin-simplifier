import {Script, ScriptBuilder} from '../script'

/**
 * 交易输出类
 * 表示交易的输出，包含金额和锁定脚本
 * 支持传统地址模式和脚本模式
 */
export class TxOutput {
  /** 锁定脚本 (scriptPubKey) */
  private _scriptPubKey?: Script

  /**
   * @param amount 输出金额（单位：BTC）
   * @param address 接收地址（传统模式）
   */
  constructor(public readonly amount: number, public readonly address: string) {
    if (amount <= 0) {
      throw new Error('输出金额必须大于 0')
    }
    if (!address || address.trim().length === 0) {
      throw new Error('接收地址不能为空')
    }
  }

  /**
   * 创建带脚本的输出
   */
  static createWithScript(amount: number, scriptPubKey: Script): TxOutput {
    // 从脚本中提取地址信息（用于向后兼容）
    let address = 'script:' + scriptPubKey.toHex().substring(0, 16)

    // 尝试从 P2PKH 脚本提取公钥哈希作为地址
    const pubKeyHash = ScriptBuilder.extractP2PKHPubKeyHash(scriptPubKey)
    if (pubKeyHash) {
      address = pubKeyHash
    }

    // 尝试从 P2SH 脚本提取脚本哈希
    const scriptHash = ScriptBuilder.extractP2SHScriptHash(scriptPubKey)
    if (scriptHash) {
      address = '3' + scriptHash.substring(0, 20) // P2SH 地址以 3 开头
    }

    const output = new TxOutput(amount, address)
    output._scriptPubKey = scriptPubKey
    return output
  }

  /**
   * 设置锁定脚本 (scriptPubKey)
   */
  setScriptPubKey(scriptPubKey: Script): void {
    this._scriptPubKey = scriptPubKey
  }

  /**
   * 获取锁定脚本
   * 如果没有设置脚本，从地址推断生成 P2PKH 脚本
   */
  getScriptPubKey(): Script {
    if (this._scriptPubKey) {
      return this._scriptPubKey
    }
    // 从地址生成 P2PKH 锁定脚本
    // 注意：这里假设地址是公钥哈希，实际应该解码 Base58
    return ScriptBuilder.buildP2PKHLockingScript(this.address)
  }

  /**
   * 获取脚本类型
   */
  getScriptType(): string {
    return ScriptBuilder.getScriptType(this.getScriptPubKey())
  }

  /**
   * 是否是 P2PKH 输出
   */
  isP2PKH(): boolean {
    return ScriptBuilder.isP2PKH(this.getScriptPubKey())
  }

  /**
   * 是否是 P2SH 输出
   */
  isP2SH(): boolean {
    return ScriptBuilder.isP2SH(this.getScriptPubKey())
  }

  /**
   * 是否是 OP_RETURN 输出（不可花费）
   */
  isOpReturn(): boolean {
    return ScriptBuilder.isOpReturn(this.getScriptPubKey())
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): {amount: number; address: string; scriptPubKey?: string} {
    const json: any = {
      amount: this.amount,
      address: this.address,
    }
    if (this._scriptPubKey) {
      json.scriptPubKey = this._scriptPubKey.toHex()
    }
    return json
  }

  /**
   * 从 JSON 对象创建
   */
  static fromJSON(json: {
    amount: number
    address: string
    scriptPubKey?: string
  }): TxOutput {
    const output = new TxOutput(json.amount, json.address)
    if (json.scriptPubKey) {
      output._scriptPubKey = Script.fromHex(json.scriptPubKey)
    }
    return output
  }

  /**
   * 转换为字符串（用于哈希计算）
   */
  toString(): string {
    return JSON.stringify(this.toJSON())
  }

  /**
   * 克隆输出
   */
  clone(): TxOutput {
    const cloned = new TxOutput(this.amount, this.address)
    if (this._scriptPubKey) {
      cloned._scriptPubKey = this._scriptPubKey.clone()
    }
    return cloned
  }
}
