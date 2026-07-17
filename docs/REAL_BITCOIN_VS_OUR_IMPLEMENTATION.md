# 真实比特币 vs 我们的简化实现

## 交易结构对比

### 真实比特币交易

```javascript
// 真实的比特币交易
{
  version: 1,
  inputs: [
    {
      previousTxHash: "abc123...",       // 前一个交易的哈希
      previousOutputIndex: 0,             // 引用哪个输出
      scriptSig: "<signature> <publicKey>", // ⭐ 解锁脚本（包含签名和公钥）
      sequence: 0xffffffff
    }
  ],
  outputs: [
    {
      value: 5000000000,  // 金额（单位：聪，1 BTC = 100,000,000 聪）
      scriptPubKey: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG"  // ⭐ 锁定脚本
    }
  ],
  lockTime: 0
}
```

### 我们的简化实现

```typescript
// 我们的简化实现
{
  inputs: [
    {
      txId: "abc123...",         // 交易 ID
      outputIndex: 0,             // 输出索引
      signature: "sig...",        // ⭐ 直接存储签名
      publicKey: "pub..."         // ⭐ 直接存储公钥
    }
  ],
  outputs: [
    {
      amount: 50,                 // 金额（单位：BTC）
      address: "1A1zP1..."        // ⭐ 直接存储接收地址
    }
  ],
  timestamp: 1234567890
}
```

## 主要区别

### 1. 脚本系统

**真实比特币**：
- 使用基于栈的脚本语言
- `scriptSig`（解锁脚本）：提供签名和公钥
- `scriptPubKey`（锁定脚本）：定义如何验证
- 脚本提供了灵活性，可以实现多签、时间锁等复杂功能

```
真实比特币的验证：
执行 scriptSig + scriptPubKey
<signature> <publicKey> OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

**我们的实现**：
- 简化为直接存储签名和公钥
- 验证逻辑在代码中硬编码
- 不支持复杂的交易类型

```typescript
// 我们的验证
Signature.verify(txData, signature, publicKey)
// 验证公钥对应的地址是否匹配
```

### 2. 签名的内容

**真实比特币**：
- 签名不是签整个交易对象
- 而是签署交易的特定部分（去除 scriptSig 后的交易）
- 使用 SIGHASH 类型来指定签名范围

```
签名过程：
1. 构建交易（scriptSig 为空或临时填充）
2. 序列化交易
3. 根据 SIGHASH 类型修改要签名的内容
4. 对修改后的内容进行双 SHA-256
5. 用 ECDSA 签名这个哈希
6. 将签名（+ SIGHASH 类型）放入 scriptSig
```

**我们的实现**：
- 简化为对整个交易 JSON 字符串签名
- 不考虑 SIGHASH 类型

```typescript
// 我们的签名
const txData = JSON.stringify(transaction)
const signature = wallet.sign(txData)
```

### 3. 公钥和地址的关系

**真实比特币**：
- 交易输出包含 `scriptPubKey`，其中有公钥哈希（pubKeyHash）
- 交易输入包含 `scriptSig`，其中有完整的公钥
- 验证时检查：HASH160(publicKey) == pubKeyHash

```
UTXO 锁定：
scriptPubKey: "OP_DUP OP_HASH160 <Alice的公钥哈希> OP_EQUALVERIFY OP_CHECKSIG"

花费时：
scriptSig: "<Alice的签名> <Alice的公钥>"

验证：
1. 检查 HASH160(Alice的公钥) == Alice的公钥哈希 ✓
2. 检查签名有效性 ✓
```

**我们的实现**：
- 输出直接存储地址（实际上是公钥哈希的 Base58 编码）
- 输入直接存储公钥
- 验证时检查：Base58(RIPEMD160(SHA256(publicKey))) == address

### 4. 交易 ID 的计算

**真实比特币**：
- 交易 ID = SHA256(SHA256(整个交易的序列化数据))
- 包括 version, inputs, outputs, lockTime
- scriptSig 的变化会改变交易 ID

**我们的实现**：
- 交易 ID = SHA256(交易内容的 JSON 字符串)
- 简化的序列化方式

## 真实比特币交易示例

### P2PKH (Pay-to-Public-Key-Hash) 交易

这是最常见的比特币交易类型：

```
Alice 给 Bob 转账 1 BTC：

