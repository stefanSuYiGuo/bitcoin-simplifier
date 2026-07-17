# 实现一个简单的比特币：Part 4 - 脚本系统

在前几篇文章中，我们实现了比特币的核心组件：密码学基础、UTXO 模型、交易系统、区块链和挖矿机制。现在，我们将深入探索比特币最强大但常被忽视的特性之一——**脚本系统**。

## 为什么需要脚本系统？

在我们之前的实现中，交易验证是"硬编码"的：验证签名是否正确，公钥是否匹配。但真实的比特币远比这灵活：

```
传统验证: 签名 + 公钥 → 验证通过/失败

脚本验证: 解锁脚本 + 锁定脚本 → 执行 → 栈顶为 true 则通过
```

脚本系统让比特币支持：

1. **P2PKH (Pay-to-Public-Key-Hash)** - 最常见的交易类型
2. **P2SH (Pay-to-Script-Hash)** - 支持复杂脚本的交易
3. **多重签名** - 需要多个人签名才能花费
4. **时间锁** - 在特定时间后才能花费
5. **哈希锁** - 提供特定原像才能花费（原子交换的基础）

## 理解比特币脚本

### 基于栈的执行模型

比特币脚本是一种简单的、基于栈的编程语言。它不是图灵完备的——没有循环，只能顺序执行。这种设计是故意的，为了保证脚本一定会终止，避免恶意代码。

```
栈操作示意：

          OP_DUP (复制栈顶)
[A]  →  [A, A]

          OP_ADD (弹出两个，压入和)
[3, 5]  →  [8]

          OP_EQUALVERIFY (弹出两个，相等则继续，否则失败)
[A, A]  →  []  (继续执行)
[A, B]  →  Script Failed!
```

### 锁定脚本与解锁脚本

每个交易输出都有一个**锁定脚本 (scriptPubKey)**，定义花费条件。
要花费这个输出，输入必须提供**解锁脚本 (scriptSig)**。

验证时，两个脚本合并执行：

```
scriptSig + scriptPubKey → 执行 → 栈顶为 true 则验证通过
```

## 操作码设计

让我们实现核心操作码：

```typescript
// src/script/OpCodes.ts
export enum OpCode {
  // 常量操作码
  OP_0 = 0x00,              // 压入空字节
  OP_1 = 0x51,              // 压入数字 1
  OP_2 = 0x52,              // 压入数字 2
  // ... OP_3 到 OP_16
  
  // 栈操作
  OP_DUP = 0x76,            // 复制栈顶
  OP_DROP = 0x75,           // 删除栈顶
  OP_SWAP = 0x7c,           // 交换栈顶两个元素
  
  // 加密操作
  OP_HASH160 = 0xa9,        // SHA256 + RIPEMD160
  OP_CHECKSIG = 0xac,       // 验证签名
  OP_CHECKMULTISIG = 0xae,  // 多重签名验证
  
  // 比较操作
  OP_EQUAL = 0x87,          // 相等检查
  OP_EQUALVERIFY = 0x88,    // 相等检查 + 验证
  OP_VERIFY = 0x69,         // 栈顶为假则失败
}
```

## 执行栈实现

栈是脚本执行的核心数据结构：

```typescript
// src/script/Stack.ts
export class Stack {
  private items: string[] = []  // 十六进制字符串
  private maxSize: number = 1000  // 比特币限制

  push(item: string): void {
    if (this.items.length >= this.maxSize) {
      throw new Error('栈溢出')
    }
    this.items.push(item)
  }

  pop(): string {
    if (this.items.length === 0) {
      throw new Error('栈下溢')
    }
    return this.items.pop()!
  }

  dup(): void {
    this.push(this.peek())
  }

  swap(): void {
    const a = this.pop()
    const b = this.pop()
    this.push(a)
    this.push(b)
  }
}
```

### 数值编码

比特币脚本使用特殊的数值编码方式：

```typescript
export const StackUtils = {
  // 数值编码为字节（小端序，有符号）
  encodeNumber(num: number): string {
    if (num === 0) return ''
    
    const negative = num < 0
    let absNum = Math.abs(num)
    const bytes: number[] = []
    
    while (absNum > 0) {
      bytes.push(absNum & 0xff)
      absNum >>= 8
    }
    
    // 处理符号位
    if (bytes[bytes.length - 1] & 0x80) {
      bytes.push(negative ? 0x80 : 0x00)
    } else if (negative) {
      bytes[bytes.length - 1] |= 0x80
    }
    
    return Buffer.from(bytes).toString('hex')
  },

  // 判断是否为"真"
  isTrue(element: string): boolean {
    if (element === '') return false
    // 全零或负零都是假
    const bytes = Buffer.from(element, 'hex')
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) {
        if (i === bytes.length - 1 && bytes[i] === 0x80) {
          return false  // 负零
        }
        return true
      }
    }
    return false
  }
}
```

