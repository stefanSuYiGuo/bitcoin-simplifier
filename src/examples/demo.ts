/**
 * 比特币系统演示
 * 展示从创世区块到多笔交易的完整流程
 */

import { Wallet } from '../wallet'
import { Transaction, TransactionBuilder } from '../transaction'
import { Block, Blockchain, Miner, ProofOfWork } from '../blockchain'

// 辅助函数：打印分隔线
function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`  ${title}`)
  console.log('='.repeat(60))
}

// 辅助函数：打印余额
function printBalances(
  blockchain: Blockchain,
  wallets: { name: string; wallet: Wallet }[]
) {
  console.log('\n当前余额：')
  const utxoSet = blockchain.getUTXOSet()
  for (const { name, wallet } of wallets) {
    const balance = utxoSet.getBalance(wallet.address)
    console.log(`  ${name}: ${balance} BTC`)
  }
}

// 主演示函数
async function demo() {
  printSeparator('比特币系统演示')

  // 1. 创建区块链
  console.log('\n步骤 1: 初始化区块链')
  const blockchain = new Blockchain({
    initialDifficulty: 2,
    blockReward: 50,
    targetBlockTime: 10,
    difficultyAdjustmentInterval: 10,
  })
  console.log('  ✓ 区块链配置完成')
  console.log(`    - 初始难度: 2`)
  console.log(`    - 区块奖励: 50 BTC`)
  console.log(`    - 目标出块时间: 10 秒`)

  // 2. 创建钱包
  console.log('\n步骤 2: 创建钱包')
  const minerWallet = new Wallet()
  const alice = new Wallet()
  const bob = new Wallet()
  const charlie = new Wallet()

  const wallets = [
    { name: 'Miner', wallet: minerWallet },
    { name: 'Alice', wallet: alice },
    { name: 'Bob', wallet: bob },
    { name: 'Charlie', wallet: charlie },
  ]

  console.log('  ✓ 已创建 4 个钱包')
  for (const { name, wallet } of wallets) {
    console.log(`    - ${name}: ${wallet.address.substring(0, 20)}...`)
  }

  // 3. 创建创世区块
  console.log('\n步骤 3: 创建创世区块')
  const genesisCoinbase = Transaction.createCoinbase(minerWallet.address, 50, 0)
  const genesisBlock = Block.createGenesisBlock(genesisCoinbase)
  blockchain.initializeWithGenesisBlock(genesisBlock)

  console.log('  ✓ 创世区块已创建')
  console.log(`    - 区块哈希: ${genesisBlock.hash.substring(0, 20)}...`)
  console.log(`    - Merkle 根: ${genesisBlock.merkleRoot.substring(0, 20)}...`)

  printBalances(blockchain, wallets)

  // 4. 矿工挖第一个区块
  printSeparator('挖矿：区块 #1')

  const miner = new Miner(minerWallet, blockchain)
  console.log('\n正在挖矿...')

  const { block: block1, miningResult: result1 } = miner.mineEmptyBlock()

  console.log('  ✓ 挖矿成功！')
  console.log(`    - 区块哈希: ${result1.hash.substring(0, 20)}...`)
  console.log(`    - Nonce: ${result1.nonce}`)
  console.log(`    - 尝试次数: ${result1.attempts}`)
  console.log(`    - 用时: ${result1.duration}ms`)
  console.log(`    - 哈希率: ${result1.hashRate} H/s`)

  blockchain.addBlock(block1)
  console.log('  ✓ 区块已添加到区块链')

  printBalances(blockchain, wallets)

  // 5. 矿工给 Alice 和 Bob 转账
  printSeparator('交易：矿工转账给 Alice 和 Bob')

  const utxoSet1 = blockchain.getUTXOSet()
  const tx1 = new TransactionBuilder(utxoSet1)
    .from(minerWallet)
    .to(alice.address, 30)
    .to(bob.address, 20)
    .buildAndSign()

  console.log('\n  ✓ 交易已创建')
  console.log(`    - 交易 ID: ${tx1.id.substring(0, 20)}...`)
  console.log(`    - 输入: ${tx1.inputs.length} 个`)
  console.log(`    - 输出: ${tx1.outputs.length} 个 (包含找零)`)

  // 6. 挖矿打包交易
  console.log('\n正在挖矿打包交易...')
  const { block: block2, miningResult: result2 } = miner.mineBlock([tx1])

  console.log('  ✓ 挖矿成功！')
  console.log(`    - 区块哈希: ${result2.hash.substring(0, 20)}...`)
  console.log(`    - 包含交易: ${block2.transactions.length} 笔`)
  console.log(`    - 用时: ${result2.duration}ms`)

  blockchain.addBlock(block2)
  console.log('  ✓ 区块已添加到区块链')

  printBalances(blockchain, wallets)

  // 7. Alice 给 Charlie 转账
  printSeparator('交易：Alice 转账给 Charlie')

  const utxoSet2 = blockchain.getUTXOSet()
  const tx2 = TransactionBuilder.createSimpleTransfer(
    alice,
    charlie.address,
    15,
    utxoSet2
  )

  console.log('\n  ✓ 交易已创建')
  console.log(`    - 交易 ID: ${tx2.id.substring(0, 20)}...`)
  console.log(`    - Alice 转给 Charlie: 15 BTC`)

  // 8. Bob 也给 Charlie 转账
  const tx3 = TransactionBuilder.createSimpleTransfer(
    bob,
    charlie.address,
    10,
    utxoSet2
  )

  console.log('  ✓ 交易已创建')
  console.log(`    - 交易 ID: ${tx3.id.substring(0, 20)}...`)
  console.log(`    - Bob 转给 Charlie: 10 BTC`)

  // 9. 挖矿打包两笔交易
  console.log('\n正在挖矿打包 2 笔交易...')
  const { block: block3, miningResult: result3 } = miner.mineBlock([tx2, tx3])

  console.log('  ✓ 挖矿成功！')
  console.log(`    - 区块哈希: ${result3.hash.substring(0, 20)}...`)
  console.log(`    - 包含交易: ${block3.transactions.length} 笔`)
  console.log(`    - 用时: ${result3.duration}ms`)

  blockchain.addBlock(block3)
  console.log('  ✓ 区块已添加到区块链')

  printBalances(blockchain, wallets)

  // 10. 显示区块链状态
  printSeparator('区块链最终状态')

  const stats = blockchain.getStats() as any
  console.log('\n区块链统计：')
  console.log(`  - 总区块数: ${stats.length}`)
  console.log(`  - 当前难度: ${stats.difficulty}`)
  console.log(`  - UTXO 数量: ${stats.utxoCount}`)
  console.log(
    `  - 最新区块: #${stats.latestBlock.index} [${stats.latestBlock.hash.substring(0, 10)}...]`
  )

  console.log('\n所有区块：')
  const chain = blockchain.getChain()
  for (const block of chain) {
    console.log(
      `  - 区块 #${block.index}: ${block.hash.substring(0, 20)}... (${block.transactions.length} 笔交易)`
    )
  }

  printBalances(blockchain, wallets)

  // 11. 验证工作量证明
  printSeparator('验证工作量证明')

  console.log('\n验证所有区块的 PoW：')
  for (const block of chain) {
    const isValidPoW = ProofOfWork.verify(block)
    console.log(
      `  - 区块 #${block.index}: ${isValidPoW ? '✓ PoW 有效' : '✗ PoW 无效'}`
    )
  }

  printSeparator('演示完成')
  console.log('\n')
}

// 运行演示
demo().catch(console.error)