inputs: [
  {
    previousTxHash: "7a9f2c...",
    previousOutputIndex: 0,
    scriptSig: "
      304402203f... (Alice的签名)
      03ab12cd... (Alice的公钥)
    "
  }
]

outputs: [
  {
    value: 100000000,  // 1 BTC
    scriptPubKey: "
      OP_DUP 
      OP_HASH160 
      89abcdef... (Bob的公钥哈希)
      OP_EQUALVERIFY 
      OP_CHECKSIG
    "
  }
]
```

### 验证过程详解

```
栈执行过程：

1. 开始时栈为空
   Stack: []

2. 执行 scriptSig: <signature> <publicKey>
   Stack: [signature, publicKey]

3. OP_DUP：复制栈顶元素
   Stack: [signature, publicKey, publicKey]

4. OP_HASH160：对栈顶进行 SHA256 + RIPEMD160
   Stack: [signature, publicKey, hash(publicKey)]

5. <pubKeyHash>：推入期望的公钥哈希
   Stack: [signature, publicKey, hash(publicKey), expectedHash]

6. OP_EQUALVERIFY：比较栈顶两个元素是否相等
   如果相等，弹出这两个元素；否则失败
   Stack: [signature, publicKey]

7. OP_CHECKSIG：验证签名
   用 publicKey 验证 signature 对交易的签名
   如果有效，推入 true；否则 false
   Stack: [true]

8. 如果栈顶是 true，验证成功 ✓
```

## 为什么简化？

我们的实现做了这些简化是出于教学目的：

### 优点：
1. **更容易理解**：直接存储公钥和签名，逻辑清晰
2. **代码简洁**：不需要实现完整的脚本引擎
3. **聚焦核心**：专注于 UTXO 模型、签名验证等核心概念
4. **快速实现**：可以快速构建原型验证想法

### 缺点：
1. **不支持高级功能**：多签、时间锁、哈希锁等
2. **灵活性有限**：无法实现复杂的支付条件
3. **与真实比特币不兼容**：无法与比特币网络交互

## 如何升级到真实比特币

如果要实现完整的比特币兼容实现，需要：

1. **实现脚本引擎**
   ```typescript
   class Script {
     execute(scriptSig: string, scriptPubKey: string): boolean
     // 实现各种操作码：OP_DUP, OP_HASH160, OP_CHECKSIG 等
   }
   ```

2. **改进交易结构**
   ```typescript
   interface TxInput {
     previousTxHash: string
     previousOutputIndex: number
     scriptSig: string  // 脚本，不是直接的签名
     sequence: number
   }
   
   interface TxOutput {
     value: number  // 单位：聪
     scriptPubKey: string  // 锁定脚本
   }
   ```

3. **实现 SIGHASH 类型**
   - SIGHASH_ALL: 签名所有输入和输出
   - SIGHASH_NONE: 只签名输入
   - SIGHASH_SINGLE: 签名对应的输入和输出
   - SIGHASH_ANYONECANPAY: 允许其他人添加输入

4. **支持多种交易类型**
   - P2PKH (Pay-to-Public-Key-Hash)
   - P2SH (Pay-to-Script-Hash)
   - P2WPKH (Pay-to-Witness-Public-Key-Hash) - SegWit
   - P2WSH (Pay-to-Witness-Script-Hash) - SegWit
   - Taproot (P2TR)

5. **实现隔离见证 (SegWit)**
   - 将签名数据移到单独的 witness 字段
   - 解决交易延展性问题
   - 提高交易容量

## 参考资料

- [Bitcoin Script](https://en.bitcoin.it/wiki/Script)
- [Transaction Structure](https://developer.bitcoin.org/reference/transactions.html)
- [Mastering Bitcoin - Chapter 6: Transactions](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch06.asciidoc)
- [BIP 141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)

## 总结

我们的实现虽然简化了比特币的脚本系统，但保留了最核心的安全机制：

✅ **保留的核心概念**：
- UTXO 模型
- 数字签名验证
- 公钥到地址的映射
- 所有权验证

❌ **简化的部分**：
- 脚本系统 → 直接存储签名和公钥
- 复杂交易类型 → 只支持简单转账
- 灵活的验证逻辑 → 硬编码的验证流程

这种简化让我们能够专注于理解比特币的核心思想，而不被实现细节所困扰。

