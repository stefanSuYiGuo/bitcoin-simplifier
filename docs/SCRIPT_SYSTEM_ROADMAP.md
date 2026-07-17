# 比特币脚本系统实现路线图

## 概述

脚本系统是比特币的核心特性之一，提供了灵活的交易验证机制。本文档规划了如何将脚本系统添加到当前的简化实现中。

## 为什么需要脚本系统？

### 当前实现的限制

```typescript
// 简化版：只支持简单的单签转账
interface TxInput {
  txId: string
  outputIndex: number
  signature: string    // 单个签名
  publicKey: string    // 单个公钥
}
```

### 脚本系统的优势

1. **多签名支持**: 2-of-3, 3-of-5 等多签钱包
2. **时间锁**: 指定时间后才能花费
3. **哈希锁**: 知道原像才能花费（用于原子交换）
4. **复杂条件**: 组合多种条件的支付
5. **更接近真实比特币**: 理解真实比特币的工作原理

## 实现计划

### Phase 1: 核心组件 (2-3 周)

#### 1.1 栈数据结构 (`Stack.ts`)

```typescript
class Stack {
  private items: Buffer[] = []
  
  push(item: Buffer): void
  pop(): Buffer | undefined
  peek(): Buffer | undefined
  size(): number
  dup(): void      // 复制栈顶
  swap(): void     // 交换栈顶两个元素
  clear(): void
}
```

**测试重点**:
- 基本栈操作
- 边界条件（空栈、栈溢出）
- Buffer 类型处理

#### 1.2 操作码定义 (`OpCodes.ts`)

```typescript
export enum OpCode {
  // 常量
  OP_0 = 0x00,
  OP_1 = 0x51,
  // ... OP_2 到 OP_16
  
  // 栈操作
  OP_DUP = 0x76,
  OP_DROP = 0x75,
  OP_SWAP = 0x7c,
  
  // 加密操作
  OP_SHA256 = 0xa8,
  OP_HASH160 = 0xa9,
  OP_CHECKSIG = 0xac,
  OP_CHECKMULTISIG = 0xae,
  
  // 逻辑操作
  OP_EQUAL = 0x87,
  OP_EQUALVERIFY = 0x88,
  OP_VERIFY = 0x69,
}

export interface OpCodeHandler {
  execute(stack: Stack, tx?: Transaction, inputIndex?: number): boolean
}
```

**实现操作码** (优先级顺序):
1. 第一批：OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG (P2PKH 需要)
2. 第二批：OP_EQUAL, OP_VERIFY (基础验证)
3. 第三批：OP_CHECKMULTISIG (多签)
4. 第四批：其他栈操作和算术操作

#### 1.3 脚本解析器和执行器 (`Script.ts`)

```typescript
class Script {
  private bytecode: Buffer
  
  constructor(script: string | Buffer) {
    this.bytecode = this.parse(script)
  }
  
  // 解析脚本字符串/十六进制为字节码
  parse(script: string | Buffer): Buffer
  
  // 执行脚本
  execute(
    stack: Stack,
    transaction?: Transaction,
    inputIndex?: number
  ): boolean
  
  // 序列化
  serialize(): Buffer
  toHex(): string
  toString(): string  // 可读格式
  
  // 反序列化
  static deserialize(buffer: Buffer): Script
  static fromHex(hex: string): Script
}
```

**执行流程**:
```
1. 初始化空栈
2. 遍历字节码
3. 对每个操作码：
   - 如果是数据，推入栈
   - 如果是操作码，执行对应操作
4. 检查执行结果（栈顶为 true）
```

### Phase 2: 脚本构建器 (1 周)

#### 2.1 ScriptBuilder (`ScriptBuilder.ts`)

