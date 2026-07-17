# Building a Simple Bitcoin: Part 3 - Blockchain and Mining

In the first two articles, we implemented Bitcoin's foundational components: cryptographic utilities, the wallet system, the UTXO model, and the transaction system. We have now reached Bitcoin's core: the blockchain and mining.

This article explores how to implement the blockchain storage structure, Merkle trees, the proof-of-work algorithm, and the process by which miners package transactions and earn rewards through mining.

## 1. Why a Blockchain Is Necessary

The previous articles addressed how to prove ownership through digital signatures and how to record transactions with the UTXO model. One critical question remains: Who maintains the ledger, and how can we ensure that it is not tampered with?

In a traditional system, a bank maintains the ledger, and we trust it not to act maliciously. Bitcoin's decentralized environment has no trusted central authority. We need a mechanism that allows all participants to maintain the same ledger and makes recorded data difficult to modify.

A blockchain is such a data structure. It packages transactions into blocks, and each block contains the hash of the preceding block, forming a chain. To alter historical records, an attacker would need to recalculate every block after the modified block, which is computationally extremely difficult.

This introduces another problem: a block may contain hundreds or thousands of transactions. Must we download every transaction to verify whether one particular transaction is included? That is clearly impractical for lightweight clients such as mobile wallets.

Bitcoin's solution is the **Merkle tree**. A block header can represent the complete transaction set with a single 32-byte Merkle root. Using only a small number of hashes—a Merkle proof—a verifier can prove that a transaction is included in the block without downloading every transaction. This design makes lightweight clients possible.

## 2. Merkle Trees: The Foundation of Efficient Verification

Let us examine how a Merkle tree works and how it provides efficient verification for a blockchain.

### 2.1 What Is a Merkle Tree?

A Merkle tree is a binary tree whose leaf nodes are hashes of data and whose non-leaf nodes hash the values of their children. The final root, known as the Merkle root, is a unique fingerprint of the complete dataset.

Consider an example:

**Building a Merkle tree:**

```
Transaction list: [tx1, tx2, tx3, tx4]

Level 1 (leaf nodes):
Hash(tx1)  Hash(tx2)  Hash(tx3)  Hash(tx4)
   H1         H2         H3         H4

Level 2:
     H12 = Hash(H1 + H2)    H34 = Hash(H3 + H4)

Level 3 (root):
          Root = Hash(H12 + H34)
```

What is a Merkle tree used for? To verify whether tx1 is included in a block, you do not need to download every transaction. You only need:

**Merkle proof:**

| Required data | Description |
|-----------|------|
| tx1 | Transaction to verify |
| H2 | Sibling node of tx1 |
| H34 | Sibling node of the parent |
| Root | Merkle root already present in the block header |

Verification steps:

```
1. Calculate H1 = Hash(tx1)
2. Calculate H12 = Hash(H1 + H2)
3. Calculate Root' = Hash(H12 + H34)
4. Compare Root' with Root
```

If they are equal, the proof confirms that tx1 is included in the block. For a block containing 1,000 transactions, a Merkle proof requires only about 10 hash values instead of all 1,000 transactions.

### 2.2 Implementing a Merkle Tree

We implement the Merkle tree with object references, constructing a true tree structure through references between nodes:

```typescript
export interface MerkleNode {
  hash: string
  left?: MerkleNode   // Reference to the left child
  right?: MerkleNode  // Reference to the right child
}

export class MerkleTree {
  private root: MerkleNode | null = null
  private leaves: string[] = []

  constructor(data: string[]) {
    if (data.length === 0) {
      throw new Error('A Merkle tree requires at least one data element')
    }

    // Hash each data element
    this.leaves = data.map((item) => Hash.sha256(item))
    // Build the tree
    this.root = this.buildTree(this.leaves)
  }

  private buildTree(hashes: string[]): MerkleNode {
    // Create leaf nodes, one node object for each hash
    const leafNodes: MerkleNode[] = hashes.map((hash) => ({ hash }))
    
    // Build the tree recursively
    return this.buildTreeFromNodes(leafNodes)
  }

  private buildTreeFromNodes(nodes: MerkleNode[]): MerkleNode {
    // A single remaining node is the root
    if (nodes.length === 1) {
      return nodes[0]
    }

    const parentNodes: MerkleNode[] = []

    // Pair nodes to build their parents
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i]
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i]

      const parent: MerkleNode = {
        hash: Hash.sha256(left.hash + right.hash),
        left,   // Preserve the left child reference
        right,  // Preserve the right child reference
      }

      parentNodes.push(parent)
    }

    // Build the next level recursively using node objects rather than hash values
    return this.buildTreeFromNodes(parentNodes)
  }

  getRoot(): string {
    if (!this.root) {
      throw new Error('Merkle tree has not been built')
    }
    return this.root.hash
  }
}
```

