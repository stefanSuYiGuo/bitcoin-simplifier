/**
 * Bitcoin Script execution engine.
 * Implements a stack-based scripting language interpreter.
 */

import {Stack, StackElement, StackUtils} from './Stack'
import {
  OpCode,
  getOpCodeName,
  isDataPushOpCode,
  getNumberFromOpCode,
} from './OpCodes'
import {Hash} from '../crypto'
import {Signature} from '../crypto/signature'

/**
 * Script execution context.
 * Contains information required for signature verification.
 */
export interface ScriptContext {
  /** Transaction signature hash used by CHECKSIG. */
  signatureHash?: string
  /** Whether debug mode is enabled. */
  debug?: boolean
}

/**
 * Script execution result.
 */
export interface ScriptResult {
  /** Whether execution succeeded. */
  success: boolean
  /** Error message when execution fails. */
  error?: string
  /** Final stack state. */
  stack: StackElement[]
  /** Number of executed operations. */
  opCount: number
}

/**
 * Script element containing an opcode or data.
 */
export type ScriptElement =
  | {type: 'opcode'; code: OpCode}
  | {type: 'data'; data: string}

/**
 * Bitcoin Script implementation.
 */
export class Script {
  private elements: ScriptElement[] = []

  constructor(elements?: ScriptElement[]) {
    if (elements) {
      this.elements = elements
    }
  }

  /**
   * Add an opcode.
   */
  addOpCode(code: OpCode): Script {
    this.elements.push({type: 'opcode', code})
    return this
  }

  /**
   * Add data using the appropriate push operation automatically.
   */
  addData(data: string): Script {
    this.elements.push({type: 'data', data})
    return this
  }

  /**
   * Get the script elements.
   */
  getElements(): ScriptElement[] {
    return [...this.elements]
  }