```typescript
class ScriptBuilder {
  private ops: Buffer[] = []
  
  // P2PKH: Pay-to-Public-Key-Hash
  static buildP2PKHLock(pubKeyHash: Buffer): Script {
    return new ScriptBuilder()
      .pushOp(OpCode.OP_DUP)
      .pushOp(OpCode.OP_HASH160)
      .pushData(pubKeyHash)
      .pushOp(OpCode.OP_EQUALVERIFY)
      .pushOp(OpCode.OP_CHECKSIG)
      .build()
  }
  
  static buildP2PKHUnlock(signature: Buffer, publicKey: Buffer): Script {
    return new ScriptBuilder()
      .pushData(signature)
      .pushData(publicKey)
      .build()
  }
  
  // P2SH: Pay-to-Script-Hash
  static buildP2SHLock(scriptHash: Buffer): Script
  static buildP2SHUnlock(redeemScript: Script, ...data: Buffer[]): Script
  
  // MultiSig
  static buildMultiSig(m: number, publicKeys: Buffer[]): Script
  static buildMultiSigUnlock(signatures: Buffer[]): Script
  
  // 辅助方法
  pushOp(opcode: OpCode): ScriptBuilder
  pushData(data: Buffer): ScriptBuilder
  build(): Script
}
```

### Phase 3: 交易集成 (1-2 周)

#### 3.1 更新交易数据结构

```typescript
// 添加脚本版本的输入输出
interface TxInputScript {
  txId: string
  outputIndex: number
  scriptSig: string    // 十六进制编码的脚本
  sequence: number     // 默认 0xffffffff
}

interface TxOutputScript {
  amount: number
  scriptPubKey: string // 十六进制编码的脚本
}

// 交易类支持两种模式
class Transaction {
  version: number
  inputs: TxInput[] | TxInputScript[]
  outputs: TxOutput[] | TxOutputScript[]
  lockTime: number
  
  // 模式标识
  useScriptMode: boolean
}
```

#### 3.2 脚本验证器

```typescript
class ScriptValidator {
  validateInput(
    transaction: Transaction,
    inputIndex: number,
    utxoSet: UTXOSet
  ): boolean {
    const input = transaction.inputs[inputIndex]
    const utxo = utxoSet.get(input.txId, input.outputIndex)
    
    // 创建栈
    const stack = new Stack()
    
    // 执行 scriptSig
    const scriptSig = Script.fromHex(input.scriptSig)
    if (!scriptSig.execute(stack, transaction, inputIndex)) {
      return false
    }
    
    // 执行 scriptPubKey
    const scriptPubKey = Script.fromHex(utxo.scriptPubKey)
    if (!scriptPubKey.execute(stack, transaction, inputIndex)) {
      return false
    }
    
    // 检查结果
    return this.isStackTrue(stack)
  }
  
  private isStackTrue(stack: Stack): boolean {
    if (stack.size() === 0) return false
    const top = stack.peek()
    return !this.isZero(top)
  }
}
```

### Phase 4: 向后兼容 (1 周)

#### 4.1 兼容层

```typescript
class TransactionAdapter {
  // 简化版 → 脚本版
  static toScriptMode(simpleTx: Transaction): Transaction {
    const scriptTx = { ...simpleTx }
    
    scriptTx.inputs = simpleTx.inputs.map(input => {
      const sig = Buffer.from(input.signature, 'hex')
      const pubKey = Buffer.from(input.publicKey, 'hex')
      const scriptSig = ScriptBuilder.buildP2PKHUnlock(sig, pubKey)
      
      return {
        txId: input.txId,
        outputIndex: input.outputIndex,
        scriptSig: scriptSig.toHex(),
        sequence: 0xffffffff
      }
    })
    
    scriptTx.outputs = simpleTx.outputs.map(output => {
      const pubKeyHash = this.addressToPubKeyHash(output.address)
      const scriptPubKey = ScriptBuilder.buildP2PKHLock(pubKeyHash)
      
      return {
        amount: output.amount,
        scriptPubKey: scriptPubKey.toHex()
      }
    })
    
    return scriptTx
  }
  
  // 脚本版 → 简化版 (仅支持 P2PKH)
  static toSimpleMode(scriptTx: Transaction): Transaction {
    // 解析脚本提取签名和公钥
  }
}
```

#### 4.2 配置开关

