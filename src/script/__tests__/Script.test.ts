import {Script, ScriptBuilder, OpCode, Stack, StackUtils} from '../index'
import {Signature} from '../../crypto/signature'
import {Hash} from '../../crypto'

describe('Stack', () => {
  test('基本压栈和弹栈操作', () => {
    const stack = new Stack()
    stack.push('01')
    stack.push('02')
    stack.push('03')

    expect(stack.size()).toBe(3)
    expect(stack.pop()).toBe('03')
    expect(stack.pop()).toBe('02')
    expect(stack.pop()).toBe('01')
    expect(stack.isEmpty()).toBe(true)
  })

  test('dup 复制栈顶', () => {
    const stack = new Stack()
    stack.push('abc')
    stack.dup()

    expect(stack.size()).toBe(2)
    expect(stack.pop()).toBe('abc')
    expect(stack.pop()).toBe('abc')
  })

  test('swap 交换栈顶两个元素', () => {
    const stack = new Stack()
    stack.push('01')
    stack.push('02')
    stack.swap()

    expect(stack.pop()).toBe('01')
    expect(stack.pop()).toBe('02')
  })

  test('rot 旋转栈顶三个元素', () => {
    const stack = new Stack()
    stack.push('01')
    stack.push('02')
    stack.push('03')
    stack.rot()

    expect(stack.pop()).toBe('01')
    expect(stack.pop()).toBe('03')
    expect(stack.pop()).toBe('02')
  })

  test('栈溢出检测', () => {
    const stack = new Stack(3)
    stack.push('01')
    stack.push('02')
    stack.push('03')

    expect(() => stack.push('04')).toThrow('栈溢出')
  })
})

describe('StackUtils', () => {
  test('数值编码解码', () => {
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(0))).toBe(0)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(1))).toBe(1)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(127))).toBe(127)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(128))).toBe(128)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(255))).toBe(255)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(-1))).toBe(-1)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(-127))).toBe(-127)
  })

  test('布尔值判断', () => {
    expect(StackUtils.isTrue('')).toBe(false)
    expect(StackUtils.isTrue('00')).toBe(false)
    expect(StackUtils.isTrue('0000')).toBe(false)
    expect(StackUtils.isTrue('01')).toBe(true)
    expect(StackUtils.isTrue('ff')).toBe(true)
    expect(StackUtils.isTrue('80')).toBe(false) // 负零
  })
})

describe('OpCode', () => {
  test('数字操作码', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_1)
      .addOpCode(OpCode.OP_2)
      .addOpCode(OpCode.OP_ADD)

    const result = script.execute()

    expect(result.success).toBe(true)
    expect(StackUtils.decodeNumber(result.stack[0])).toBe(3)
  })

  test('OP_DUP', () => {
    const script = new Script().addData('abcd').addOpCode(OpCode.OP_DUP)

    const result = script.execute()

    expect(result.success).toBe(true)
    expect(result.stack.length).toBe(2)
    expect(result.stack[0]).toBe('abcd')
    expect(result.stack[1]).toBe('abcd')
  })

  test('OP_EQUAL', () => {
    const script1 = new Script()
      .addData('abc')
      .addData('abc')
      .addOpCode(OpCode.OP_EQUAL)

    expect(script1.execute().success).toBe(true)

    const script2 = new Script()
      .addData('abc')
      .addData('def')
      .addOpCode(OpCode.OP_EQUAL)

    expect(script2.execute().success).toBe(false)
  })

  test('OP_HASH160', () => {
    const data =
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    const script = new Script().addData(data).addOpCode(OpCode.OP_HASH160)

    const result = script.execute()

    expect(result.success).toBe(true)
    // 验证 HASH160 = RIPEMD160(SHA256(data))
    const expected = Hash.ripemd160(Hash.sha256(data))
    expect(result.stack[0]).toBe(expected)
  })

  test('OP_VERIFY 成功', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_1)
      .addOpCode(OpCode.OP_VERIFY)
      .addOpCode(OpCode.OP_1)

    const result = script.execute()

    expect(result.success).toBe(true)
  })

  test('OP_VERIFY 失败', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_0)
      .addOpCode(OpCode.OP_VERIFY)

    const result = script.execute()

    expect(result.success).toBe(false)
    expect(result.error).toContain('OP_VERIFY')
  })

  test('算术运算', () => {
    // 5 + 3 = 8
    const script1 = new Script()
      .addOpCode(OpCode.OP_5)
      .addOpCode(OpCode.OP_3)
      .addOpCode(OpCode.OP_ADD)

    expect(StackUtils.decodeNumber(script1.execute().stack[0])).toBe(8)

    // 5 - 3 = 2
    const script2 = new Script()
      .addOpCode(OpCode.OP_5)
      .addOpCode(OpCode.OP_3)
      .addOpCode(OpCode.OP_SUB)

    expect(StackUtils.decodeNumber(script2.execute().stack[0])).toBe(2)

    // 5 < 3 = false
    const script3 = new Script()
      .addOpCode(OpCode.OP_5)
      .addOpCode(OpCode.OP_3)
      .addOpCode(OpCode.OP_LESSTHAN)

    expect(script3.execute().success).toBe(false)

    // 3 < 5 = true
    const script4 = new Script()
      .addOpCode(OpCode.OP_3)
      .addOpCode(OpCode.OP_5)
      .addOpCode(OpCode.OP_LESSTHAN)

    expect(script4.execute().success).toBe(true)
  })
})