Key points:

- **Recursive node passing**: `buildTreeFromNodes` accepts an array of nodes and builds recursively while preserving references between nodes
- **Odd element handling**: If the number of data elements is odd, the final node is paired with itself
- **Time complexity**: O(n), where n is the number of data elements

## 3. Block Structure: The Foundation of the Chain

A block is the basic unit of a blockchain. Each block contains two parts: a block header and a block body.

### 3.1 Block Header

The block header contains block metadata and is the subject of proof of work:

| Field | Description | Purpose |
|------|------|------|
| index | Block height | Identifies the block's position in the chain |
| previousHash | Previous block hash | Links blocks into a chain |
| timestamp | Timestamp | Records when the block was created |
| merkleRoot | Merkle root | Fingerprint of all transactions |
| difficulty | Difficulty | Mining target difficulty |
| nonce | Nonce | Variable used for proof of work |

### 3.2 Block Body

The block body contains the transaction list. The first transaction must be a coinbase transaction that pays the miner's reward; the remaining transactions are regular transactions.

### 3.3 Block Hash

The block hash is calculated by applying double SHA-256 to the block header:

```typescript
calculateHash(): string {
  const blockHeader = JSON.stringify({
    index: this.index,
    previousHash: this.previousHash,
    timestamp: this.timestamp,
    merkleRoot: this.merkleRoot,
    difficulty: this.difficulty,
    nonce: this.nonce,
  })
  return Hash.doubleSha256(blockHeader)
}
```

Note that the block hash does not contain the transaction content directly; it contains only the Merkle root. Consequently, hash calculation remains fast even when the transaction data is large.

### 3.4 Genesis Block

The first block in a blockchain is called the genesis block. It has no preceding block:

```typescript
static createGenesisBlock(coinbaseTx: Transaction): Block {
  return new Block(
    0,                    // Index is 0
    '0',                  // Previous block hash is '0'
    Date.now(),
    [coinbaseTx],
    1                     // Initial difficulty
  )
}
```

## 4. Proof of Work: The Core of Mining

Proof of Work (PoW) is Bitcoin's consensus mechanism. It requires miners to find a nonce that makes the block hash satisfy the difficulty requirement.

### 4.1 Difficulty Target

Difficulty is represented by the number of leading zeros. For example, a difficulty of 4 means that the block hash must begin with four zeros:

```
Difficulty 1: 0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Difficulty 2: 00xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Difficulty 3: 000xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Difficulty 4: 0000xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Each increase of 1 in difficulty multiplies the average number of required attempts by 16.

### 4.2 Mining Process

Mining repeatedly tries different nonce values until it finds a hash that satisfies the difficulty requirement:

```typescript
static mine(block: Block): MiningResult {
  const startTime = Date.now()
  let nonce = 0
  let hash: string
  const target = '0'.repeat(block.difficulty)

  while (true) {
    block.setNonce(nonce)
    hash = block.hash

    if (hash.startsWith(target)) {
      const endTime = Date.now()
      const duration = endTime - startTime
      const hashRate = Math.floor((nonce / duration) * 1000)

      return {
        nonce,
        hash,
        attempts: nonce,
        duration,
        hashRate,
      }
    }

    nonce++
  }
}
```

Consider a practical mining example:

**Mining example (difficulty = 3):**

```
Try nonce = 0:
  Block hash: 8a3b4c5d...
  Requirement not satisfied (does not begin with 000)

Try nonce = 1:
  Block hash: 2f9e1a7b...
  Requirement not satisfied

...

Try nonce = 4832:
  Block hash: 000a1b2c3d4e5f...
  Requirement satisfied; a valid block has been found
```

The process looks simple, but in practice:
- Difficulty 1: 16 attempts on average
- Difficulty 2: 256 attempts on average
- Difficulty 3: 4,096 attempts on average
- Difficulty 4: 65,536 attempts on average

On the real Bitcoin network, the difficulty is far higher and finding a valid block may require trillions of attempts.

The ingenuity of proof of work is that it is **easy to verify but difficult to compute**. Anyone can quickly verify a block's validity, but creating a valid block requires substantial computational resources
. Modifying historical records requires mining every subsequent block again, which is extremely costly

## 5. Blockchain Management: Maintaining the Ledger

With blocks and proof of work in place, we need a class to manage the entire blockchain.

### 5.1 Core Blockchain Functions

```typescript
export class Blockchain {
  private chain: Block[] = []
  private utxoSet: UTXOSet
  private config: BlockchainConfig