```typescript
// 全局配置
export const Config = {
  useScriptMode: false,  // 默认使用简化模式
  scriptLimits: {
    maxScriptSize: 10000,
    maxStackSize: 1000,
    maxOpsPerScript: 201
  }
}

// 在验证时检查模式
if (Config.useScriptMode) {
  // 使用脚本验证
  return ScriptValidator.validateInput(...)
} else {
  // 使用简化验证
  return Signature.verify(...)
}
```

### Phase 5: 测试和文档 (1-2 周)

#### 5.1 单元测试

- [ ] Stack 操作测试
- [ ] 每个 OpCode 的测试
- [ ] Script 解析和执行测试
- [ ] ScriptBuilder 测试
- [ ] P2PKH 完整流程测试
- [ ] P2SH 完整流程测试
- [ ] MultiSig 完整流程测试
- [ ] 兼容层测试

#### 5.2 集成测试

- [ ] 创建脚本交易并验证
- [ ] 多签钱包转账流程
- [ ] 简化模式 ↔ 脚本模式转换
- [ ] 错误处理和边界条件

#### 5.3 示例和文档

- [ ] P2PKH 交易示例
- [ ] 多签钱包示例
- [ ] P2SH 交易示例
- [ ] API 文档
- [ ] 迁移指南（简化版 → 脚本版）

## 关键技术决策

### 1. 字节码格式

使用比特币原始的字节码格式：
- 兼容真实比特币
- 可以学习真实的脚本执行
- 方便调试和理解

### 2. 执行引擎

基于栈的虚拟机：
- 简单直观
- 易于实现
- 与比特币一致

### 3. 安全限制

实现所有比特币的安全限制：
- 脚本大小限制
- 栈深度限制
- 操作码数量限制
- 禁用某些危险操作码

### 4. 向后兼容

保留简化版接口：
- 不破坏现有代码
- 提供平滑迁移路径
- 两种模式可以共存

## 预期收益

### 学习价值

1. 深入理解比特币脚本系统
2. 了解基于栈的虚拟机
3. 学习多签名和复杂交易
4. 掌握真实比特币的工作原理

### 技术价值

1. 支持更复杂的交易类型
2. 实现多签钱包
3. 为未来扩展打下基础
4. 更接近生产级实现

### 教学价值

1. 完整展示比特币技术栈
2. 可以演示高级特性
3. 更好的示例和文档
4. 更有说服力的实现

## 风险和挑战

### 技术挑战

1. **复杂性增加**: 脚本系统比简化版复杂很多
2. **测试难度**: 需要大量测试用例覆盖
3. **调试困难**: 脚本执行错误不容易定位
4. **性能影响**: 脚本执行比直接验证慢

### 解决方案

1. **分阶段实现**: 先实现核心功能，再扩展
2. **详细日志**: 添加脚本执行跟踪
3. **可视化工具**: 实现栈状态可视化
4. **性能优化**: 缓存常用脚本的验证结果

## 时间估算

| 阶段 | 时间 | 任务 |
|------|------|------|
| Phase 1 | 2-3 周 | 核心组件实现 |
| Phase 2 | 1 周 | 脚本构建器 |
| Phase 3 | 1-2 周 | 交易集成 |
| Phase 4 | 1 周 | 向后兼容 |
| Phase 5 | 1-2 周 | 测试和文档 |
| **总计** | **6-9 周** | |

## 下一步行动

1. [ ] 审查和确认技术方案
2. [ ] 创建功能分支 `feature/script-system`
3. [ ] 实现 Stack 类和测试
4. [ ] 实现基础操作码（OP_DUP, OP_HASH160 等）
5. [ ] 实现 Script 执行引擎
6. [ ] 实现 P2PKH 脚本
7. [ ] 集成到交易验证
8. [ ] 完整测试和文档

## 参考资料

- [Bitcoin Script](https://en.bitcoin.it/wiki/Script)
- [Mastering Bitcoin - Chapter 7: Advanced Transactions](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch07.asciidoc)
- [BIP 16: Pay to Script Hash](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki)
- [BIP 141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [Bitcoin Script Debugger](https://bitcoin.sipa.be/miniscript/)

