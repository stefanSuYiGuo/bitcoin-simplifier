/**
 * 脚本构建器
 * 提供便捷方法构建常见脚本类型
 */

import {Script} from './Script'
import {OpCode} from './OpCodes'
import {Hash} from '../crypto'

/**
 * 脚本构建器
 */
export class ScriptBuilder {
  /**
   * 构建 P2PKH 锁定脚本 (Pay-to-Public-Key-Hash)
   * scriptPubKey: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
   *
   * @param pubKeyHash 公钥哈希（20 字节，十六进制）
   */
  static buildP2PKHLockingScript(pubKeyHash: string): Script {
    return new Script()
      .addOpCode(OpCode.OP_DUP)
      .addOpCode(OpCode.OP_HASH160)
      .addData(pubKeyHash)
      .addOpCode(OpCode.OP_EQUALVERIFY)
      .addOpCode(OpCode.OP_CHECKSIG)
  }

  /**
   * 构建 P2PKH 解锁脚本
   * scriptSig: <signature> <publicKey>
   *
   * @param signature 签名（DER 格式，十六进制）
   * @param publicKey 公钥（十六进制）
   */
  static buildP2PKHUnlockingScript(
    signature: string,
    publicKey: string
  ): Script {
    return new Script().addData(signature).addData(publicKey)
  }

  /**
   * 从公钥生成 P2PKH 锁定脚本
   *
   * @param publicKey 公钥（十六进制）
   */
  static buildP2PKHFromPublicKey(publicKey: string): Script {
    const pubKeyHash = ScriptBuilder.hash160(publicKey)
    return ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
  }

  /**
   * 从地址生成 P2PKH 锁定脚本
   * 注意：需要先将地址解码为公钥哈希
   *
   * @param address Base58 地址
   */
  static buildP2PKHFromAddress(pubKeyHash: string): Script {
    return ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
  }

  /**
   * 构建 P2SH 锁定脚本 (Pay-to-Script-Hash)
   * scriptPubKey: OP_HASH160 <scriptHash> OP_EQUAL
   *
   * @param scriptHash 赎回脚本哈希（20 字节，十六进制）
   */
  static buildP2SHLockingScript(scriptHash: string): Script {
    return new Script()
      .addOpCode(OpCode.OP_HASH160)
      .addData(scriptHash)
      .addOpCode(OpCode.OP_EQUAL)
  }

  /**
   * 构建 P2SH 解锁脚本
   * scriptSig: <data...> <redeemScript>
   *
   * @param data 解锁数据（签名等）
   * @param redeemScript 赎回脚本（序列化后的十六进制）
   */
  static buildP2SHUnlockingScript(
    data: string[],
    redeemScript: string
  ): Script {
    const script = new Script()
    for (const d of data) {
      script.addData(d)
    }
    script.addData(redeemScript)
    return script
  }

  /**
   * 从赎回脚本生成 P2SH 锁定脚本
   *
   * @param redeemScript 赎回脚本
   */
  static buildP2SHFromRedeemScript(redeemScript: Script): Script {
    const scriptHash = ScriptBuilder.hash160(redeemScript.toHex())
    return ScriptBuilder.buildP2SHLockingScript(scriptHash)
  }

  /**
   * 构建多重签名赎回脚本 (m-of-n)
   * script: <m> <pubKey1> <pubKey2> ... <pubKeyN> <n> OP_CHECKMULTISIG
   *
   * @param m 所需签名数
   * @param publicKeys 公钥列表
   */
  static buildMultiSigScript(m: number, publicKeys: string[]): Script {
    const n = publicKeys.length

    if (m < 1 || m > n) {
      throw new Error(`无效的多签参数: ${m}-of-${n}`)
    }
    if (n > 16) {
      throw new Error('公钥数量不能超过 16')
    }

    const script = new Script()

    // 添加 m
    script.addOpCode(ScriptBuilder.numberToOpCode(m))

    // 添加所有公钥
    for (const pubKey of publicKeys) {
      script.addData(pubKey)
    }

    // 添加 n
    script.addOpCode(ScriptBuilder.numberToOpCode(n))

    // 添加 OP_CHECKMULTISIG
    script.addOpCode(OpCode.OP_CHECKMULTISIG)

    return script
  }