  // Add a new block
  addBlock(block: Block): boolean {
    if (!this.isValidNewBlock(block, this.getLatestBlock())) {
      return false
    }

    this.chain.push(block)
    this.updateUTXOSet(block)
    return true
  }
}
```

### 5.2 Block Validation

Several checks must be performed before a block is added:

**Block validation checks:**

| Check | Description | Importance |
|--------|------|--------|
| Sequential index | `newBlock.index = previousBlock.index + 1` | Ensures chain continuity |
| Matching previous block hash | `newBlock.previousHash = previousBlock.hash` | Ensures chain integrity |
| Proof of work | `hash.startsWith('0'.repeat(difficulty))` | Ensures computational work was performed |
| Valid timestamp | `newBlock.timestamp > previousBlock.timestamp` | Prevents time from moving backward |
| Valid transactions | Every transaction passes validation | Ensures transaction validity |

```typescript
private isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
  // Check the index
  if (newBlock.index !== previousBlock.index + 1) {
    return false
  }

  // Check the previous block hash
  if (newBlock.previousHash !== previousBlock.hash) {
    return false
  }

  // Check proof of work
  if (!ProofOfWork.verify(newBlock)) {
    return false
  }

  // Check the timestamp
  if (newBlock.timestamp <= previousBlock.timestamp) {
    return false
  }

  // Validate every transaction
  for (const tx of newBlock.transactions) {
    // Skip UTXO validation for coinbase transactions
    if (tx.isCoinbase()) {
      continue
    }

    // Verify that the transaction's UTXOs exist
    if (!this.isValidTransaction(tx)) {
      return false
    }
  }

  return true
}

private isValidTransaction(tx: Transaction): boolean {
  // Check that the UTXO referenced by every input exists
  for (const input of tx.inputs) {
    if (!this.utxoSet.has(input.txId, input.outputIndex)) {
      return false
    }
  }
  return true
}
```

### 5.3 Difficulty Adjustment

To maintain a stable block interval, the blockchain must adjust mining difficulty periodically. Our implementation adjusts it every 10 blocks:

```typescript
calculateNextDifficulty(): number {
  const latestBlock = this.getLatestBlock()

  // Keep the current difficulty until the adjustment interval is reached
  if ((latestBlock.index + 1) % this.config.difficultyAdjustmentInterval !== 0) {
    return latestBlock.difficulty
  }

  // Get the first block from the previous adjustment period
  const adjustmentBlock = this.chain[
    this.chain.length - this.config.difficultyAdjustmentInterval
  ]

  // Calculate the actual elapsed time
  const actualTime = (latestBlock.timestamp - adjustmentBlock.timestamp) / 1000

  // Calculate the expected elapsed time
  const expectedTime = 
    this.config.targetBlockTime * this.config.difficultyAdjustmentInterval

  const ratio = actualTime / expectedTime

  // Increase difficulty if the actual time is more than twice as fast as expected
  if (ratio < 0.5) {
    return latestBlock.difficulty + 1
  }

  // Decrease difficulty if the actual time is more than twice as slow as expected
  if (ratio > 2) {
    return Math.max(1, latestBlock.difficulty - 1)
  }

  return latestBlock.difficulty
}
```

**Difficulty adjustment example:**

```
Scenario: Target block time of 10 seconds and an adjustment interval of 10 blocks

Case 1: Blocks are produced too quickly
  Expected time: 10 seconds × 10 = 100 seconds
  Actual time: 45 seconds
  Ratio: 45/100 = 0.45 < 0.5
  Adjustment: Difficulty +1

Case 2: Blocks are produced too slowly
  Expected time: 100 seconds
  Actual time: 210 seconds
  Ratio: 210/100 = 2.1 > 2
  Adjustment: Difficulty -1

Case 3: Block production speed is normal
  Expected time: 100 seconds
  Actual time: 95 seconds
  Ratio: 95/100 = 0.95
  Adjustment: Difficulty unchanged