## 脚本执行引擎

核心执行引擎逐个处理操作码：

```typescript
// src/script/Script.ts
export class Script {
  private elements: ScriptElement[] = []

  execute(context: ScriptContext = {}): ScriptResult {
    const stack = new Stack()
    const altStack = new Stack()
    let opCount = 0

    for (const element of this.elements) {
      // 数据直接压栈
      if (element.type === 'data') {
        stack.push(element.data)
        continue
      }

      // 执行操作码
      const opcode = element.code
      opCount++
      
      if (opCount > 201) {  // 比特币限制
        throw new Error('超过最大操作数')
      }

      this.executeOpCode(opcode, stack, altStack, context)
    }

    // 栈非空且栈顶为真 = 成功
    return {
      success: !stack.isEmpty() && StackUtils.isTrue(stack.peek()),
      stack: stack.getItems(),
      opCount
    }
  }
}
```

### 关键操作码实现

```typescript
private executeOpCode(opcode: OpCode, stack: Stack, ...): void {
  switch (opcode) {
    case OpCode.OP_DUP:
      stack.dup()
      break

    case OpCode.OP_HASH160: {
      const data = stack.pop()
      const hash = Hash.ripemd160(Hash.sha256(data))
      stack.push(hash)
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

    case OpCode.OP_CHECKSIG: {
      const publicKey = stack.pop()
      const signature = stack.pop()
      
      const isValid = Signature.verify(
        context.signatureHash,
        signature,
        publicKey
      )
      stack.push(StackUtils.encodeBool(isValid))
      break
    }
    
    // ... 其他操作码
  }
}
```

## P2PKH: 最常见的交易类型

P2PKH (Pay-to-Public-Key-Hash) 是比特币最常见的交易类型。让我们详细分析它的工作原理。

### 锁定脚本

```
OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

这个脚本说："要花费这笔钱，你需要提供一个公钥，它的哈希等于这个值，并且用对应私钥签名。"

### 解锁脚本

```
<signature> <publicKey>
```

### 执行过程

```
初始栈: []

1. 压入 signature
   栈: [sig]

2. 压入 publicKey
   栈: [sig, pubKey]

3. OP_DUP - 复制栈顶
   栈: [sig, pubKey, pubKey]

4. OP_HASH160 - 哈希栈顶
   栈: [sig, pubKey, hash(pubKey)]

5. 压入 pubKeyHash（来自锁定脚本）
   栈: [sig, pubKey, hash(pubKey), pubKeyHash]

6. OP_EQUALVERIFY - 比较并验证
   栈: [sig, pubKey]  (如果相等，继续；否则失败)

7. OP_CHECKSIG - 验证签名
   栈: [true/false]

最终: 栈顶为 true = 验证成功！
```

### 代码实现

```typescript
// src/script/ScriptBuilder.ts
export class ScriptBuilder {
  // 构建 P2PKH 锁定脚本
  static buildP2PKHLockingScript(pubKeyHash: string): Script {
    return new Script()
      .addOpCode(OpCode.OP_DUP)
      .addOpCode(OpCode.OP_HASH160)
      .addData(pubKeyHash)
      .addOpCode(OpCode.OP_EQUALVERIFY)
      .addOpCode(OpCode.OP_CHECKSIG)
  }

  // 构建 P2PKH 解锁脚本
  static buildP2PKHUnlockingScript(
    signature: string,
    publicKey: string
  ): Script {
    return new Script()
      .addData(signature)
      .addData(publicKey)
  }
}
```

## 多重签名: 安全性的飞跃

多重签名 (MultiSig) 允许 m-of-n 签名方案：n 个公钥中需要 m 个签名才能花费。

### 2-of-3 多签示例

常见于公司资金管理：CEO、CFO、COO 三人中任意两人签名才能花费。

**赎回脚本 (Redeem Script)**:
```
OP_2 <pubKey1> <pubKey2> <pubKey3> OP_3 OP_CHECKMULTISIG
```

**解锁脚本**:
```
OP_0 <sig1> <sig2>
```

> 注意：`OP_0` 是因为 `OP_CHECKMULTISIG` 的一个著名 bug，它会多弹出一个元素。为了向后兼容，这个 bug 被保留了。

### 代码实现

```typescript
// 构建多签脚本
static buildMultiSigScript(m: number, publicKeys: string[]): Script {
  const n = publicKeys.length
  const script = new Script()
  
  // m
  script.addOpCode(this.numberToOpCode(m))
  
  // 所有公钥
  for (const pubKey of publicKeys) {
    script.addData(pubKey)
  }
  
  // n
  script.addOpCode(this.numberToOpCode(n))
  
  // OP_CHECKMULTISIG
  script.addOpCode(OpCode.OP_CHECKMULTISIG)
  
  return script
}