  /**
   * 构建多重签名解锁脚本
   * scriptSig: OP_0 <sig1> <sig2> ... <sigM>
   * 注意：OP_0 是因为 OP_CHECKMULTISIG 的一个 bug
   *
   * @param signatures 签名列表
   */
  static buildMultiSigUnlockingScript(signatures: string[]): Script {
    const script = new Script()

    // CHECKMULTISIG bug: 需要一个额外的虚拟元素
    script.addOpCode(OpCode.OP_0)

    // 添加所有签名
    for (const sig of signatures) {
      script.addData(sig)
    }

    return script
  }

  /**
   * 构建 P2SH 多签锁定脚本
   *
   * @param m 所需签名数
   * @param publicKeys 公钥列表
   */
  static buildP2SHMultiSig(
    m: number,
    publicKeys: string[]
  ): {lockingScript: Script; redeemScript: Script} {
    const redeemScript = ScriptBuilder.buildMultiSigScript(m, publicKeys)
    const lockingScript = ScriptBuilder.buildP2SHFromRedeemScript(redeemScript)
    return {lockingScript, redeemScript}
  }

  /**
   * 构建 P2SH 多签解锁脚本
   *
   * @param signatures 签名列表
   * @param redeemScript 赎回脚本
   */
  static buildP2SHMultiSigUnlockingScript(
    signatures: string[],
    redeemScript: Script
  ): Script {
    const script = new Script()

    // CHECKMULTISIG bug 虚拟元素
    script.addOpCode(OpCode.OP_0)

    // 添加签名
    for (const sig of signatures) {
      script.addData(sig)
    }

    // 添加赎回脚本
    script.addData(redeemScript.toHex())

    return script
  }

  /**
   * 构建 P2PK 锁定脚本 (Pay-to-Public-Key)
   * scriptPubKey: <publicKey> OP_CHECKSIG
   * 较旧的脚本类型，现在不常用
   *
   * @param publicKey 公钥（十六进制）
   */
  static buildP2PKLockingScript(publicKey: string): Script {
    return new Script().addData(publicKey).addOpCode(OpCode.OP_CHECKSIG)
  }

  /**
   * 构建 P2PK 解锁脚本
   * scriptSig: <signature>
   *
   * @param signature 签名（十六进制）
   */
  static buildP2PKUnlockingScript(signature: string): Script {
    return new Script().addData(signature)
  }

  /**
   * 构建 OP_RETURN 脚本（存储数据，使输出不可花费）
   * scriptPubKey: OP_RETURN <data>
   *
   * @param data 要存储的数据（十六进制）
   */
  static buildOpReturnScript(data: string): Script {
    return new Script().addOpCode(OpCode.OP_RETURN).addData(data)
  }

  /**
   * 构建时间锁脚本 (CLTV)
   * scriptPubKey: <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <normal script>
   *
   * @param lockTime 锁定时间（区块高度或 Unix 时间戳）
   * @param innerScript 内部脚本（锁定时间后执行）
   */
  static buildCLTVScript(lockTime: number, innerScript: Script): Script {
    const script = new Script()
    script.addData(ScriptBuilder.encodeNumber(lockTime))
    script.addOpCode(OpCode.OP_CHECKLOCKTIMEVERIFY)
    script.addOpCode(OpCode.OP_DROP)

    // 合并内部脚本
    for (const element of innerScript.getElements()) {
      if (element.type === 'opcode') {
        script.addOpCode(element.code)
      } else {
        script.addData(element.data)
      }
    }

    return script
  }

  // ============ 辅助方法 ============

  /**
   * 计算 HASH160 (SHA256 + RIPEMD160)
   */
  static hash160(data: string): string {
    const sha256 = Hash.sha256(data)
    return Hash.ripemd160(sha256)
  }