  /**
   * Parse a script from a hexadecimal string.
   */
  static fromHex(hex: string): Script {
    const script = new Script()
    const bytes = Buffer.from(hex, 'hex')
    let i = 0

    while (i < bytes.length) {
      const opcode = bytes[i]

      // Data-push opcodes (0x01-0x4b)
      if (isDataPushOpCode(opcode)) {
        const dataLen = opcode
        i++
        if (i + dataLen > bytes.length) {
          throw new Error(`Insufficient data: ${dataLen} bytes required`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA1
      else if (opcode === OpCode.OP_PUSHDATA1) {
        i++
        if (i >= bytes.length) throw new Error('OP_PUSHDATA1: missing length byte')
        const dataLen = bytes[i]
        i++
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA1: insufficient data`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA2
      else if (opcode === OpCode.OP_PUSHDATA2) {
        i++
        if (i + 2 > bytes.length) throw new Error('OP_PUSHDATA2: missing length bytes')
        const dataLen = bytes.readUInt16LE(i)
        i += 2
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA2: insufficient data`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA4
      else if (opcode === OpCode.OP_PUSHDATA4) {
        i++
        if (i + 4 > bytes.length) throw new Error('OP_PUSHDATA4: missing length bytes')
        const dataLen = bytes.readUInt32LE(i)
        i += 4
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA4: insufficient data`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // Other opcodes
      else {
        script.addOpCode(opcode as OpCode)
        i++
      }
    }

    return script
  }

  /**
   * Serialize the script to a hexadecimal string.
   */
  toHex(): string {
    const parts: Buffer[] = []

    for (const element of this.elements) {
      if (element.type === 'opcode') {
        parts.push(Buffer.from([element.code]))
      } else {
        const data = Buffer.from(element.data, 'hex')
        const len = data.length

        if (len <= 0x4b) {
          // Use the length directly as the opcode
          parts.push(Buffer.from([len]))
        } else if (len <= 0xff) {
          parts.push(Buffer.from([OpCode.OP_PUSHDATA1, len]))
        } else if (len <= 0xffff) {
          const lenBuf = Buffer.alloc(3)
          lenBuf[0] = OpCode.OP_PUSHDATA2
          lenBuf.writeUInt16LE(len, 1)
          parts.push(lenBuf)
        } else {
          const lenBuf = Buffer.alloc(5)
          lenBuf[0] = OpCode.OP_PUSHDATA4
          lenBuf.writeUInt32LE(len, 1)
          parts.push(lenBuf)
        }
        parts.push(data)
      }
    }

    return Buffer.concat(parts).toString('hex')
  }

  /**
   * Convert the script to a human-readable string.
   */
  toAsm(): string {
    return this.elements
      .map((el) => {
        if (el.type === 'opcode') {
          return getOpCodeName(el.code)
        } else {
          return `<${
            el.data.length > 40 ? el.data.substring(0, 40) + '...' : el.data
          }>`
        }
      })
      .join(' ')
  }

  /**
   * Parse a script from an ASM string.
   */
  static fromAsm(asm: string): Script {
    const script = new Script()
    const tokens = asm.split(/\s+/).filter((t) => t.length > 0)

    for (const token of tokens) {
      // Data in <hex> form
      if (token.startsWith('<') && token.endsWith('>')) {
        const data = token.slice(1, -1).replace('...', '')
        script.addData(data)
      }
      // Opcode
      else if (token.startsWith('OP_')) {
        const code = OpCode[token as keyof typeof OpCode]
        if (code === undefined) {
          throw new Error(`Unknown opcode: ${token}`)
        }
        script.addOpCode(code)
      }
      // Hexadecimal data
      else if (/^[0-9a-fA-F]+$/.test(token)) {
        script.addData(token)
      } else {
        throw new Error(`Unable to parse: ${token}`)
      }
    }

    return script
  }

  /**
   * Execute the script.
   */
  execute(context: ScriptContext = {}): ScriptResult {
    const stack = new Stack()
    const altStack = new Stack()
    let opCount = 0
    const maxOps = 201 // Bitcoin limit

    try {
      for (const element of this.elements) {
        if (element.type === 'data') {
          stack.push(element.data)
          if (context.debug) {
            console.log(`PUSH: ${element.data.substring(0, 20)}...`)
          }
          continue
        }

        const opcode = element.code
        opCount++

        if (opCount > maxOps) {
          throw new Error(`Maximum operation count exceeded: ${maxOps}`)
        }

        if (context.debug) {
          console.log(`Execute: ${getOpCodeName(opcode)}`)
        }

        this.executeOpCode(opcode, stack, altStack, context)
      }

      // A script succeeds when the stack is nonempty and its top item is true
      const success = !stack.isEmpty() && StackUtils.isTrue(stack.peek())

      return {
        success,
        stack: stack.getItems(),
        opCount,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: stack.getItems(),
        opCount,
      }
    }
  }

  /**
   * Execute a single opcode.
   */
  private executeOpCode(
    opcode: OpCode,
    stack: Stack,
    altStack: Stack,
    context: ScriptContext
  ): void {
    switch (opcode) {
      // ============ Constants ============
      case OpCode.OP_0:
      case OpCode.OP_FALSE:
        stack.push('')
        break

      case OpCode.OP_1NEGATE:
        stack.push(StackUtils.encodeNumber(-1))
        break

      case OpCode.OP_1:
      case OpCode.OP_TRUE:
      case OpCode.OP_2:
      case OpCode.OP_3:
      case OpCode.OP_4:
      case OpCode.OP_5:
      case OpCode.OP_6:
      case OpCode.OP_7:
      case OpCode.OP_8:
      case OpCode.OP_9:
      case OpCode.OP_10:
      case OpCode.OP_11:
      case OpCode.OP_12:
      case OpCode.OP_13:
      case OpCode.OP_14:
      case OpCode.OP_15:
      case OpCode.OP_16:
        stack.push(StackUtils.encodeNumber(getNumberFromOpCode(opcode)))
        break

      // ============ Flow control ============
      case OpCode.OP_NOP:
        // No operation
        break

      case OpCode.OP_VERIFY: {
        const top = stack.pop()
        if (!StackUtils.isTrue(top)) {
          throw new Error('OP_VERIFY failed')
        }
        break
      }

      case OpCode.OP_RETURN:
        throw new Error('OP_RETURN: invalid script')

      // ============ Stack operations ============
      case OpCode.OP_TOALTSTACK:
        altStack.push(stack.pop())
        break

      case OpCode.OP_FROMALTSTACK:
        stack.push(altStack.pop())
        break

      case OpCode.OP_IFDUP: {
        const top = stack.peek()
        if (StackUtils.isTrue(top)) {
          stack.dup()
        }
        break
      }

      case OpCode.OP_DEPTH:
        stack.push(StackUtils.encodeNumber(stack.size()))
        break

      case OpCode.OP_DROP:
        stack.pop()
        break

      case OpCode.OP_DUP:
        stack.dup()
        break

      case OpCode.OP_NIP:
        stack.nip()
        break

      case OpCode.OP_OVER:
        stack.over()
        break

      case OpCode.OP_PICK: {
        const n = StackUtils.decodeNumber(stack.pop())
        stack.pick(n)
        break
      }

      case OpCode.OP_ROLL: {
        const n = StackUtils.decodeNumber(stack.pop())
        stack.roll(n)
        break
      }

      case OpCode.OP_ROT:
        stack.rot()
        break

      case OpCode.OP_SWAP:
        stack.swap()
        break

      case OpCode.OP_TUCK:
        stack.tuck()
        break

      case OpCode.OP_2DROP:
        stack.drop2()
        break

      case OpCode.OP_2DUP:
        stack.dup2()
        break

      case OpCode.OP_3DUP:
        stack.dup3()
        break

      case OpCode.OP_2OVER:
        stack.over2()
        break

      case OpCode.OP_2SWAP:
        stack.swap2()
        break

      // ============ String operations ============
      case OpCode.OP_SIZE: {
        const top = stack.peek()
        const size = Buffer.from(top, 'hex').length
        stack.push(StackUtils.encodeNumber(size))
        break
      }

      // ============ Bitwise operations ============
      case OpCode.OP_EQUAL: {
        const b = stack.pop()
        const a = stack.pop()
        stack.push(StackUtils.encodeBool(a === b))
        break
      }

      case OpCode.OP_EQUALVERIFY: {
        const b = stack.pop()
        const a = stack.pop()
        if (a !== b) {
          throw new Error('OP_EQUALVERIFY failed')
        }
        break
      }

      // ============ Arithmetic operations ============
      case OpCode.OP_1ADD: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a + 1))
        break
      }

      case OpCode.OP_1SUB: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a - 1))
        break
      }

      case OpCode.OP_NEGATE: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(-a))
        break
      }

      case OpCode.OP_ABS: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(Math.abs(a)))
        break
      }

      case OpCode.OP_NOT: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a === 0 ? 1 : 0))
        break
      }

      case OpCode.OP_0NOTEQUAL: {
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a !== 0 ? 1 : 0))
        break
      }

      case OpCode.OP_ADD: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a + b))
        break
      }

      case OpCode.OP_SUB: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a - b))
        break
      }

      case OpCode.OP_BOOLAND: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a !== 0 && b !== 0 ? 1 : 0))
        break
      }

      case OpCode.OP_BOOLOR: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a !== 0 || b !== 0 ? 1 : 0))
        break
      }

      case OpCode.OP_NUMEQUAL: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a === b ? 1 : 0))
        break
      }

      case OpCode.OP_NUMEQUALVERIFY: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        if (a !== b) {
          throw new Error('OP_NUMEQUALVERIFY failed')
        }
        break
      }

      case OpCode.OP_NUMNOTEQUAL: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a !== b ? 1 : 0))
        break
      }

      case OpCode.OP_LESSTHAN: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a < b ? 1 : 0))
        break
      }

      case OpCode.OP_GREATERTHAN: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a > b ? 1 : 0))
        break
      }

      case OpCode.OP_LESSTHANOREQUAL: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a <= b ? 1 : 0))
        break
      }

      case OpCode.OP_GREATERTHANOREQUAL: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(a >= b ? 1 : 0))
        break
      }

      case OpCode.OP_MIN: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(Math.min(a, b)))
        break
      }

      case OpCode.OP_MAX: {
        const b = StackUtils.decodeNumber(stack.pop())
        const a = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(Math.max(a, b)))
        break
      }

      case OpCode.OP_WITHIN: {
        const max = StackUtils.decodeNumber(stack.pop())
        const min = StackUtils.decodeNumber(stack.pop())
        const x = StackUtils.decodeNumber(stack.pop())
        stack.push(StackUtils.encodeNumber(x >= min && x < max ? 1 : 0))
        break
      }

      // ============ Cryptographic operations ============
      case OpCode.OP_RIPEMD160: {
        const data = stack.pop()
        const hash = Hash.ripemd160(data)
        stack.push(hash)
        break
      }

      case OpCode.OP_SHA256: {
        const data = stack.pop()
        const hash = Hash.sha256(data)
        stack.push(hash)
        break
      }

      case OpCode.OP_HASH160: {
        // SHA256 + RIPEMD160
        const data = stack.pop()
        const sha256Hash = Hash.sha256(data)
        const hash = Hash.ripemd160(sha256Hash)
        stack.push(hash)
        break
      }

      case OpCode.OP_HASH256: {
        // Double SHA-256
        const data = stack.pop()
        const hash = Hash.doubleSha256(data)
        stack.push(hash)
        break
      }

      case OpCode.OP_CHECKSIG: {
        const publicKey = stack.pop()
        const signature = stack.pop()

        if (!context.signatureHash) {
          throw new Error('OP_CHECKSIG: missing signature hash')
        }

        const isValid = Signature.verify(
          context.signatureHash,
          signature,
          publicKey
        )
        stack.push(StackUtils.encodeBool(isValid))
        break
      }

      case OpCode.OP_CHECKSIGVERIFY: {
        const publicKey = stack.pop()
        const signature = stack.pop()

        if (!context.signatureHash) {
          throw new Error('OP_CHECKSIGVERIFY: missing signature hash')
        }

        const isValid = Signature.verify(
          context.signatureHash,
          signature,
          publicKey
        )
        if (!isValid) {
          throw new Error('OP_CHECKSIGVERIFY failed')
        }
        break
      }

      case OpCode.OP_CHECKMULTISIG: {
        // Multisignature verification
        // Stack order from top to bottom: n, pubKey_n, ..., pubKey_1, m, sig_m, ..., sig_1, dummy
        const n = StackUtils.decodeNumber(stack.pop())
        const publicKeys: string[] = []
        for (let i = 0; i < n; i++) {
          publicKeys.push(stack.pop())
        }

        const m = StackUtils.decodeNumber(stack.pop())
        const signatures: string[] = []
        for (let i = 0; i < m; i++) {
          signatures.push(stack.pop())
        }

        // Bitcoin's CHECKMULTISIG bug consumes one extra stack item
        stack.pop() // dummy element

        if (!context.signatureHash) {
          throw new Error('OP_CHECKMULTISIG: missing signature hash')
        }

        // Verify signatures in order
        let sigIndex = 0
        let keyIndex = 0
        while (sigIndex < m && keyIndex < n) {
          const isValid = Signature.verify(
            context.signatureHash,
            signatures[sigIndex],
            publicKeys[keyIndex]
          )
          if (isValid) {
            sigIndex++
          }
          keyIndex++
        }

        const success = sigIndex === m
        stack.push(StackUtils.encodeBool(success))
        break
      }

      case OpCode.OP_CHECKMULTISIGVERIFY: {
        // Same as OP_CHECKMULTISIG, but throws when verification fails
        const n = StackUtils.decodeNumber(stack.pop())
        const publicKeys: string[] = []
        for (let i = 0; i < n; i++) {
          publicKeys.push(stack.pop())
        }

        const m = StackUtils.decodeNumber(stack.pop())
        const signatures: string[] = []
        for (let i = 0; i < m; i++) {
          signatures.push(stack.pop())
        }

        stack.pop() // dummy element

        if (!context.signatureHash) {
          throw new Error('OP_CHECKMULTISIGVERIFY: missing signature hash')
        }

        let sigIndex = 0
        let keyIndex = 0
        while (sigIndex < m && keyIndex < n) {
          const isValid = Signature.verify(
            context.signatureHash,
            signatures[sigIndex],
            publicKeys[keyIndex]
          )
          if (isValid) {
            sigIndex++
          }
          keyIndex++
        }

        if (sigIndex !== m) {
          throw new Error('OP_CHECKMULTISIGVERIFY failed')
        }
        break
      }

      default:
        throw new Error(`Unimplemented opcode: ${getOpCodeName(opcode)}`)
    }
  }

  /**
   * Combine scriptSig and scriptPubKey.
   */
  static combine(scriptSig: Script, scriptPubKey: Script): Script {
    const combined = new Script()
    combined.elements = [...scriptSig.elements, ...scriptPubKey.elements]
    return combined
  }

  /**
   * Verify a script by combining and executing scriptSig and scriptPubKey.
   */
  static verify(
    scriptSig: Script,
    scriptPubKey: Script,
    context: ScriptContext
  ): ScriptResult {
    const combined = Script.combine(scriptSig, scriptPubKey)
    return combined.execute(context)
  }

  /**
   * Clone the script.
   */
  clone(): Script {
    return new Script([...this.elements])
  }

  /**
   * Script length in bytes.
   */
  get length(): number {
    return Buffer.from(this.toHex(), 'hex').length
  }

  /**
   * Check whether the script is empty.
   */
  isEmpty(): boolean {
    return this.elements.length === 0
  }
}


