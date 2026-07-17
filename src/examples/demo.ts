/**
 * Bitcoin system demonstration.
 * Shows the complete flow from the genesis block through multiple transactions.
 */

import { Wallet } from '../wallet'
import { Transaction, TransactionBuilder } from '../transaction'
import { Block, Blockchain, Miner, ProofOfWork } from '../blockchain'

// Helper: print a section divider
function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`  ${title}`)
  console.log('='.repeat(60))
}

// Helper: print wallet balances
function printBalances(
  blockchain: Blockchain,
  wallets: { name: string; wallet: Wallet }[]
) {
  console.log('\nCurrent balances:')
  const utxoSet = blockchain.getUTXOSet()
  for (const { name, wallet } of wallets) {
    const balance = utxoSet.getBalance(wallet.address)
    console.log(`  ${name}: ${balance} BTC`)
  }
}

// Main demonstration
async function demo() {
  printSeparator('Bitcoin System Demonstration')

  // 1. Create the blockchain
  console.log('\nStep 1: Initialize the blockchain')
  const blockchain = new Blockchain({
    initialDifficulty: 2,
    blockReward: 50,
    targetBlockTime: 10,
    difficultyAdjustmentInterval: 10,
  })
  console.log('  ✓ Blockchain configured')
  console.log(`    - Initial difficulty: 2`)
  console.log(`    - Block reward: 50 BTC`)
  console.log(`    - Target block time: 10 seconds`)

  // 2. Create wallets
  console.log('\nStep 2: Create wallets')
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

  console.log('  ✓ Created 4 wallets')
  for (const { name, wallet } of wallets) {
    console.log(`    - ${name}: ${wallet.address.substring(0, 20)}...`)
  }

  // 3. Create the genesis block
  console.log('\nStep 3: Create the genesis block')
  const genesisCoinbase = Transaction.createCoinbase(minerWallet.address, 50, 0)
  const genesisBlock = Block.createGenesisBlock(genesisCoinbase)
  blockchain.initializeWithGenesisBlock(genesisBlock)

  console.log('  ✓ Genesis block created')
  console.log(`    - Block hash: ${genesisBlock.hash.substring(0, 20)}...`)
  console.log(`    - Merkle root: ${genesisBlock.merkleRoot.substring(0, 20)}...`)

  printBalances(blockchain, wallets)

  // 4. Mine the first block
  printSeparator('Mining: Block #1')

  const miner = new Miner(minerWallet, blockchain)
  console.log('\nMining...')

  const { block: block1, miningResult: result1 } = miner.mineEmptyBlock()

  console.log('  ✓ Block mined!')
  console.log(`    - Block hash: ${result1.hash.substring(0, 20)}...`)
  console.log(`    - Nonce: ${result1.nonce}`)
  console.log(`    - Attempts: ${result1.attempts}`)
  console.log(`    - Duration: ${result1.duration}ms`)
  console.log(`    - Hash rate: ${result1.hashRate} H/s`)

  blockchain.addBlock(block1)
  console.log('  ✓ Block added to the blockchain')

  printBalances(blockchain, wallets)

  // 5. Transfer funds from the miner to Alice and Bob
  printSeparator('Transaction: Miner Pays Alice and Bob')

  const utxoSet1 = blockchain.getUTXOSet()
  const tx1 = new TransactionBuilder(utxoSet1)
    .from(minerWallet)
    .to(alice.address, 30)
    .to(bob.address, 20)
    .buildAndSign()

  console.log('\n  ✓ Transaction created')
  console.log(`    - Transaction ID: ${tx1.id.substring(0, 20)}...`)
  console.log(`    - Inputs: ${tx1.inputs.length}`)
  console.log(`    - Outputs: ${tx1.outputs.length} (including change)`)

  // 6. Mine a block containing the transaction
  console.log('\nMining a block with the transaction...')
  const { block: block2, miningResult: result2 } = miner.mineBlock([tx1])

  console.log('  ✓ Block mined!')
  console.log(`    - Block hash: ${result2.hash.substring(0, 20)}...`)
  console.log(`    - Transactions: ${block2.transactions.length}`)
  console.log(`    - Duration: ${result2.duration}ms`)

  blockchain.addBlock(block2)
  console.log('  ✓ Block added to the blockchain')

  printBalances(blockchain, wallets)

  // 7. Transfer funds from Alice to Charlie
  printSeparator('Transaction: Alice Pays Charlie')

  const utxoSet2 = blockchain.getUTXOSet()
  const tx2 = TransactionBuilder.createSimpleTransfer(
    alice,
    charlie.address,
    15,
    utxoSet2
  )

  console.log('\n  ✓ Transaction created')
  console.log(`    - Transaction ID: ${tx2.id.substring(0, 20)}...`)
  console.log(`    - Alice pays Charlie: 15 BTC`)

  // 8. Transfer funds from Bob to Charlie
  const tx3 = TransactionBuilder.createSimpleTransfer(
    bob,
    charlie.address,
    10,
    utxoSet2
  )

  console.log('  ✓ Transaction created')
  console.log(`    - Transaction ID: ${tx3.id.substring(0, 20)}...`)
  console.log(`    - Bob pays Charlie: 10 BTC`)

  // 9. Mine a block containing both transactions
  console.log('\nMining a block with 2 transactions...')
  const { block: block3, miningResult: result3 } = miner.mineBlock([tx2, tx3])

  console.log('  ✓ Block mined!')
  console.log(`    - Block hash: ${result3.hash.substring(0, 20)}...`)
  console.log(`    - Transactions: ${block3.transactions.length}`)
  console.log(`    - Duration: ${result3.duration}ms`)

  blockchain.addBlock(block3)
  console.log('  ✓ Block added to the blockchain')

  printBalances(blockchain, wallets)

  // 10. Display the final blockchain state
  printSeparator('Final Blockchain State')

  const stats = blockchain.getStats() as any
  console.log('\nBlockchain statistics:')
  console.log(`  - Total blocks: ${stats.length}`)
  console.log(`  - Current difficulty: ${stats.difficulty}`)
  console.log(`  - UTXO count: ${stats.utxoCount}`)
  console.log(
    `  - Latest block: #${stats.latestBlock.index} [${stats.latestBlock.hash.substring(0, 10)}...]`
  )

  console.log('\nAll blocks:')
  const chain = blockchain.getChain()
  for (const block of chain) {
    console.log(
      `  - Block #${block.index}: ${block.hash.substring(0, 20)}... (${block.transactions.length} transactions)`
    )
  }

  printBalances(blockchain, wallets)

  // 11. Verify proof of work
  printSeparator('Verify Proof of Work')

  console.log('\nVerifying PoW for every block:')
  for (const block of chain) {
    const isValidPoW = ProofOfWork.verify(block)
    console.log(
      `  - Block #${block.index}: ${isValidPoW ? '✓ Valid PoW' : '✗ Invalid PoW'}`
    )
  }

  printSeparator('Demonstration Complete')
  console.log('\n')
}

// Run the demonstration
demo().catch(console.error)

