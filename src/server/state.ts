import {Blockchain, Block, ProofOfWork} from '../blockchain'
import {Wallet} from '../wallet'
import {Transaction} from '../transaction'
import {Miner} from '../blockchain/Miner'

/**
 * Global server state manager.
 * Maintains singleton blockchain, wallet, transaction, and miner state.
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
   * Initialize the blockchain and default wallets.
   */
  private initialize(): void {
    console.log('Initializing server state...')

    // Create default wallets
    const walletNames = ['Alice', 'Bob', 'Charlie', 'Miner']
    walletNames.forEach((name) => {
      const wallet = new Wallet()
      this.wallets.set(wallet.address, wallet)
      console.log(`Created ${name} wallet: ${wallet.address}`)
    })

    // Use the miner wallet to create the genesis block
    const minerWallet = Array.from(this.wallets.values())[3]
    const coinbaseTx = Transaction.createCoinbase(
      minerWallet.address,
      this.blockchain.getConfig().blockReward,
      0
    )
    const genesisBlock = Block.createGenesisBlock(coinbaseTx)

    // Mine the genesis block so that it meets the proof-of-work target
    console.log('Mining genesis block...')
    const miningResult = ProofOfWork.mine(genesisBlock)
    console.log(
      `Genesis block mined! Nonce: ${miningResult.nonce}, attempts: ${miningResult.attempts}`
    )

    this.blockchain.initializeWithGenesisBlock(genesisBlock)

    // Create miner instances
    this.wallets.forEach((wallet) => {
      const miner = new Miner(wallet, this.blockchain)
      this.miners.set(wallet.address, miner)
    })

    console.log('Server state initialized')
    console.log(`Genesis block: ${genesisBlock.hash}`)
    console.log(`Miner address: ${minerWallet.address}`)
  }

  /**
   * Add a pending transaction.
   */
  public addPendingTransaction(tx: Transaction): void {
    this.pendingTransactions.push(tx)
  }

  /**
   * Clear pending transactions.
   */
  public clearPendingTransactions(): void {
    this.pendingTransactions = []
  }

  /**
   * Get a transaction by ID.
   */
  public getTransaction(txId: string): Transaction | null {
    // Search pending transactions first
    const pendingTx = this.pendingTransactions.find((tx) => tx.id === txId)
    if (pendingTx) return pendingTx

    // Search transactions in the blockchain
    const chain = this.blockchain.getChain()
    for (const block of chain) {
      const tx = block.transactions.find((t) => t.id === txId)
      if (tx) return tx
    }

    return null
  }

  /**
   * Reset state for tests.
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