  /**
   * 数值转操作码（1-16）
   */
  static numberToOpCode(num: number): OpCode {
    if (num === 0) return OpCode.OP_0
    if (num >= 1 && num <= 16) {
      return (OpCode.OP_1 + num - 1) as OpCode
    }
    throw new Error(`数值超出操作码范围: ${num}`)
  }

  /**
   * 编码数值为脚本数据
   */
  static encodeNumber(num: number): string {
    if (num === 0) return ''

    const negative = num < 0
    let absNum = Math.abs(num)
    const bytes: number[] = []

    while (absNum > 0) {
      bytes.push(absNum & 0xff)
      absNum >>= 8
    }

    if (bytes[bytes.length - 1] & 0x80) {
      bytes.push(negative ? 0x80 : 0x00)
    } else if (negative) {
      bytes[bytes.length - 1] |= 0x80
    }

    return Buffer.from(bytes).toString('hex')
  }

  /**
   * 判断是否是 P2PKH 脚本
   */
  static isP2PKH(script: Script): boolean {
    const elements = script.getElements()
    return (
      elements.length === 5 &&
      elements[0].type === 'opcode' &&
      elements[0].code === OpCode.OP_DUP &&
      elements[1].type === 'opcode' &&
      elements[1].code === OpCode.OP_HASH160 &&
      elements[2].type === 'data' &&
      elements[3].type === 'opcode' &&
      elements[3].code === OpCode.OP_EQUALVERIFY &&
      elements[4].type === 'opcode' &&
      elements[4].code === OpCode.OP_CHECKSIG
    )
  }

  /**
   * 判断是否是 P2SH 脚本
   */
  static isP2SH(script: Script): boolean {
    const elements = script.getElements()
    return (
      elements.length === 3 &&
      elements[0].type === 'opcode' &&
      elements[0].code === OpCode.OP_HASH160 &&
      elements[1].type === 'data' &&
      elements[2].type === 'opcode' &&
      elements[2].code === OpCode.OP_EQUAL
    )
  }

  /**
   * 判断是否是 P2PK 脚本
   */
  static isP2PK(script: Script): boolean {
    const elements = script.getElements()
    return (
      elements.length === 2 &&
      elements[0].type === 'data' &&
      elements[1].type === 'opcode' &&
      elements[1].code === OpCode.OP_CHECKSIG
    )
  }

  /**
   * 判断是否是多签脚本
   */
  static isMultiSig(script: Script): boolean {
    const elements = script.getElements()
    if (elements.length < 4) return false

    const last = elements[elements.length - 1]
    return last.type === 'opcode' && last.code === OpCode.OP_CHECKMULTISIG
  }

  /**
   * 判断是否是 OP_RETURN 脚本
   */
  static isOpReturn(script: Script): boolean {
    const elements = script.getElements()
    return (
      elements.length >= 1 &&
      elements[0].type === 'opcode' &&
      elements[0].code === OpCode.OP_RETURN
    )
  }

  /**
   * 从 P2PKH 锁定脚本提取公钥哈希
   */
  static extractP2PKHPubKeyHash(script: Script): string | null {
    if (!ScriptBuilder.isP2PKH(script)) return null
    const elements = script.getElements()
    const dataElement = elements[2]
    if (dataElement.type === 'data') {
      return dataElement.data
    }
    return null
  }

  /**
   * 从 P2SH 锁定脚本提取脚本哈希
   */
  static extractP2SHScriptHash(script: Script): string | null {
    if (!ScriptBuilder.isP2SH(script)) return null
    const elements = script.getElements()
    const dataElement = elements[1]
    if (dataElement.type === 'data') {
      return dataElement.data
    }
    return null
  }

  /**
   * 获取脚本类型描述
   */
  static getScriptType(script: Script): string {
    if (ScriptBuilder.isP2PKH(script)) return 'P2PKH'
    if (ScriptBuilder.isP2SH(script)) return 'P2SH'
    if (ScriptBuilder.isP2PK(script)) return 'P2PK'
    if (ScriptBuilder.isMultiSig(script)) return 'MultiSig'
    if (ScriptBuilder.isOpReturn(script)) return 'OP_RETURN'
    return 'Unknown'
  }
}


