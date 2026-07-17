/**
 * Script builder.
 * Provides convenient methods for constructing common script types.
 */

import {Script} from './Script'
import {OpCode} from './OpCodes'
import {Hash} from '../crypto'

/**
 * Script builder.
 */
export class ScriptBuilder {
  /**
   * Build a P2PKH locking script (Pay-to-Public-Key-Hash).
   * scriptPubKey: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
   *
   * @param pubKeyHash 20-byte public key hash in hexadecimal form.
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
   * Build a P2PKH unlocking script.
   * scriptSig: <signature> <publicKey>
   *
   * @param signature DER-encoded signature in hexadecimal form.
   * @param publicKey Public key in hexadecimal form.
   */
  static buildP2PKHUnlockingScript(
    signature: string,
    publicKey: string
  ): Script {
    return new Script().addData(signature).addData(publicKey)
  }

  /**
   * Build a P2PKH locking script from a public key.
   *
   * @param publicKey Public key in hexadecimal form.
   */
  static buildP2PKHFromPublicKey(publicKey: string): Script {
    const pubKeyHash = ScriptBuilder.hash160(publicKey)
    return ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
  }

  /**
   * Build a P2PKH locking script from an address.
   * The address must first be decoded into a public key hash.
   *
   * @param address Base58 address.
   */
  static buildP2PKHFromAddress(pubKeyHash: string): Script {
    return ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
  }

  /**
   * Build a P2SH locking script (Pay-to-Script-Hash).
   * scriptPubKey: OP_HASH160 <scriptHash> OP_EQUAL
   *
   * @param scriptHash 20-byte redeem script hash in hexadecimal form.
   */
  static buildP2SHLockingScript(scriptHash: string): Script {
    return new Script()
      .addOpCode(OpCode.OP_HASH160)
      .addData(scriptHash)
      .addOpCode(OpCode.OP_EQUAL)
  }

  /**
   * Build a P2SH unlocking script.
   * scriptSig: <data...> <redeemScript>
   *
   * @param data Unlocking data such as signatures.
   * @param redeemScript Serialized redeem script in hexadecimal form.
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
   * Build a P2SH locking script from a redeem script.
   *
   * @param redeemScript Redeem script.
   */
  static buildP2SHFromRedeemScript(redeemScript: Script): Script {
    const scriptHash = ScriptBuilder.hash160(redeemScript.toHex())
    return ScriptBuilder.buildP2SHLockingScript(scriptHash)
  }

  /**
   * Build an m-of-n multisignature redeem script.
   * script: <m> <pubKey1> <pubKey2> ... <pubKeyN> <n> OP_CHECKMULTISIG
   *
   * @param m Number of required signatures.
   * @param publicKeys List of public keys.
   */
  static buildMultiSigScript(m: number, publicKeys: string[]): Script {
    const n = publicKeys.length

    if (m < 1 || m > n) {
      throw new Error(`Invalid multisignature parameters: ${m}-of-${n}`)
    }
    if (n > 16) {
      throw new Error('The number of public keys cannot exceed 16')
    }

    const script = new Script()

    // Add m
    script.addOpCode(ScriptBuilder.numberToOpCode(m))

    // Add all public keys
    for (const pubKey of publicKeys) {
      script.addData(pubKey)
    }

    // Add n
    script.addOpCode(ScriptBuilder.numberToOpCode(n))

    // Add OP_CHECKMULTISIG
    script.addOpCode(OpCode.OP_CHECKMULTISIG)

    return script
  }

  /**
   * Build a multisignature unlocking script.
   * scriptSig: OP_0 <sig1> <sig2> ... <sigM>
   * OP_0 is required because of the OP_CHECKMULTISIG bug.
   *
   * @param signatures List of signatures.
   */
  static buildMultiSigUnlockingScript(signatures: string[]): Script {
    const script = new Script()

    // The CHECKMULTISIG bug requires an extra dummy element
    script.addOpCode(OpCode.OP_0)

    // Add all signatures
    for (const sig of signatures) {
      script.addData(sig)
    }

    return script
  }

