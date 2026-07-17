/**
 * 比特币脚本执行引擎
 * 实现基于栈的脚本语言解释器
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
 * 脚本执行上下文
 * 包含签名验证所需的信息
 */
export interface ScriptContext {
  /** 交易签名哈希（用于 CHECKSIG） */
  signatureHash?: string
  /** 是否启用调试模式 */
  debug?: boolean
}

/**
 * 脚本执行结果
 */
export interface ScriptResult {
  /** 是否执行成功 */
  success: boolean
  /** 错误信息（如果失败） */
  error?: string
  /** 最终栈状态 */
  stack: StackElement[]
  /** 执行的操作数 */
  opCount: number
}

/**
 * 脚本元素：操作码或数据
 */
export type ScriptElement =
  | {type: 'opcode'; code: OpCode}
  | {type: 'data'; data: string}

/**
 * 比特币脚本类
 */
export class Script {
  private elements: ScriptElement[] = []

  constructor(elements?: ScriptElement[]) {
    if (elements) {
      this.elements = elements
    }
  }

  /**
   * 添加操作码
   */
  addOpCode(code: OpCode): Script {
    this.elements.push({type: 'opcode', code})
    return this
  }

  /**
   * 添加数据（自动选择合适的推送方式）
   */
  addData(data: string): Script {
    this.elements.push({type: 'data', data})
    return this
  }

  /**
   * 获取脚本元素
   */
  getElements(): ScriptElement[] {
    return [...this.elements]
  }