// 多签解锁脚本
static buildMultiSigUnlockingScript(signatures: string[]): Script {
  const script = new Script()
  
  // bug workaround: 需要一个虚拟元素
  script.addOpCode(OpCode.OP_0)
  
  for (const sig of signatures) {
    script.addData(sig)
  }
  
  return script
}
```

### OP_CHECKMULTISIG 实现

```typescript
case OpCode.OP_CHECKMULTISIG: {
  // 获取 n 和公钥
  const n = StackUtils.decodeNumber(stack.pop())
  const publicKeys: string[] = []
  for (let i = 0; i < n; i++) {
    publicKeys.push(stack.pop())
  }

  // 获取 m 和签名
  const m = StackUtils.decodeNumber(stack.pop())
  const signatures: string[] = []
  for (let i = 0; i < m; i++) {
    signatures.push(stack.pop())
  }

  // CHECKMULTISIG bug: 多弹出一个元素
  stack.pop()

  // 按顺序匹配签名和公钥
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
```

## P2SH: 脚本的脚本

P2SH (Pay-to-Script-Hash) 是一个优雅的解决方案：不是在输出中放置完整的锁定脚本，而是放置脚本的哈希。

### 为什么需要 P2SH？

1. **更短的地址** - 无论多复杂的脚本，地址长度固定
2. **隐私** - 在花费前不知道锁定条件
3. **费用转移** - 复杂脚本的费用由花费者承担

### P2SH 锁定脚本

```
OP_HASH160 <scriptHash> OP_EQUAL
```

### P2SH 解锁脚本

```
<data...> <redeemScript>
```

### 验证过程

1. 首先验证 `hash(redeemScript) == scriptHash`
2. 然后执行 `<data...> + redeemScript`

### 代码实现

```typescript
// 构建 P2SH 锁定脚本
static buildP2SHLockingScript(scriptHash: string): Script {
  return new Script()
    .addOpCode(OpCode.OP_HASH160)
    .addData(scriptHash)
    .addOpCode(OpCode.OP_EQUAL)
}

// 从赎回脚本生成 P2SH
static buildP2SHFromRedeemScript(redeemScript: Script): Script {
  const scriptHash = ScriptBuilder.hash160(redeemScript.toHex())
  return ScriptBuilder.buildP2SHLockingScript(scriptHash)
}

// P2SH 多签（实际应用中最常见）
static buildP2SHMultiSig(m: number, publicKeys: string[]): {
  lockingScript: Script
  redeemScript: Script
} {
  const redeemScript = ScriptBuilder.buildMultiSigScript(m, publicKeys)
  const lockingScript = ScriptBuilder.buildP2SHFromRedeemScript(redeemScript)
  return { lockingScript, redeemScript }
}
```

## 更新交易结构

现在我们需要更新 `TxInput` 和 `TxOutput` 以支持脚本：

```typescript
// TxInput.ts
export class TxInput {
  private _scriptSig?: Script
  
  // 向后兼容的签名设置
  setSignature(signature: string, publicKey: string): void {
    this.signature = signature
    this.publicKey = publicKey
    // 同时更新 scriptSig
    this._scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature, publicKey
    )
  }
  
  // 直接设置脚本
  setScriptSig(scriptSig: Script): void {
    this._scriptSig = scriptSig
  }
  
  getScriptSig(): Script {
    if (this._scriptSig) return this._scriptSig
    // 从传统字段构建
    return ScriptBuilder.buildP2PKHUnlockingScript(
      this.signature, this.publicKey
    )
  }
}

// TxOutput.ts
export class TxOutput {
  private _scriptPubKey?: Script
  
  // 带脚本的工厂方法
  static createWithScript(amount: number, scriptPubKey: Script): TxOutput {
    const output = new TxOutput(amount, 'script:...')
    output._scriptPubKey = scriptPubKey
    return output
  }
  
  getScriptPubKey(): Script {
    if (this._scriptPubKey) return this._scriptPubKey
    // 从地址生成 P2PKH 脚本
    return ScriptBuilder.buildP2PKHLockingScript(this.address)
  }
  
