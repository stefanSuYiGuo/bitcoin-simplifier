import {Blockchain} from '../Blockchain'
import {Block} from '../Block'
import {Miner} from '../Miner'
import {Transaction, TransactionBuilder} from '../../transaction'
import {Wallet} from '../../wallet'

describe('Blockchain', () => {
  let blockchain: Blockchain
  let miner: Wallet
  let alice: Wallet
  let bob: Wallet

  beforeEach(() => {
    blockchain = new Blockchain({
      initialDifficulty: 1,
      blockReward: 50,
      targetBlockTime: 10,
      difficultyAdjustmentInterval: 10,
    })

    miner = new Wallet()
    alice = new Wallet()
    bob = new Wallet()

    // Create the genesis block
    const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 0)
    const genesisBlock = Block.createGenesisBlock(coinbaseTx)
    blockchain.initializeWithGenesisBlock(genesisBlock)
  })

  describe('initialization', () => {
    test('creates a genesis block', () => {
      expect(blockchain.getLength()).toBe(1)
      expect(blockchain.getLatestBlock().index).toBe(0)
    })

    test('rejects repeated initialization', () => {
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 0)
      const genesisBlock = Block.createGenesisBlock(coinbaseTx)

      expect(() =>
        blockchain.initializeWithGenesisBlock(genesisBlock)
      ).toThrow()
    })

    test('requires the genesis block index to be 0', () => {
      const newBlockchain = new Blockchain()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 1)
      const block = new Block(1, '0', Date.now(), [coinbaseTx], 1)

      expect(() => newBlockchain.initializeWithGenesisBlock(block)).toThrow()
    })
  })

  describe('adding blocks', () => {
    test('adds a valid new block', () => {
      const minerInstance = new Miner(miner, blockchain)
      const {block} = minerInstance.mineEmptyBlock()

      const success = blockchain.addBlock(block)
      expect(success).toBe(true)
      expect(blockchain.getLength()).toBe(2)
    })

    test('rejects a block with an invalid index', () => {
      const latestBlock = blockchain.getLatestBlock()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 99)
      const invalidBlock = new Block(
        99, // Invalid index
        latestBlock.hash,
        Date.now(),
        [coinbaseTx],
        1
      )

      const success = blockchain.addBlock(invalidBlock)
      expect(success).toBe(false)
    })

    test('rejects a block with an incorrect previous hash', () => {
      const latestBlock = blockchain.getLatestBlock()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 1)
      const invalidBlock = new Block(
        1,
        'wrong_hash', // Incorrect previous block hash
        Date.now(),
        [coinbaseTx],
        1
      )

      const success = blockchain.addBlock(invalidBlock)
      expect(success).toBe(false)
    })
  })

  describe('UTXO management', () => {
    test('creates the initial UTXO from the genesis block', () => {
      const utxoSet = blockchain.getUTXOSet()
      expect(utxoSet.getBalance(miner.address)).toBe(50)
    })

    test('updates UTXOs after mining', () => {
      const minerInstance = new Miner(miner, blockchain)
      const {block} = minerInstance.mineEmptyBlock()
      blockchain.addBlock(block)

      const utxoSet = blockchain.getUTXOSet()
      expect(utxoSet.getBalance(miner.address)).toBe(100) // 50 + 50
    })

    test('updates UTXOs after a transaction', () => {
      // Mine a block to award the miner 50 BTC
      const minerInstance = new Miner(miner, blockchain)
      const {block: firstBlock} = minerInstance.mineEmptyBlock()
      blockchain.addBlock(firstBlock)

      // Transfer funds from the miner to Alice
      const utxoSet = blockchain.getUTXOSet()
      const tx = TransactionBuilder.createSimpleTransfer(
        miner,
        alice.address,
        30,
        utxoSet
      )

      // Mine a block containing the transaction
      const {block} = minerInstance.mineBlock([tx])
      blockchain.addBlock(block)

      // Verify balances
      const newUtxoSet = blockchain.getUTXOSet()
      expect(newUtxoSet.getBalance(alice.address)).toBe(30)
      expect(newUtxoSet.getBalance(miner.address)).toBeGreaterThan(70) // Existing change plus the new reward
    })
  })

  describe('difficulty adjustment', () => {
    test('keeps the difficulty before the adjustment interval', () => {
      const initialDifficulty = blockchain.getLatestBlock().difficulty
      const nextDifficulty = blockchain.calculateNextDifficulty()
      expect(nextDifficulty).toBe(initialDifficulty)
    })

    test('calculates a new difficulty at the adjustment interval', () => {
      const minerInstance = new Miner(miner, blockchain)

      // Mine 9 blocks for a total of 10 including the genesis block
      for (let i = 0; i < 9; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }

      // The tenth block should trigger a difficulty adjustment
      const nextDifficulty = blockchain.calculateNextDifficulty()
      expect(nextDifficulty).toBeDefined()
    })
  })

  describe('block queries', () => {
    beforeEach(() => {
      const minerInstance = new Miner(miner, blockchain)
      for (let i = 0; i < 3; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }
    })

    test('gets a block by index', () => {
      const block = blockchain.getBlockByIndex(1)
      expect(block).not.toBeNull()
      expect(block!.index).toBe(1)
    })

    test('gets a block by hash', () => {
      const latestBlock = blockchain.getLatestBlock()
      const block = blockchain.getBlockByHash(latestBlock.hash)
      expect(block).not.toBeNull()
      expect(block!.hash).toBe(latestBlock.hash)
    })

    test('returns null for an unknown index', () => {
      const block = blockchain.getBlockByIndex(999)
      expect(block).toBeNull()
    })

    test('returns null for an unknown hash', () => {
      const block = blockchain.getBlockByHash('nonexistent_hash')
      expect(block).toBeNull()
    })
  })

  describe('blockchain validation', () => {
    test('accepts a valid blockchain', () => {
      const minerInstance = new Miner(miner, blockchain)
      for (let i = 0; i < 3; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }

      expect(blockchain.isValidChain()).toBe(true)
    })
  })

  describe('statistics', () => {
    test('returns blockchain statistics', () => {
      const stats = blockchain.getStats()

      expect(stats).toHaveProperty('length')
      expect(stats).toHaveProperty('latestBlock')
      expect(stats).toHaveProperty('difficulty')
      expect(stats).toHaveProperty('utxoCount')
    })

    test('serializes the blockchain to JSON', () => {
      const json = blockchain.toJSON()

      expect(json).toHaveProperty('chain')
      expect(json).toHaveProperty('config')
      expect(json).toHaveProperty('stats')
    })
  })
})
