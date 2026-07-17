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

    // 创建创世区块
    const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 0)
    const genesisBlock = Block.createGenesisBlock(coinbaseTx)
    blockchain.initializeWithGenesisBlock(genesisBlock)
  })

  describe('初始化', () => {
    test('应该能创建创世区块', () => {
      expect(blockchain.getLength()).toBe(1)
      expect(blockchain.getLatestBlock().index).toBe(0)
    })

    test('不应该重复初始化', () => {
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 0)
      const genesisBlock = Block.createGenesisBlock(coinbaseTx)

      expect(() =>
        blockchain.initializeWithGenesisBlock(genesisBlock)
      ).toThrow()
    })

    test('创世区块索引必须为 0', () => {
      const newBlockchain = new Blockchain()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 1)
      const block = new Block(1, '0', Date.now(), [coinbaseTx], 1)

      expect(() => newBlockchain.initializeWithGenesisBlock(block)).toThrow()
    })
  })

  describe('添加区块', () => {
    test('应该能添加有效的新区块', () => {
      const minerInstance = new Miner(miner, blockchain)
      const {block} = minerInstance.mineEmptyBlock()

      const success = blockchain.addBlock(block)
      expect(success).toBe(true)
      expect(blockchain.getLength()).toBe(2)
    })

    test('应该拒绝索引错误的区块', () => {
      const latestBlock = blockchain.getLatestBlock()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 99)
      const invalidBlock = new Block(
        99, // 错误的索引
        latestBlock.hash,
        Date.now(),
        [coinbaseTx],
        1
      )

      const success = blockchain.addBlock(invalidBlock)
      expect(success).toBe(false)
    })

    test('应该拒绝前区块哈希错误的区块', () => {
      const latestBlock = blockchain.getLatestBlock()
      const coinbaseTx = Transaction.createCoinbase(miner.address, 50, 1)
      const invalidBlock = new Block(
        1,
        'wrong_hash', // 错误的前区块哈希
        Date.now(),
        [coinbaseTx],
        1
      )

      const success = blockchain.addBlock(invalidBlock)
      expect(success).toBe(false)
    })
  })

  describe('UTXO 管理', () => {
    test('创世区块应该创建初始 UTXO', () => {
      const utxoSet = blockchain.getUTXOSet()
      expect(utxoSet.getBalance(miner.address)).toBe(50)
    })

    test('挖矿应该更新 UTXO', () => {
      const minerInstance = new Miner(miner, blockchain)
      const {block} = minerInstance.mineEmptyBlock()
      blockchain.addBlock(block)

      const utxoSet = blockchain.getUTXOSet()
      expect(utxoSet.getBalance(miner.address)).toBe(100) // 50 + 50
    })

    test('交易应该更新 UTXO', () => {
      // 先挖一个区块，给矿工 50 BTC
      const minerInstance = new Miner(miner, blockchain)
      const {block: firstBlock} = minerInstance.mineEmptyBlock()
      blockchain.addBlock(firstBlock)

      // 矿工转账给 Alice
      const utxoSet = blockchain.getUTXOSet()
      const tx = TransactionBuilder.createSimpleTransfer(
        miner,
        alice.address,
        30,
        utxoSet
      )

      // 挖包含交易的区块
      const {block} = minerInstance.mineBlock([tx])
      blockchain.addBlock(block)

      // 验证余额
      const newUtxoSet = blockchain.getUTXOSet()
      expect(newUtxoSet.getBalance(alice.address)).toBe(30)
      expect(newUtxoSet.getBalance(miner.address)).toBeGreaterThan(70) // 原来的找零 + 新的奖励
    })
  })

  describe('难度调整', () => {
    test('未到调整间隔应该保持难度', () => {
      const initialDifficulty = blockchain.getLatestBlock().difficulty
      const nextDifficulty = blockchain.calculateNextDifficulty()
      expect(nextDifficulty).toBe(initialDifficulty)
    })

    test('到达调整间隔应该计算新难度', () => {
      const minerInstance = new Miner(miner, blockchain)

      // 挖 9 个区块（加上创世区块共 10 个）
      for (let i = 0; i < 9; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }

      // 第 10 个区块应该触发难度调整
      const nextDifficulty = blockchain.calculateNextDifficulty()
      expect(nextDifficulty).toBeDefined()
    })
  })

  describe('区块查询', () => {
    beforeEach(() => {
      const minerInstance = new Miner(miner, blockchain)
      for (let i = 0; i < 3; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }
    })

    test('应该能通过索引获取区块', () => {
      const block = blockchain.getBlockByIndex(1)
      expect(block).not.toBeNull()
      expect(block!.index).toBe(1)
    })

    test('应该能通过哈希获取区块', () => {
      const latestBlock = blockchain.getLatestBlock()
      const block = blockchain.getBlockByHash(latestBlock.hash)
      expect(block).not.toBeNull()
      expect(block!.hash).toBe(latestBlock.hash)
    })

    test('不存在的索引应该返回 null', () => {
      const block = blockchain.getBlockByIndex(999)
      expect(block).toBeNull()
    })

    test('不存在的哈希应该返回 null', () => {
      const block = blockchain.getBlockByHash('nonexistent_hash')
      expect(block).toBeNull()
    })
  })

  describe('区块链验证', () => {
    test('有效的区块链应该通过验证', () => {
      const minerInstance = new Miner(miner, blockchain)
      for (let i = 0; i < 3; i++) {
        const {block} = minerInstance.mineEmptyBlock()
        blockchain.addBlock(block)
      }

      expect(blockchain.isValidChain()).toBe(true)
    })
  })

  describe('统计信息', () => {
    test('应该能获取区块链统计信息', () => {
      const stats = blockchain.getStats()

      expect(stats).toHaveProperty('length')
      expect(stats).toHaveProperty('latestBlock')
      expect(stats).toHaveProperty('difficulty')
      expect(stats).toHaveProperty('utxoCount')
    })

    test('应该能序列化为 JSON', () => {
      const json = blockchain.toJSON()

      expect(json).toHaveProperty('chain')
      expect(json).toHaveProperty('config')
      expect(json).toHaveProperty('stats')
    })
  })
})