  /**
   * 从十六进制字符串解析脚本
   */
  static fromHex(hex: string): Script {
    const script = new Script()
    const bytes = Buffer.from(hex, 'hex')
    let i = 0

    while (i < bytes.length) {
      const opcode = bytes[i]

      // 数据推送操作码 (0x01-0x4b)
      if (isDataPushOpCode(opcode)) {
        const dataLen = opcode
        i++
        if (i + dataLen > bytes.length) {
          throw new Error(`数据长度不足: 需要 ${dataLen} 字节`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA1
      else if (opcode === OpCode.OP_PUSHDATA1) {
        i++
        if (i >= bytes.length) throw new Error('OP_PUSHDATA1: 缺少长度字节')
        const dataLen = bytes[i]
        i++
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA1: 数据长度不足`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA2
      else if (opcode === OpCode.OP_PUSHDATA2) {
        i++
        if (i + 2 > bytes.length) throw new Error('OP_PUSHDATA2: 缺少长度字节')
        const dataLen = bytes.readUInt16LE(i)
        i += 2
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA2: 数据长度不足`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // OP_PUSHDATA4
      else if (opcode === OpCode.OP_PUSHDATA4) {
        i++
        if (i + 4 > bytes.length) throw new Error('OP_PUSHDATA4: 缺少长度字节')
        const dataLen = bytes.readUInt32LE(i)
        i += 4
        if (i + dataLen > bytes.length) {
          throw new Error(`OP_PUSHDATA4: 数据长度不足`)
        }
        const data = bytes.slice(i, i + dataLen).toString('hex')
        script.addData(data)
        i += dataLen
      }
      // 其他操作码
      else {
        script.addOpCode(opcode as OpCode)
        i++
      }
    }

    return script
  }

  /**
   * 序列化为十六进制字符串
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
          // 直接使用长度作为操作码
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
   * 转换为人类可读的字符串
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
   * 从 ASM 字符串解析
   */
  static fromAsm(asm: string): Script {
    const script = new Script()
    const tokens = asm.split(/\s+/).filter((t) => t.length > 0)

    for (const token of tokens) {
      // 数据 <hex>
      if (token.startsWith('<') && token.endsWith('>')) {
        const data = token.slice(1, -1).replace('...', '')
        script.addData(data)
      }
      // 操作码
      else if (token.startsWith('OP_')) {
        const code = OpCode[token as keyof typeof OpCode]
        if (code === undefined) {
          throw new Error(`未知操作码: ${token}`)
        }
        script.addOpCode(code)
      }
      // 十六进制数据
      else if (/^[0-9a-fA-F]+$/.test(token)) {
        script.addData(token)
      } else {
        throw new Error(`无法解析: ${token}`)
      }
    }

    return script
  }

  /**
   * 执行脚本
   */
  execute(context: ScriptContext = {}): ScriptResult {
    const stack = new Stack()
    const altStack = new Stack()
    let opCount = 0
    const maxOps = 201 // 比特币限制

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
          throw new Error(`超过最大操作数限制: ${maxOps}`)
        }

        if (context.debug) {
          console.log(`执行: ${getOpCodeName(opcode)}`)
        }

        this.executeOpCode(opcode, stack, altStack, context)
      }

      // 脚本成功：栈非空且栈顶为真
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
   * 执行单个操作码
   */
  private executeOpCode(
    opcode: OpCode,
    stack: Stack,
    altStack: Stack,
    context: ScriptContext
  ): void {
    switch (opcode) {
      // ============ 常量 ============
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

      // ============ 流程控制 ============
      case OpCode.OP_NOP:
        // 无操作
        break

      case OpCode.OP_VERIFY: {
        const top = stack.pop()
        if (!StackUtils.isTrue(top)) {
          throw new Error('OP_VERIFY 失败')
        }
        break
      }

      case OpCode.OP_RETURN:
        throw new Error('OP_RETURN: 脚本无效')

      // ============ 栈操作 ============
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

      // ============ 字符串操作 ============
      case OpCode.OP_SIZE: {
        const top = stack.peek()
        const size = Buffer.from(top, 'hex').length
        stack.push(StackUtils.encodeNumber(size))
        break
      }

      // ============ 位运算 ============
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
          throw new Error('OP_EQUALVERIFY 失败')
        }
        break
      }

      // ============ 算术运算 ============
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
          throw new Error('OP_NUMEQUALVERIFY 失败')
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

      // ============ 加密操作 ============
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
        // 双重 SHA256
        const data = stack.pop()
        const hash = Hash.doubleSha256(data)
        stack.push(hash)
        break
      }

      case OpCode.OP_CHECKSIG: {
        const publicKey = stack.pop()
        const signature = stack.pop()

        if (!context.signatureHash) {
          throw new Error('OP_CHECKSIG: 缺少签名哈希')
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
          throw new Error('OP_CHECKSIGVERIFY: 缺少签名哈希')
        }

        const isValid = Signature.verify(
          context.signatureHash,
          signature,
          publicKey
        )
        if (!isValid) {
          throw new Error('OP_CHECKSIGVERIFY 失败')
        }
        break
      }

      case OpCode.OP_CHECKMULTISIG: {
        // 多重签名验证
        // 栈顺序（从栈顶到栈底）：n, pubKey_n, ..., pubKey_1, m, sig_m, ..., sig_1, dummy
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

        // 比特币的 CHECKMULTISIG 有一个 bug，会多弹出一个元素
        stack.pop() // dummy element

        if (!context.signatureHash) {
          throw new Error('OP_CHECKMULTISIG: 缺少签名哈希')
        }

        // 验证签名（按顺序匹配）
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
        // 与 OP_CHECKMULTISIG 相同，但验证失败则抛出错误
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
          throw new Error('OP_CHECKMULTISIGVERIFY: 缺少签名哈希')
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
          throw new Error('OP_CHECKMULTISIGVERIFY 失败')
        }
        break
      }

      default:
        throw new Error(`未实现的操作码: ${getOpCodeName(opcode)}`)
    }
  }

  /**
   * 合并两个脚本（用于组合 scriptSig 和 scriptPubKey）
   */
  static combine(scriptSig: Script, scriptPubKey: Script): Script {
    const combined = new Script()
    combined.elements = [...scriptSig.elements, ...scriptPubKey.elements]
    return combined
  }

  /**
   * 验证脚本（组合 scriptSig 和 scriptPubKey 后执行）
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
   * 克隆脚本
   */
  clone(): Script {
    return new Script([...this.elements])
  }

  /**
   * 脚本长度（字节）
   */
  get length(): number {
    return Buffer.from(this.toHex(), 'hex').length
  }

  /**
   * 是否为空脚本
   */
  isEmpty(): boolean {
    return this.elements.length === 0
  }
}


