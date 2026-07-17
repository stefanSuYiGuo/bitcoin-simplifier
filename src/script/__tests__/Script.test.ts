import {Script, ScriptBuilder, OpCode, Stack, StackUtils} from '../index'
import {Signature} from '../../crypto/signature'
import {Hash} from '../../crypto'

describe('Stack', () => {
  test('pushes and pops stack items', () => {
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

  test('dup duplicates the top item', () => {
    const stack = new Stack()
    stack.push('abc')
    stack.dup()

    expect(stack.size()).toBe(2)
    expect(stack.pop()).toBe('abc')
    expect(stack.pop()).toBe('abc')
  })

  test('swap exchanges the top two items', () => {
    const stack = new Stack()
    stack.push('01')
    stack.push('02')
    stack.swap()

    expect(stack.pop()).toBe('01')
    expect(stack.pop()).toBe('02')
  })

  test('rot rotates the top three items', () => {
    const stack = new Stack()
    stack.push('01')
    stack.push('02')
    stack.push('03')
    stack.rot()

    expect(stack.pop()).toBe('01')
    expect(stack.pop()).toBe('03')
    expect(stack.pop()).toBe('02')
  })

  test('detects stack overflow', () => {
    const stack = new Stack(3)
    stack.push('01')
    stack.push('02')
    stack.push('03')

    expect(() => stack.push('04')).toThrow('Stack overflow')
  })
})

describe('StackUtils', () => {
  test('encodes and decodes numbers', () => {
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(0))).toBe(0)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(1))).toBe(1)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(127))).toBe(127)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(128))).toBe(128)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(255))).toBe(255)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(-1))).toBe(-1)
    expect(StackUtils.decodeNumber(StackUtils.encodeNumber(-127))).toBe(-127)
  })

  test('evaluates boolean values', () => {
    expect(StackUtils.isTrue('')).toBe(false)
    expect(StackUtils.isTrue('00')).toBe(false)
    expect(StackUtils.isTrue('0000')).toBe(false)
    expect(StackUtils.isTrue('01')).toBe(true)
    expect(StackUtils.isTrue('ff')).toBe(true)
    expect(StackUtils.isTrue('80')).toBe(false) // Negative zero
  })
})

describe('OpCode', () => {
  test('executes numeric opcodes', () => {
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
    // Verify HASH160 = RIPEMD160(SHA256(data))
    const expected = Hash.ripemd160(Hash.sha256(data))
    expect(result.stack[0]).toBe(expected)
  })

  test('OP_VERIFY succeeds for a true value', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_1)
      .addOpCode(OpCode.OP_VERIFY)
      .addOpCode(OpCode.OP_1)

    const result = script.execute()

    expect(result.success).toBe(true)
  })

  test('OP_VERIFY fails for a false value', () => {
    const script = new Script()
      .addOpCode(OpCode.OP_0)
      .addOpCode(OpCode.OP_VERIFY)

    const result = script.execute()

    expect(result.success).toBe(false)
    expect(result.error).toContain('OP_VERIFY')
  })

  test('executes arithmetic operations', () => {
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

describe('Script serialization', () => {
  test('round-trips through toHex and fromHex', () => {
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
  test('builds a P2PKH locking script', () => {
    const pubKeyHash = '89abcdefabbaabbaabbaabbaabbaabbaabbaabba'
    const script = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

    expect(ScriptBuilder.isP2PKH(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('P2PKH')
    expect(ScriptBuilder.extractP2PKHPubKeyHash(script)).toBe(pubKeyHash)
  })

  test('builds a P2SH locking script', () => {
    const scriptHash = '89abcdefabbaabbaabbaabbaabbaabbaabbaabba'
    const script = ScriptBuilder.buildP2SHLockingScript(scriptHash)

    expect(ScriptBuilder.isP2SH(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('P2SH')
    expect(ScriptBuilder.extractP2SHScriptHash(script)).toBe(scriptHash)
  })

  test('builds a multisignature script', () => {
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

  test('builds a P2SH multisignature script', () => {
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

  test('builds an OP_RETURN script', () => {
    const data = Buffer.from('Hello Bitcoin!').toString('hex')
    const script = ScriptBuilder.buildOpReturnScript(data)

    expect(ScriptBuilder.isOpReturn(script)).toBe(true)
    expect(ScriptBuilder.getScriptType(script)).toBe('OP_RETURN')
  })
})

describe('P2PKH verification', () => {
  test('verifies a signature', () => {
    // Generate a key pair
    const {privateKey, publicKey} = Signature.generateKeyPair()
    const pubKeyHash = ScriptBuilder.hash160(publicKey)

    // Build the locking script
    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

    // Simulate a transaction signature
    const txHash = Hash.sha256('test transaction data')
    const signature = Signature.sign(txHash, privateKey)

    // Build the unlocking script
    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature,
      publicKey
    )

    // Verify the script
    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(true)
  })

  test('rejects an incorrect signature', () => {
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

    // Verification fails because the signature uses the wrong private key
    expect(result.success).toBe(false)
  })

  test('rejects an incorrect public key hash', () => {
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

    // The public key hash does not match
    expect(result.success).toBe(false)
  })
})

describe('multisignature verification', () => {
  test('verifies a 2-of-3 multisignature', () => {
    // Generate three key pairs
    const keys = [
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
    ]

    // Build a 2-of-3 multisignature script
    const redeemScript = ScriptBuilder.buildMultiSigScript(
      2,
      keys.map((k) => k.publicKey)
    )

    // Simulate transaction signatures using the first two keys
    const txHash = Hash.sha256('test multisig transaction')
    const sig1 = Signature.sign(txHash, keys[0].privateKey)
    const sig2 = Signature.sign(txHash, keys[1].privateKey)

    // Build the unlocking script
    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1, sig2])

    // Verify
    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(true)
  })

  test('rejects an insufficient number of signatures', () => {
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
    // Provide only one signature when two are required
    const sig1 = Signature.sign(txHash, keys[0].privateKey)

    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1])

    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash,
    })

    expect(result.success).toBe(false)
  })
})