describe('Script 序列化', () => {
  test('toHex 和 fromHex', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_DUP)
      .addOpCode(OpCode.OP_HASH160)
      .addData('89abcdefabbaabbaabbaabbaabbaabbaabbaabba')
      .addOpCode(OpCode.OP_EQUALVERIFY)
      .addOpCode(OpCode.OP_CHECKSIG)

    const hex = script.toHex()
    const parsed = Script.fromHex(hex)

    expect(parsed.toHex()).toBe(hex)
  })

  test('toAsm', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_DUP)
      .addOpCode(OpCode.OP_HASH160)
      .addData('abcd')
      .addOpCode(OpCode.OP_EQUALVERIFY)
      .addOpCode(OpCode.OP_CHECKSIG)

    const asm = script.toAsm()

    expect(asm).toContain('OP_DUP')
    expect(asm).toContain('OP_HASH160')
    expect(asm).toContain('OP_EQUALVERIFY')
    expect(asm).toContain('OP_CHECKSIG')
  })
})

describe('ScriptBuilder', () => {
  test('构建 P2PKH 锁定脚本', () => {
    const pubKeyHash = '89abcdefabbaabbaabbaabbaabbaabbaabbaabba'
    const script = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

    expect(ScriptBuilder.isP2PKH(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('P2PKH')
    expect(ScriptBuilder.extractP2PKHPubKeyHash(script)).toBe(pubKeyHash)
  })

  test('构建 P2SH 锁定脚本', () => {
    const scriptHash = '89abcdefabbaabbaabbaabbaabbaabbaabbaabba'
    const script = ScriptBuilder.buildP2SHLockingScript(scriptHash)

    expect(ScriptBuilder.isP2SH(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('P2SH')
    expect(ScriptBuilder.extractP2SHScriptHash(script)).toBe(scriptHash)
  })

  test('构建多签脚本', () => {
    const pubKey1 =
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    const pubKey2 =
      '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9'
    const pubKey3 =
      '03a04f7c8d98c35cfe0b1e5c94f0c3a1b8f2f8b9a8e7d6c5b4a3f2e1d0c9b8a7f6'

    const script = ScriptBuilder.buildMultiSigScript(2, [
      pubKey1,
      pubKey2,
      pubKey3,
    ])

    expect(ScriptBuilder.isMultiSig(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('MultiSig')
  })

  test('构建 P2SH 多签', () => {
    const pubKey1 =
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    const pubKey2 =
      '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9'

    const {lockingScript, redeemScript} = ScriptBuilder.buildP2SHMultiSig(2, [
      pubKey1,
      pubKey2,
    ])

    expect(ScriptBuilder.isP2SH(lockingScript)).toBe(true)
    expect(ScriptBuilder.isMultiSig(redeemScript)).toBe(true)
  })

  test('构建 OP_RETURN 脚本', () => {
    const data = Buffer.from('Hello Bitcoin!').toString('hex')
    const script = ScriptBuilder.buildOpReturnScript(data)

    expect(ScriptBuilder.isOpReturn(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('OP_RETURN')
  })
})

describe('P2PKH 完整验证', () => {
  test('签名验证', () => {
    // 生成密钥对
    const {privateKey, publicKey} = Signature.generateKeyPair()
    const pubKeyHash = ScriptBuilder.hash160(publicKey)

    // 构建锁定脚本
    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

    // 模拟交易签名
    const txHash = Hash.sha256('test transaction data')
    const signature = Signature.sign(txHash, privateKey)

    // 构建解锁脚本
    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature,
      publicKey
    )

    // 验证脚本
    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(true)
  })

  test('错误的签名应该失败', () => {
    const {publicKey} = Signature.generateKeyPair()
    const {privateKey: wrongPrivateKey} = Signature.generateKeyPair()
    const pubKeyHash = ScriptBuilder.hash160(publicKey)

    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

    const txHash = Hash.sha256('test transaction data')
    const wrongSignature = Signature.sign(txHash, wrongPrivateKey)

    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      wrongSignature,
      publicKey
    )

    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash,
    })

    // 签名验证会失败，因为用了错误的私钥
    expect(result.success).toBe(false)
  })

  test('错误的公钥哈希应该失败', () => {
    const {privateKey, publicKey} = Signature.generateKeyPair()
    const wrongPubKeyHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(wrongPubKeyHash)

    const txHash = Hash.sha256('test transaction data')
    const signature = Signature.sign(txHash, privateKey)

    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature,
      publicKey
    )

    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash,
    })

    // 公钥哈希不匹配
    expect(result.success).toBe(false)
  })
})

describe('多重签名验证', () => {
  test('2-of-3 多签验证成功', () => {
    // 生成 3 个密钥对
    const keys = [
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
    ]

    // 构建 2-of-3 多签脚本
    const redeemScript = ScriptBuilder.buildMultiSigScript(
      2,
      keys.map((k) => k.publicKey)
    )

    // 模拟交易签名（使用前两个密钥签名）
    const txHash = Hash.sha256('test multisig transaction')
    const sig1 = Signature.sign(txHash, keys[0].privateKey)
    const sig2 = Signature.sign(txHash, keys[1].privateKey)

    // 构建解锁脚本
    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1, sig2])

    // 验证
    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(true)
  })

  test('签名不足应该失败', () => {
    const keys = [
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
    ]

    const redeemScript = ScriptBuilder.buildMultiSigScript(
      2,
      keys.map((k) => k.publicKey)
    )

    const txHash = Hash.sha256('test multisig transaction')
    // 只提供一个签名（需要 2 个）
    const sig1 = Signature.sign(txHash, keys[0].privateKey)

    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1])

    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(false)
  })
})


