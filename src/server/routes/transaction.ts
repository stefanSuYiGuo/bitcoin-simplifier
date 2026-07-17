import {Router, Request, Response} from 'express'
import ServerState from '../state'
import {TransactionBuilder} from '../../transaction/TransactionBuilder'
import {TransactionSigner} from '../../transaction/TransactionSigner'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/transactions
 * Create a transaction.
 * Body: { fromAddress: string, toAddress: string, amount: number }
 */
router.post('/transactions', (req: Request, res: Response) => {
  try {
    const {fromAddress, toAddress, amount} = req.body
    
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: fromAddress, toAddress, amount',
      })
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Transfer amount must be greater than 0',
      })
    }
    
    const wallet = state.wallets.get(fromAddress)
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Sender wallet not found',
      })
    }
    
    const utxoSet = state.blockchain.getUTXOSet()
    const balance = utxoSet.getBalance(fromAddress)
    
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${balance}, required: ${amount}`,
      })
    }
    
    // Create the transaction
    const tx = TransactionBuilder.createSimpleTransfer(
      wallet,
      toAddress,
      amount,
      utxoSet
    )
    
    // Validate the transaction
    const isValid = TransactionSigner.verifyTransaction(tx, utxoSet.getAll())
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Transaction validation failed',
      })
    }
    
    // Add the transaction to the pending pool
    state.addPendingTransaction(tx)
    
    res.json({
      success: true,
      data: {
        transaction: tx.toJSON(),
        message: 'Transaction created and added to the pending pool',
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
 * Get all pending transactions.
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
 * Get transaction details.
 */
router.get('/transactions/:txId', (req: Request, res: Response) => {
  try {
    const {txId} = req.params
    const tx = state.getTransaction(txId)
    
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      })
    }
    
    // Check whether the transaction is in a block
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
 * Clear the pending transaction pool.
 */
router.delete('/transactions/pending', (req: Request, res: Response) => {
  try {
    const count = state.pendingTransactions.length
    state.clearPendingTransactions()
    
    res.json({
      success: true,
      data: {
        message: `Cleared ${count} pending transactions`,
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

