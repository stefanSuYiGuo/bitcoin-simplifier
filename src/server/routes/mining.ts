import {Router, Request, Response} from 'express'
import ServerState from '../state'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/mine
 * Mine a block.
 * Body: { minerAddress: string, transactionIds?: string[] }
 */
router.post('/mine', (req: Request, res: Response) => {
  try {
    const {minerAddress, transactionIds} = req.body
    
    if (!minerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Miner address is required',
      })
    }
    
    const miner = state.miners.get(minerAddress)
    if (!miner) {
      return res.status(404).json({
        success: false,
        error: 'Miner not found',
      })
    }
    
    const startTime = Date.now()
    
    let block
    let miningResult
    
    // Mine only the specified transaction IDs when provided
    if (transactionIds && transactionIds.length > 0) {
      const transactions = transactionIds
        .map((id: string) => state.pendingTransactions.find((tx) => tx.id === id))
        .filter((tx: any) => tx !== undefined)
      
      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No matching pending transactions found',
        })
      }
      
      const result = miner.mineBlock(transactions)
      block = result.block
      miningResult = result.miningResult
      
      // Remove mined transactions from the pending pool
      state.pendingTransactions = state.pendingTransactions.filter(
        (tx) => !transactionIds.includes(tx.id)
      )
    } else {
      // Mine all pending transactions
      const transactions = [...state.pendingTransactions]
      
      if (transactions.length === 0) {
        // Mine an empty block when there are no pending transactions
        const result = miner.mineEmptyBlock()
        block = result.block
        miningResult = result.miningResult
      } else {
        const result = miner.mineBlock(transactions)
        block = result.block
        miningResult = result.miningResult
        
        // Clear the pending transaction pool
        state.clearPendingTransactions()
      }
    }
    
    // Add the block to the blockchain
    const success = state.blockchain.addBlock(block)
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to add block',
      })
    }
    
    const totalTime = Date.now() - startTime
    
    res.json({
      success: true,
      data: {
        block: block.toJSON(),
        mining: {
          attempts: miningResult.attempts,
          duration: miningResult.duration,
          totalTime,
        },
        message: 'Block mined successfully',
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
 * GET /api/mine/difficulty
 * Get the current mining difficulty.
 */
router.get('/mine/difficulty', (req: Request, res: Response) => {
  try {
    const currentDifficulty = state.blockchain.getLatestBlock().difficulty
    const nextDifficulty = state.blockchain.calculateNextDifficulty()
    
    res.json({
      success: true,
      data: {
        current: currentDifficulty,
        next: nextDifficulty,
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

