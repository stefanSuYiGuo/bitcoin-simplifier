# Simple Bitcoin Implementation

一个用 TypeScript 实现的简化版比特币系统，用于学习和理解比特币的核心技术原理。

## 特性

- ✅ **UTXO 模型**: 基于未花费交易输出的账户系统
- ✅ **数字钱包**: 密钥对生成、地址生成、交易签名
- ✅ **完整交易系统**: 
  - 交易构建、签名和验证
  - UTXO 选择（贪心算法）
  - 自动找零计算
  - Coinbase 交易（矿工奖励）
  - **多方交易支持**（每个输入独立签名）
- ✅ **交易验证**: 
  - 签名验证
  - 所有权验证
  - 双花检测
  - 余额检查
- ✅ **Merkle 树**: 高效的交易验证结构
- ✅ **区块链核心**: 
  - 区块结构（区块头 + 交易列表）
  - 区块链接（通过前区块哈希）
  - UTXO 集合维护
  - 区块验证
- ✅ **工作量证明**: SHA-256 双重哈希 PoW 挖矿
- ✅ **动态难度调整**: 根据出块时间自动调整难度
- ✅ **矿工系统**: 
  - 交易打包（按手续费排序）
  - 挖矿奖励计算
  - 工作量证明执行

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行演示

```bash
pnpm start
```

### 编译项目

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

## 项目结构

```
bitcoin/
├── src/
│   ├── crypto/              # 密码学工具 ✅
│   │   ├── hash.ts          # SHA-256、RIPEMD-160 哈希
│   │   └── signature.ts     # ECDSA 签名与验证
│   ├── wallet/              # 钱包系统 ✅
│   │   ├── KeyPair.ts       # 密钥对管理
│   │   └── Wallet.ts        # 钱包功能
│   ├── transaction/         # 交易系统 ✅
│   │   ├── TxInput.ts       # 交易输入
│   │   ├── TxOutput.ts      # 交易输出
│   │   ├── UTXO.ts          # UTXO 集合管理
│   │   ├── Transaction.ts   # 交易数据结构
│   │   ├── TransactionSigner.ts    # 签名和验证
│   │   └── TransactionBuilder.ts   # 交易构建器
│   ├── merkle/              # Merkle 树 ✅
│   │   └── MerkleTree.ts    # Merkle 树构建和验证
│   ├── blockchain/          # 区块链核心 ✅
│   │   ├── Block.ts         # 区块结构
│   │   ├── Blockchain.ts    # 区块链管理
│   │   ├── ProofOfWork.ts   # 工作量证明
│   │   └── Miner.ts         # 矿工系统
│   ├── utils/               # 工具函数
│   │   └── base58.ts        # Base58 编码
│   └── examples/            # 示例代码
│       └── demo.ts          # 完整演示
└── docs/
    ├── TECH_DESIGN.md       # 技术设计文档
    ├── PLAN.md              # 实现计划
    ├── ARTICLE_PART1.md     # 教程：Part 1 - 基础设施
    ├── ARTICLE_PART2.md     # 教程：Part 2 - 交易系统
    └── ARTICLE_PART3.md     # 教程：Part 3 - 区块链与挖矿
```

## 核心概念

### UTXO 模型

UTXO (Unspent Transaction Output) 是比特币的账户模型。每笔交易消费之前的 UTXO，创建新的 UTXO。

```typescript
// 创建钱包
const alice = new Wallet()
const bob = new Wallet()

// 创建 UTXO 集合
const utxoSet = new UTXOSet()

// 添加 UTXO（Alice 有 100 BTC）
utxoSet.add('genesis_tx', 0, new TxOutput(100, alice.address))

// 查看余额
console.log('Alice 余额:', utxoSet.getBalance(alice.address))
```

### 交易系统

使用 TransactionBuilder 轻松构建交易，自动处理 UTXO 选择和找零。

```typescript
// 简单转账
const tx = new TransactionBuilder(utxoSet)
  .from(alice)
  .to(bob.address, 60)
  .buildAndSign()

// 多人转账
const tx = new TransactionBuilder(utxoSet)
  .from(alice)
  .to(bob.address, 30)
  .to(charlie.address, 20)
  .buildAndSign()

// 或使用静态方法
const tx = TransactionBuilder.createSimpleTransfer(
  alice,
  bob.address,
  60,
  utxoSet
)
```

### 交易验证

每笔交易都经过两层验证：签名验证和所有权验证。

```typescript
// 验证交易
const utxoMap = new Map()
for (const input of tx.inputs) {
  const utxo = utxoSet.get(input.txId, input.outputIndex)
  if (utxo) {
    utxoMap.set(`${input.txId}:${input.outputIndex}`, {
      amount: utxo.amount,
      address: utxo.address,
    })
  }
}

const isValid = TransactionSigner.verifyTransaction(tx, utxoMap)
console.log('交易是否有效:', isValid)
```

### 多方交易（新功能！）

支持多个参与者共同创建一笔交易，每个人签名自己的输入：