  /**
   * Build a P2SH multisignature locking script.
   *
   * @param m Number of required signatures.
   * @param publicKeys List of public keys.
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
   * Build a P2SH multisignature unlocking script.
   *
   * @param signatures List of signatures.
   * @param redeemScript Redeem script.
   */
  static buildP2SHMultiSigUnlockingScript(
    signatures: string[],
    redeemScript: Script
  ): Script {
    const script = new Script()

    // Dummy element required by the CHECKMULTISIG bug
    script.addOpCode(OpCode.OP_0)

    // Add signatures
    for (const sig of signatures) {
      script.addData(sig)
    }

    // Add the redeem script
    script.addData(redeemScript.toHex())

    return script
  }

  /**
   * Build a P2PK locking script (Pay-to-Public-Key).
   * scriptPubKey: <publicKey> OP_CHECKSIG
   * This older script type is now uncommon.
   *
   * @param publicKey Public key in hexadecimal form.
   */
  static buildP2PKLockingScript(publicKey: string): Script {
    return new Script().addData(publicKey).addOpCode(OpCode.OP_CHECKSIG)
  }

  /**
   * Build a P2PK unlocking script.
   * scriptSig: <signature>
   *
   * @param signature Signature in hexadecimal form.
   */
  static buildP2PKUnlockingScript(signature: string): Script {
    return new Script().addData(signature)
  }

  /**
   * Build an OP_RETURN script that stores data and makes the output unspendable.
   * scriptPubKey: OP_RETURN <data>
   *
   * @param data Data to store in hexadecimal form.
   */
  static buildOpReturnScript(data: string): Script {
    return new Script().addOpCode(OpCode.OP_RETURN).addData(data)
  }

  /**
   * Build a time-locked CLTV script.
   * scriptPubKey: <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <normal script>
   *
   * @param lockTime Lock time as a block height or Unix timestamp.
   * @param innerScript Inner script executed after the lock time.
   */
  static buildCLTVScript(lockTime: number, innerScript: Script): Script {
    const script = new Script()
    script.addData(ScriptBuilder.encodeNumber(lockTime))
    script.addOpCode(OpCode.OP_CHECKLOCKTIMEVERIFY)
    script.addOpCode(OpCode.OP_DROP)

    // Append the inner script
    for (const element of innerScript.getElements()) {
      if (element.type === 'opcode') {
        script.addOpCode(element.code)
      } else {
        script.addData(element.data)
      }
    }

    return script
  }

  // ============ Helper methods ============

  /**
   * Calculate HASH160 (SHA-256 + RIPEMD-160).
   */
  static hash160(data: string): string {
    const sha256 = Hash.sha256(data)
    return Hash.ripemd160(sha256)
  }

  /**
   * Convert a number from 1 through 16 to an opcode.
   */
  static numberToOpCode(num: number): OpCode {
    if (num === 0) return OpCode.OP_0
    if (num >= 1 && num <= 16) {
      return (OpCode.OP_1 + num - 1) as OpCode
    }
    throw new Error(`Value is outside the opcode range: ${num}`)
  }

  /**
   * Encode a number as script data.
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
   * Check whether a script is P2PKH.
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
   * Check whether a script is P2SH.
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
   * Check whether a script is P2PK.
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
   * Check whether a script is multisignature.
   */
  static isMultiSig(script: Script): boolean {
    const elements = script.getElements()
    if (elements.length < 4) return false

    const last = elements[elements.length - 1]
    return last.type === 'opcode' && last.code === OpCode.OP_CHECKMULTISIG
  }

  /**
   * Check whether a script is OP_RETURN.
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
   * Extract the public key hash from a P2PKH locking script.
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
   * Extract the script hash from a P2SH locking script.
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
   * Get the script type description.
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


