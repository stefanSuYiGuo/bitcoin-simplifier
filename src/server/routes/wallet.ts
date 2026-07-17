import {Router, Request, Response} from 'express'
import ServerState from '../state'
import {Wallet} from '../../wallet'
import {Miner} from '../../blockchain/Miner'

const router = Router()
const state = ServerState.getInstance()

/**
 * GET /api/wallets
 * 获取所有钱包
 */
router.get('/wallets', (req: Request, res: Response) => {
  try {
    const utxoSet = state.blockchain.getUTXOSet()
    const wallets = Array.from(state.wallets.values()).map((wallet) => ({
      address: wallet.address,
      publicKey: wallet.publicKey,
      balance: utxoSet.getBalance(wallet.address),
    }))
    
    res.json({
      success: true,
      data: wallets,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * POST /api/wallets
 * 创建新钱包
 */
router.post('/wallets', (req: Request, res: Response) => {
  try {
    const wallet = new Wallet()
    state.wallets.set(wallet.address, wallet)
    
    // 为新钱包创建矿工实例
    const miner = new Miner(wallet, state.blockchain)
    state.miners.set(wallet.address, miner)
    
    const utxoSet = state.blockchain.getUTXOSet()
    
    res.json({
      success: true,
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        balance: utxoSet.getBalance(wallet.address),
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/wallets/:address
 * 获取钱包详情
 */
router.get('/wallets/:address', (req: Request, res: Response) => {
  try {
    const {address} = req.params
    const wallet = state.wallets.get(address)
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '钱包不存在',
      })
    }
    
    const utxoSet = state.blockchain.getUTXOSet()
    
    res.json({
      success: true,
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        balance: utxoSet.getBalance(wallet.address),
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/wallets/:address/balance
 * 获取钱包余额
 */
router.get('/wallets/:address/balance', (req: Request, res: Response) => {
  try {
    const {address} = req.params
    const utxoSet = state.blockchain.getUTXOSet()
    const balance = utxoSet.getBalance(address)
    
    res.json({
      success: true,
      data: {
        address,
        balance,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/wallets/:address/utxos
 * 获取钱包的所有 UTXO
 */
router.get('/wallets/:address/utxos', (req: Request, res: Response) => {
  try {
    const {address} = req.params
    const utxoSet = state.blockchain.getUTXOSet()
    const allUtxos = utxoSet.getAll()
    
    const walletUtxos: any[] = []
    allUtxos.forEach((output, key) => {
      if (output.address === address) {
        const [txId, outputIndex] = key.split(':')
        walletUtxos.push({
          txId,
          outputIndex: parseInt(outputIndex),
          amount: output.amount,
          address: output.address,
        })
      }
    })
    
    res.json({
      success: true,
      data: {
        address,
        utxos: walletUtxos,
        total: walletUtxos.reduce((sum, utxo) => sum + utxo.amount, 0),
      },
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

export default router

