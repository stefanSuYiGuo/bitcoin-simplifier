# 比特币系统实现计划

## Milestone 1: 文档与基础设施 🏗️

**目标**: 建立项目框架和技术文档

**交付物**:
- `docs/TECH_DESIGN.md`: 完整的技术设计文档
- `package.json`: 项目配置和依赖管理
- `tsconfig.json`: TypeScript 编译配置
- `.gitignore`: 版本控制配置
- `README.md`: 项目使用说明

**核心依赖**: `elliptic` (椭圆曲线加密), `crypto-js` (哈希), `@types/node`

## Milestone 2: 密码学基础 🔐

**目标**: 实现比特币系统的安全基石

**交付物**: `src/crypto/` 目录
- `hash.ts`: SHA-256 哈希函数封装
- `signature.ts`: ECDSA 签名与验证 (secp256k1 曲线)
- 单元测试验证密码学功能

**关键技术**: 椭圆曲线数字签名算法 (ECDSA)

## Milestone 3: 钱包与 UTXO 模型 💰

**目标**: 实现价值存储和转移的基础

**交付物**: 
- `src/wallet/` 目录
  - `KeyPair.ts`: 公私钥对管理
  - `Wallet.ts`: 密钥生成、地址生成、交易签名
- `src/transaction/` 目录 (UTXO 部分)
  - `TxInput.ts`: 交易输入结构
  - `TxOutput.ts`: 交易输出结构
  - `UTXO.ts`: 未花费输出集合管理

**地址生成**: `Base58(RIPEMD160(SHA256(publicKey)))`

## Milestone 4: 交易系统 📝 ✅ 已完成

**目标**: 实现完整的交易创建、签名和验证

**交付物**: `src/transaction/` 目录扩展
- ✅ `Transaction.ts`: 交易数据结构、序列化、签名验证
- ✅ `TransactionSigner.ts`: 交易签名和验证逻辑
- ✅ `TransactionBuilder.ts`: 交易构建器 (选择UTXO、计算找零)
- ✅ Coinbase 交易（矿工奖励交易）
- ✅ 交易验证逻辑
- ✅ 完整的单元测试覆盖

**核心功能**: UTXO 选择算法、双花检测、签名验证、矿工费计算

**文章**: `docs/ARTICLE_PART2.md` - 实现一个简单的比特币：Part 2 - 交易系统

## Milestone 4.5: 脚本系统 📜 ✅ 已完成

**目标**: 实现比特币脚本语言，使交易验证更灵活

**交付物**: `src/script/` 目录
- ✅ `OpCodes.ts`: 操作码定义和实现
  - 栈操作: `OP_DUP`, `OP_DROP`, `OP_SWAP`, `OP_ROT` 等
  - 加密操作: `OP_HASH160`, `OP_SHA256`, `OP_CHECKSIG`, `OP_CHECKMULTISIG` 等
  - 逻辑操作: `OP_EQUAL`, `OP_EQUALVERIFY`, `OP_VERIFY` 等
  - 算术操作: `OP_ADD`, `OP_SUB`, `OP_LESSTHAN` 等
  - 数据操作: `OP_PUSHDATA`, `OP_0` - `OP_16` 等
- ✅ `Stack.ts`: 脚本执行栈
- ✅ `Script.ts`: 脚本执行引擎
- ✅ `ScriptBuilder.ts`: 脚本构建器
  - `buildP2PKHLockingScript()` / `buildP2PKHUnlockingScript()`: P2PKH 脚本
  - `buildP2SHLockingScript()` / `buildP2SHUnlockingScript()`: P2SH 脚本
  - `buildMultiSigScript()` / `buildMultiSigUnlockingScript()`: 多签脚本
  - `buildP2SHMultiSig()`: P2SH 封装的多签
  - `buildOpReturnScript()`: OP_RETURN 数据存储脚本