```

### 5.4 Maintaining the UTXO Set

Whenever a new block is added to the chain, the UTXO set must be updated:

```typescript
private updateUTXOSet(block: Block): void {
  for (const tx of block.transactions) {
    // Remove spent UTXOs except for coinbase transactions
    if (!tx.isCoinbase()) {
      for (const input of tx.inputs) {
        this.utxoSet.remove(input.txId, input.outputIndex)
      }
    }

    // Add new UTXOs
    tx.outputs.forEach((output, index) => {
      this.utxoSet.add(tx.id, index, output)
    })
  }
}
```

**UTXO update example:**

Initial state:

| UTXO | Amount | Owner | Status |
|------|------|--------|------|
| tx1:0 | 100 BTC | Alice | Unspent |
| tx2:0 | 50 BTC | Bob | Unspent |

The new block contains transaction tx3, in which Alice sends Carol 60 BTC:

| UTXO | Amount | Owner | Status | Operation |
|------|------|--------|------|------|
| tx1:0 | 100 BTC | Alice | Spent | Remove |
| tx2:0 | 50 BTC | Bob | Unspent | Retain |
| tx3:0 | 60 BTC | Carol | Unspent | Add |
| tx3:1 | 40 BTC | Alice | Unspent | Add as change |

Coinbase transaction (tx3_coinbase, 50 BTC mining reward):

| UTXO | Amount | Owner | Status | Operation |
|------|------|--------|------|------|
| tx3_coinbase:0 | 50 BTC | Miner | Unspent | Add |

## 6. Miners: Packaging Transactions and Mining

Miners maintain the blockchain. They select transactions, create blocks, perform proof of work, and receive rewards.

### 6.1 Miner Workflow

**Complete mining workflow:**

```
Step 1: Select transactions
  - Select unconfirmed transactions from the transaction pool
  - Sort them by fee in descending order
  - Select the first N transactions

Step 2: Calculate the reward
  - Block reward: 50 BTC (fixed)
  - Transaction fees: Sum of fees from all transactions
  - Total miner revenue = block reward + transaction fees

Step 3: Create the coinbase transaction
  - Input: Special all-zero txId
  - Output: Total miner revenue → miner address

Step 4: Build the block
  - Place the coinbase transaction first
  - Add the selected transactions
  - Set the previous block hash, timestamp, and difficulty

Step 5: Perform proof of work
  - Repeatedly try nonce values
  - Continue until a hash satisfies the difficulty requirement

Step 6: Broadcast the block
  - Add the mined block to the blockchain
  - Broadcast it to other nodes (omitted from our simplified version)
```

### 6.2 Implementing the Miner Class

```typescript
export class Miner {
  private wallet: Wallet
  private blockchain: Blockchain

  mineBlock(transactions: Transaction[]): {
    block: Block
    miningResult: MiningResult
  } {
    const latestBlock = this.blockchain.getLatestBlock()

    // Calculate the miner reward
    const blockReward = this.blockchain.getBlockReward()
    const totalFees = this.calculateTotalFees(transactions)
    const minerReward = blockReward + totalFees

    // Create the coinbase transaction
    const coinbaseTx = Transaction.createCoinbase(
      this.wallet.address,
      minerReward,
      latestBlock.index + 1
    )

    // Build the block
    const difficulty = this.blockchain.calculateNextDifficulty()
    const newBlock = new Block(
      latestBlock.index + 1,
      latestBlock.hash,
      Date.now(),
      [coinbaseTx, ...transactions],
      difficulty
    )

    // Perform proof of work
    const miningResult = ProofOfWork.mine(newBlock)

    return { block: newBlock, miningResult }
  }
}
```

### 6.3 Transaction Selection Strategy

Miners must select transactions from the transaction pool. We use a greedy strategy that prioritizes transactions with higher fees.

```typescript
selectTransactions(
  candidateTransactions: Transaction[],
  maxTransactions: number = 100
): Transaction[] {
  const utxoSet = this.blockchain.getUTXOSet()

  // Calculate the fee for each transaction
  const txWithFees = candidateTransactions
    .filter((tx) => !tx.isCoinbase())
    .map((tx) => {
      try {
        const fee = tx.calculateFee(utxoSet.getAll())
        return { tx, fee }
      } catch (error) {
        return null
      }
    })
    .filter((item) => item !== null)

  // Sort by fee in descending order
  txWithFees.sort((a, b) => b.fee - a.fee)

  // Take the first N transactions
  return txWithFees.slice(0, maxTransactions).map((item) => item.tx)
}
```

**Transaction selection example:**

Transaction pool:

| Transaction ID | Total inputs | Total outputs | Fee | Priority |
|---------|---------|---------|--------|--------|
| tx1 | 100 BTC | 98 BTC | 2 BTC | 1 |
| tx2 | 50 BTC | 49.5 BTC | 0.5 BTC | 3 |
| tx3 | 80 BTC | 79 BTC | 1 BTC | 2 |
| tx4 | 30 BTC | 29.9 BTC | 0.1 BTC | 4 |

Miner selection (assuming only two are selected):
- Select tx1, which has the highest fee
- Select tx3, which has the second-highest fee

**Miner revenue calculation:**

```
Block reward: 50 BTC
Transaction fees: 2 BTC (tx1) + 1 BTC (tx3) = 3 BTC
Total miner revenue: 50 + 3 = 53 BTC
```

## 7. Practical Scenario

The following complete example demonstrates how the blockchain system works.

### Scenario: From Genesis to Multiple Blocks

```typescript
// 1. Create the blockchain and wallets
const blockchain = new Blockchain({
  initialDifficulty: 2,
  blockReward: 50,
  targetBlockTime: 10,
  difficultyAdjustmentInterval: 10,
})

