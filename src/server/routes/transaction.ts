import {Router, Request, Response} from 'express'
import ServerState from '../state'
import {TransactionBuilder} from '../../transaction/TransactionBuilder'
import {TransactionSigner} from '../../transaction/TransactionSigner'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/transactions
 * 创建新交易
 * Body: { fromAddress: string, toAddress: string, amount: number }
 */
router.post('/transactions', (req: Request, res: Response) => {
  try {
    const {fromAddress, toAddress, amount} = req.body
    
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: fromAddress, toAddress, amount',
      })
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: '转账金额必须大于 0',
      })
    }
    
    const wallet = state.wallets.get(fromAddress)
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: '发送方钱包不存在',
      })
    }
    
    const utxoSet = state.blockchain.getUTXOSet()
    const balance = utxoSet.getBalance(fromAddress)
    
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        error: `余额不足。当前余额: ${balance}, 需要: ${amount}`,
      })
    }
    
    // 创建交易
    const tx = TransactionBuilder.createSimpleTransfer(
      wallet,
      toAddress,
      amount,
      utxoSet
    )
    
    // 验证交易
    const isValid = TransactionSigner.verifyTransaction(tx, utxoSet.getAll())
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: '交易验证失败',
      })
    }
    
    // 添加到待处理交易池
    state.addPendingTransaction(tx)
    
    res.json({
      success: true,
      data: {
        transaction: tx.toJSON(),
        message: '交易已创建并加入待处理池',
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
 * GET /api/transactions/pending
 * 获取所有待处理交易
 */
router.get('/transactions/pending', (req: Request, res: Response) => {
  try {
    const transactions = state.pendingTransactions.map((tx) => tx.toJSON())
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
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
 * GET /api/transactions/:txId
 * 获取交易详情
 */
router.get('/transactions/:txId', (req: Request, res: Response) => {
  try {
    const {txId} = req.params
    const tx = state.getTransaction(txId)
    
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: '交易不存在',
      })
    }
    
    // 检查交易是否在区块中
    const chain = state.blockchain.getChain()
    let blockIndex = -1
    let blockHash = ''
    
    for (const block of chain) {
      if (block.transactions.some((t) => t.id === txId)) {
        blockIndex = block.index
        blockHash = block.hash
        break
      }
    }
    
    res.json({
      success: true,
      data: {
        transaction: tx.toJSON(),
        confirmed: blockIndex >= 0,
        blockIndex: blockIndex >= 0 ? blockIndex : undefined,
        blockHash: blockHash || undefined,
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
 * DELETE /api/transactions/pending
 * 清空待处理交易池
 */
router.delete('/transactions/pending', (req: Request, res: Response) => {
  try {
    const count = state.pendingTransactions.length
    state.clearPendingTransactions()
    
    res.json({
      success: true,
      data: {
        message: `已清空 ${count} 笔待处理交易`,
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