- ✅ 更新 `TxInput.ts`: 支持 `scriptSig` 字段（向后兼容）
- ✅ 更新 `TxOutput.ts`: 支持 `scriptPubKey` 字段（向后兼容）
- ✅ 完整单元测试覆盖 (26 个测试用例)

**支持的脚本类型**:
1. ✅ **P2PKH (Pay-to-Public-Key-Hash)**: 最常见的交易类型
2. ✅ **P2SH (Pay-to-Script-Hash)**: 支持复杂脚本
3. ✅ **Multi-Signature**: m-of-n 多重签名
4. ✅ **P2PK (Pay-to-Public-Key)**: 早期交易类型
5. ✅ **OP_RETURN**: 数据存储脚本

**技术要点**:
- 基于栈的虚拟机
- 操作码安全检查（最大 201 个操作）
- 栈深度限制（1,000 个元素）
- 支持脚本类型自动识别

**文章**: `docs/ARTICLE_PART4.md` - 实现一个简单的比特币：Part 4 - 脚本系统

## Milestone 5: 区块链核心 ⛏️ ✅ 已完成

**目标**: 实现区块链存储和工作量证明挖矿

**交付物**: 
- ✅ `src/merkle/` 目录
  - ✅ `MerkleTree.ts`: Merkle 树构建和验证
- ✅ `src/blockchain/` 目录
  - ✅ `Block.ts`: 区块结构 (前区块哈希、Merkle根、时间戳、难度、nonce)
  - ✅ `ProofOfWork.ts`: 工作量证明算法 (挖矿核心)
  - ✅ `Blockchain.ts`: 区块链管理、难度动态调整、UTXO 集合维护
  - ✅ `Miner.ts`: 矿工类 (打包交易、计算 Coinbase 奖励、执行挖矿)
- ✅ 完整的单元测试覆盖

**挖矿机制**: 
- 工作量证明 (PoW) 算法
- 区块奖励: 50 BTC (可配置)
- 矿工费: 交易输入 - 交易输出的差额
- 难度调整: 每 10 个区块调整一次，目标出块时间 10 秒

**文章**: `docs/ARTICLE_PART3.md` - 实现一个简单的比特币：Part 3 - 区块链与挖矿

## Milestone 6: 验证与演示 ✅ 已完成

**目标**: 完成系统集成和端到端演示

**交付物**:
- ✅ `src/examples/demo.ts`: 完整演示脚本
  - 创建多个钱包 (Miner, Alice, Bob, Charlie)
  - 生成创世区块
  - 构建并签名多笔交易
  - 挖矿添加新区块
  - 验证整条区块链 PoW
  - 显示余额变化和区块链状态
- ✅ 验证逻辑 (集成在现有模块中)
  - `Blockchain.isValidNewBlock()`: 区块完整性验证
  - `Blockchain.isValidTransaction()`: 交易有效性验证
  - `ProofOfWork.verify()`: 工作量证明验证

**额外完成** (超出原计划):
- ✅ `src/server/`: REST API 服务器
  - Express 后端，提供区块链、钱包、交易、挖矿、Merkle 等 API
- ✅ `frontend/`: Web 前端界面
  - React + TypeScript + Tailwind CSS
  - 区块链浏览器、钱包管理、交易创建、挖矿面板、Merkle 验证器
  - Merkle 树可视化图解

## 核心技术要点

- **UTXO 模型**: 交易不直接记录余额,而是通过未花费输出追踪
- **Merkle 树**: 提高交易验证效率,只需验证路径而非全部交易
- **工作量证明**: 通过调整 nonce 使区块哈希满足难度目标
- **数字签名**: 使用 ECDSA 保证交易不可伪造
- **挖矿激励**: Coinbase 交易创造新币，矿工费激励打包交易
- **经济模型**: 区块奖励 + 矿工费 = 矿工收益
- **脚本系统**: 基于栈的脚本语言，支持 P2PKH、P2SH、多签等交易类型