```typescript
// Alice 和 Bob 合作转账
const alice = new Wallet()
const bob = new Wallet()
const charlie = new Wallet()

// 创建交易：Alice 和 Bob 的输入
const tx = new Transaction(
  [
    new TxInput('tx_alice', 0),
    new TxInput('tx_bob', 0)
  ],
  [new TxOutput(75, charlie.address)]
)

// 方式 1：分别签名（支持异步）
TransactionSigner.signInput(tx, 0, alice)
TransactionSigner.signInput(tx, 1, bob)

// 方式 2：使用钱包数组
TransactionSigner.signTransactionWithWallets(tx, [alice, bob])

// 方式 3：使用钱包映射
const walletMap = new Map()
walletMap.set(alice.address, alice)
walletMap.set(bob.address, bob)
TransactionSigner.signTransactionWithWalletMap(tx, walletMap, utxoSet)

// 每个输入的签名都是唯一的！
console.log('签名相同?', tx.inputs[0].signature === tx.inputs[1].signature) // false
```

详细文档：[多方交易支持](./docs/MULTI_PARTY_TRANSACTIONS.md)

### Coinbase 交易

Coinbase 交易是矿工奖励交易，凭空创造新的比特币。

```typescript
// 创建 Coinbase 交易
const coinbase = Transaction.createCoinbase(
  minerAddress,
  50,  // 区块奖励
  1    // 区块高度
)

console.log('是 Coinbase 交易:', coinbase.isCoinbase())
```

## 使用示例

### 完整的交易流程

```typescript
import { Wallet } from './wallet/Wallet'
import { UTXOSet } from './transaction/UTXO'
import { TxOutput } from './transaction/TxOutput'
import { TransactionBuilder } from './transaction/TransactionBuilder'
import { TransactionSigner } from './transaction/TransactionSigner'
import { Transaction } from './transaction/Transaction'

// 1. 创建钱包
const alice = new Wallet()
const bob = new Wallet()
const charlie = new Wallet()

console.log('Alice 地址:', alice.address)
console.log('Bob 地址:', bob.address)

// 2. 创建 UTXO 集合并初始化
const utxoSet = new UTXOSet()

// 创建 Coinbase 交易（挖矿奖励）给 Alice
const coinbase = Transaction.createCoinbase(alice.address, 100, 0)
utxoSet.add(coinbase.id, 0, coinbase.outputs[0])

console.log('Alice 初始余额:', utxoSet.getBalance(alice.address))

// 3. Alice 向 Bob 转账 60 BTC
const tx1 = new TransactionBuilder(utxoSet)
  .from(alice)
  .to(bob.address, 60)
  .buildAndSign()

console.log('交易 ID:', tx1.id)
console.log('输入数量:', tx1.inputs.length)
console.log('输出数量:', tx1.outputs.length)

// 4. 验证交易
const utxoMap = new Map()
for (const input of tx1.inputs) {
  const utxo = utxoSet.get(input.txId, input.outputIndex)
  if (utxo) {
    utxoMap.set(`${input.txId}:${input.outputIndex}`, {
      amount: utxo.amount,
      address: utxo.address,
    })
  }
}

const isValid = TransactionSigner.verifyTransaction(tx1, utxoMap)
console.log('交易验证:', isValid ? '✓ 通过' : '✗ 失败')

// 5. 执行交易（更新 UTXO 集合）
if (isValid) {
  // 移除已花费的 UTXO
  for (const input of tx1.inputs) {
    utxoSet.remove(input.txId, input.outputIndex)
  }

  // 添加新的 UTXO
  for (let i = 0; i < tx1.outputs.length; i++) {
    utxoSet.add(tx1.id, i, tx1.outputs[i])
  }
}

// 6. 查看余额
console.log('Alice 余额:', utxoSet.getBalance(alice.address))
console.log('Bob 余额:', utxoSet.getBalance(bob.address))

// 7. Alice 向多人转账
const tx2 = new TransactionBuilder(utxoSet)
  .from(alice)
  .to(bob.address, 10)
  .to(charlie.address, 20)
  .buildAndSign()

console.log('多人转账完成')
console.log('输出数量:', tx2.outputs.length)  // 3个输出：Bob、Charlie、找零
```

### 区块链与挖矿