  getScriptType(): string {
    return ScriptBuilder.getScriptType(this.getScriptPubKey())
  }
}
```

## 脚本类型识别

```typescript
static getScriptType(script: Script): string {
  if (ScriptBuilder.isP2PKH(script)) return 'P2PKH'
  if (ScriptBuilder.isP2SH(script)) return 'P2SH'
  if (ScriptBuilder.isP2PK(script)) return 'P2PK'
  if (ScriptBuilder.isMultiSig(script)) return 'MultiSig'
  if (ScriptBuilder.isOpReturn(script)) return 'OP_RETURN'
  return 'Unknown'
}

static isP2PKH(script: Script): boolean {
  const elements = script.getElements()
  return (
    elements.length === 5 &&
    elements[0].code === OpCode.OP_DUP &&
    elements[1].code === OpCode.OP_HASH160 &&
    elements[2].type === 'data' &&
    elements[3].code === OpCode.OP_EQUALVERIFY &&
    elements[4].code === OpCode.OP_CHECKSIG
  )
}
```

## 完整验证示例

让我们看一个完整的 P2PKH 验证：

```typescript
// 生成密钥对
const { privateKey, publicKey } = Signature.generateKeyPair()
const pubKeyHash = ScriptBuilder.hash160(publicKey)

// 构建锁定脚本（发送方创建）
const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

// 模拟交易签名
const txHash = Hash.sha256('transaction data')
const signature = Signature.sign(txHash, privateKey)

// 构建解锁脚本（接收方花费时创建）
const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(signature, publicKey)

// 验证！
const result = Script.verify(scriptSig, scriptPubKey, {
  signatureHash: txHash
})

console.log(result.success)  // true
```

## OP_RETURN: 数据存储

`OP_RETURN` 用于在区块链上存储任意数据，同时标记输出不可花费：

```typescript
static buildOpReturnScript(data: string): Script {
  return new Script()
    .addOpCode(OpCode.OP_RETURN)
    .addData(data)
}
```

应用场景：
- 证明文件存在（时间戳服务）
- 存储元数据
- 彩色币（Colored Coins）
- 协议层数据（如 Omni Layer）

## 安全考虑

比特币脚本有严格的限制：

1. **最大脚本大小**: 10,000 字节
2. **最大操作数**: 201
3. **栈深度限制**: 1,000 元素
4. **没有循环**: 保证脚本终止
5. **有限操作码集**: 减少攻击面

```typescript
execute(context: ScriptContext): ScriptResult {
  const maxOps = 201
  
  for (const element of this.elements) {
    opCount++
    if (opCount > maxOps) {
      throw new Error('超过最大操作数限制')
    }
    // ...
  }
}
```

## 测试

```typescript
describe('P2PKH 完整验证', () => {
  test('签名验证', () => {
    const { privateKey, publicKey } = Signature.generateKeyPair()
    const pubKeyHash = ScriptBuilder.hash160(publicKey)
    
    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
    const txHash = Hash.sha256('test transaction')
    const signature = Signature.sign(txHash, privateKey)
    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(signature, publicKey)
    
    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash
    })
    
    expect(result.success).toBe(true)
  })
})

describe('多重签名验证', () => {
  test('2-of-3 多签', () => {
    const keys = [
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
      Signature.generateKeyPair()
    ]
    
    const redeemScript = ScriptBuilder.buildMultiSigScript(
      2, keys.map(k => k.publicKey)
    )
    
    const txHash = Hash.sha256('test multisig')
    const sig1 = Signature.sign(txHash, keys[0].privateKey)
    const sig2 = Signature.sign(txHash, keys[1].privateKey)
    
    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1, sig2])
    
    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash
    })
    
    expect(result.success).toBe(true)
  })
})
```

## 总结

通过实现脚本系统，我们的比特币实现获得了：

1. **可编程性** - 交易条件可以用脚本定义
2. **灵活性** - 支持多种交易类型
3. **安全性** - 多签、时间锁等高级功能
4. **兼容性** - 向后兼容简单签名模式

脚本系统是比特币"可编程货币"概念的基础。虽然它不如以太坊的智能合约强大，但它的简单性和安全性是经过时间验证的。

在下一篇文章中，我们将探索网络层，实现节点之间的通信和区块同步。

---

**代码仓库**: 完整代码见 `src/script/` 目录

**相关文档**:
- [Bitcoin Script Wiki](https://en.bitcoin.it/wiki/Script)
- [BIP 16 - P2SH](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki)
- [BIP 11 - M-of-N Multisig](https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki)