const miner = new Wallet()
const alice = new Wallet()
const bob = new Wallet()

// 2. Create the genesis block
const genesisCoinbase = Transaction.createCoinbase(miner.address, 50, 0)
const genesisBlock = Block.createGenesisBlock(genesisCoinbase)
blockchain.initializeWithGenesisBlock(genesisBlock)

console.log('Genesis block created')
console.log(`Miner balance: ${blockchain.getUTXOSet().getBalance(miner.address)} BTC`)
// Output: Miner balance: 50 BTC

// 3. Mine the second block
const minerInstance = new Miner(miner, blockchain)
const { block: block1, miningResult: result1 } = minerInstance.mineEmptyBlock()

console.log(`\nMining block #1:`)
console.log(`  Hash: ${result1.hash}`)
console.log(`  Attempts: ${result1.attempts}`)
console.log(`  Duration: ${result1.duration}ms`)

blockchain.addBlock(block1)
console.log(`Miner balance: ${blockchain.getUTXOSet().getBalance(miner.address)} BTC`)
// Output: Miner balance: 100 BTC

// 4. The miner sends funds to Alice
const utxoSet = blockchain.getUTXOSet()
const tx1 = TransactionBuilder.createSimpleTransfer(
  miner,
  alice.address,
  30,
  utxoSet
)

// 5. Mine a block containing the transaction
const { block: block2, miningResult: result2 } = minerInstance.mineBlock([tx1])
blockchain.addBlock(block2)

console.log(`\nBlock #2 added`)
console.log(`Alice balance: ${blockchain.getUTXOSet().getBalance(alice.address)} BTC`)
// Output: Alice balance: 30 BTC

// 6. Alice sends funds to Bob
const tx2 = TransactionBuilder.createSimpleTransfer(
  alice,
  bob.address,
  15,
  blockchain.getUTXOSet()
)

// 7. Mine a block containing Alice's transfer
const { block: block3 } = minerInstance.mineBlock([tx2])
blockchain.addBlock(block3)

console.log(`\nBlock #3 added`)
console.log(`Bob balance: ${blockchain.getUTXOSet().getBalance(bob.address)} BTC`)
// Output: Bob balance: 15 BTC
```

**Final state:**

Blockchain state:

| Block | Height | Hash | Transaction count | Difficulty |
|------|------|------|--------|------|
| Genesis block | 0 | 00a3f2... | 1 | 2 |
| Block 1 | 1 | 007b1e... | 1 | 2 |
| Block 2 | 2 | 0045c9... | 2 | 2 |
| Block 3 | 3 | 00d8f3... | 2 | 2 |

Balance summary:

| User | Balance | Description |
|------|------|------|
| Miner | ~170 BTC | 3 block rewards + change + fees |
| Alice | 15 BTC | Received 30 - sent 15 |
| Bob | 15 BTC | Received from Alice |

## 8. Summary

In this article, we implemented Bitcoin's blockchain core. We learned how Merkle trees provide efficient transaction verification and examined block structure and block-hash calculation. We explored the proof-of-work algorithm and learned that mining consists of finding a nonce that satisfies the difficulty requirement. We also implemented the blockchain management class, including block validation, UTXO maintenance, and dynamic difficulty adjustment. Finally, we implemented the miner class, which selects transactions, packages blocks, and performs mining.

These components form Bitcoin's decentralized ledger. With them, a trusted third party is no longer required to maintain the ledger. Proof of work makes altering history extremely costly, the UTXO model prevents double-spending, Merkle trees provide efficient verification, and difficulty adjustment maintains a stable block interval.

Our implementation is simplified. The real Bitcoin network uses a more complex difficulty-adjustment algorithm that adjusts every 2,016 blocks, applies stricter timestamp validation rules, and halves the block reward every 210,000 blocks through the well-known halving mechanism. However, our implementation preserves the core concepts: proof of work, block linking, Merkle trees, and UTXO management.


