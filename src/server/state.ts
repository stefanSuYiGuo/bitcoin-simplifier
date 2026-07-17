import {Blockchain, Block, ProofOfWork} from '../blockchain'
import {Wallet} from '../wallet'
import {Transaction} from '../transaction'
import {Miner} from '../blockchain/Miner'

/**
 * 服务器全局状态管理
 * 维护单例的区块链实例和钱包集合
 */
class ServerState {
  private static instance: ServerState

  public blockchain: Blockchain
  public wallets: Map<string, Wallet> = new Map()
  public pendingTransactions: Transaction[] = []
  public miners: Map<string, Miner> = new Map()

  private constructor() {
    this.blockchain = new Blockchain({
      targetBlockTime: 10,
      difficultyAdjustmentInterval: 10,
      initialDifficulty: 1,
      blockReward: 50,
    })
  }

  public static getInstance(): ServerState {
    if (!ServerState.instance) {
      ServerState.instance = new ServerState()
      ServerState.instance.initialize()
    }
    return ServerState.instance
  }

  /**
   * 初始化区块链和默认钱包
   */
  private initialize(): void {
    console.log('初始化服务器状态...')

    // 创建默认钱包
    const walletNames = ['Alice', 'Bob', 'Charlie', 'Miner']
    walletNames.forEach((name) => {
      const wallet = new Wallet()
      this.wallets.set(wallet.address, wallet)
      console.log(`创建钱包 ${name}: ${wallet.address}`)
    })

    // 使用第一个钱包作为矿工创建创世区块
    const minerWallet = Array.from(this.wallets.values())[3]
    const coinbaseTx = Transaction.createCoinbase(
      minerWallet.address,
      this.blockchain.getConfig().blockReward,
      0
    )
    const genesisBlock = Block.createGenesisBlock(coinbaseTx)

    // 创世区块也需要挖矿以满足 PoW 要求
    console.log('挖掘创世区块...')
    const miningResult = ProofOfWork.mine(genesisBlock)
    console.log(
      `创世区块挖矿完成！nonce: ${miningResult.nonce}, 尝试次数: ${miningResult.attempts}`
    )

    this.blockchain.initializeWithGenesisBlock(genesisBlock)

    // 创建矿工实例
    this.wallets.forEach((wallet) => {
      const miner = new Miner(wallet, this.blockchain)
      this.miners.set(wallet.address, miner)
    })

    console.log('服务器状态初始化完成')
    console.log(`创世区块: ${genesisBlock.hash}`)
    console.log(`矿工地址: ${minerWallet.address}`)
  }

  /**
   * 添加待处理交易
   */
  public addPendingTransaction(tx: Transaction): void {
    this.pendingTransactions.push(tx)
  }

  /**
   * 清空待处理交易
   */
  public clearPendingTransactions(): void {
    this.pendingTransactions = []
  }

  /**
   * 获取指定交易
   */
  public getTransaction(txId: string): Transaction | null {
    // 先查找待处理交易
    const pendingTx = this.pendingTransactions.find((tx) => tx.id === txId)
    if (pendingTx) return pendingTx

    // 查找区块链中的交易
    const chain = this.blockchain.getChain()
    for (const block of chain) {
      const tx = block.transactions.find((t) => t.id === txId)
      if (tx) return tx
    }

    return null
  }

  /**
   * 重置状态（用于测试）
   */
  public reset(): void {
    this.wallets.clear()
    this.pendingTransactions = []
    this.miners.clear()
    this.blockchain = new Blockchain({
      targetBlockTime: 10,
      difficultyAdjustmentInterval: 10,
      initialDifficulty: 1,
      blockReward: 50,
    })
    this.initialize()
  }
}

export default ServerState