```typescript
import { Blockchain, Block, Miner } from './blockchain'
import { Transaction } from './transaction'
import { Wallet } from './wallet'

// 1. 创建区块链
const blockchain = new Blockchain({
  initialDifficulty: 2,
  blockReward: 50,
  targetBlockTime: 10,
  difficultyAdjustmentInterval: 10
})

// 2. 创建钱包
const minerWallet = new Wallet()
const alice = new Wallet()
const bob = new Wallet()

// 3. 创建创世区块
const genesisCoinbase = Transaction.createCoinbase(minerWallet.address, 50, 0)
const genesisBlock = Block.createGenesisBlock(genesisCoinbase)
blockchain.initializeWithGenesisBlock(genesisBlock)

console.log('创世区块已创建')
console.log('矿工余额:', blockchain.getUTXOSet().getBalance(minerWallet.address))
// 输出: 矿工余额: 50

// 4. 创建矿工并挖矿
const miner = new Miner(minerWallet, blockchain)
const { block, miningResult } = miner.mineEmptyBlock()

console.log('挖矿成功！')
console.log('  区块哈希:', miningResult.hash)
console.log('  Nonce:', miningResult.nonce)
console.log('  尝试次数:', miningResult.attempts)
console.log('  用时:', miningResult.duration, 'ms')

// 5. 将区块添加到区块链
blockchain.addBlock(block)
console.log('矿工余额:', blockchain.getUTXOSet().getBalance(minerWallet.address))
// 输出: 矿工余额: 100

// 6. 矿工转账给 Alice
const utxoSet = blockchain.getUTXOSet()
const tx = TransactionBuilder.createSimpleTransfer(
  minerWallet,
  alice.address,
  30,
  utxoSet
)

// 7. 挖矿打包交易
const { block: block2 } = miner.mineBlock([tx])
blockchain.addBlock(block2)

console.log('Alice 余额:', blockchain.getUTXOSet().getBalance(alice.address))
// 输出: Alice 余额: 30

// 8. 查看区块链状态
const stats = blockchain.getStats()
console.log('区块链长度:', stats.length)
console.log('当前难度:', stats.difficulty)
console.log('UTXO 数量:', stats.utxoCount)

// 9. 验证区块链
console.log('区块链有效:', blockchain.isValidChain())
```

### Merkle 树

```typescript
import { MerkleTree } from './merkle'

// 创建 Merkle 树
const transactions = ['tx1', 'tx2', 'tx3', 'tx4']
const tree = new MerkleTree(transactions)

// 获取 Merkle 根
const root = tree.getRoot()
console.log('Merkle 根:', root)

// 生成 Merkle 证明
const proof = tree.getProof('tx1')
console.log('Merkle 证明:', proof)

// 验证 Merkle 证明
const isValid = MerkleTree.verify('tx1', proof, root)
console.log('证明有效:', isValid)  // true
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --testPathPattern="Transaction.test"
npm test -- --testPathPattern="TransactionBuilder.test"

# 查看测试覆盖率
npm test -- --coverage
```

## 技术文档

- [技术设计文档](./docs/TECH_DESIGN.md) - 完整的技术架构和设计
- [实现计划](./docs/PLAN.md) - 分阶段的实现路线图
- [教程 Part 1](./docs/ARTICLE_PART1.md) - 实现一个简单的比特币：基础设施
- [教程 Part 2](./docs/ARTICLE_PART2.md) - 实现一个简单的比特币：交易系统
- [教程 Part 3](./docs/ARTICLE_PART3.md) - 实现一个简单的比特币：区块链与挖矿
- [多方交易支持](./docs/MULTI_PARTY_TRANSACTIONS.md) - 支持多个参与者的交易

## 实现进度

### 已完成 ✅

- ✅ **Milestone 1**: 文档与基础设施
- ✅ **Milestone 2**: 密码学基础（SHA-256, ECDSA）
- ✅ **Milestone 3**: 钱包与 UTXO 模型
- ✅ **Milestone 4**: 交易系统（构建、签名、验证）
- ✅ **Milestone 5**: 区块链核心（Merkle 树、区块、PoW 挖矿）

### 规划中 🚧

- 🚧 **Milestone 4.5**: 脚本系统（可选扩展）
- 🚧 **Milestone 6**: 验证与演示

## 限制说明

本实现为教学目的，做了以下简化：

- ❌ 无 P2P 网络层
- ❌ 无持久化存储
- ❌ 无完整的比特币脚本系统（计划实现简化版）
- ❌ 简化的难度调整算法
- ❌ 无区块大小限制
- ❌ 简化的 UTXO 选择算法（贪心算法）

## 学习路径

### 推荐学习顺序

1. **阅读教程文章**
   - [Part 1: 基础设施](./docs/ARTICLE_PART1.md) - 密码学、钱包、UTXO
   - [Part 2: 交易系统](./docs/ARTICLE_PART2.md) - 交易构建、签名、验证
   - [Part 3: 区块链与挖矿](./docs/ARTICLE_PART3.md) - Merkle 树、区块、工作量证明

2. **理解核心代码**
   - `src/crypto/` - 密码学基础（哈希、签名）
   - `src/wallet/` - 钱包系统（密钥对、地址生成）
   - `src/transaction/` - 交易系统（UTXO、交易构建）
   - `src/merkle/` - Merkle 树（高效验证）
   - `src/blockchain/` - 区块链核心（区块、PoW、挖矿）

3. **运行测试用例**
   - `src/**/__tests__/` - 220+ 测试用例，覆盖所有功能

4. **阅读技术文档**
   - [技术设计文档](./docs/TECH_DESIGN.md) - 完整的架构设计
   - [实现计划](./docs/PLAN.md) - 分阶段的实现路线

## 参考资料

- [Bitcoin Whitepaper](https://bitcoin.org/bitcoin.pdf)
- [Mastering Bitcoin](https://github.com/bitcoinbook/bitcoinbook)
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)

## License

MIT License

