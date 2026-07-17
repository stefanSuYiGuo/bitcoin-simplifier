import {Router, Request, Response} from 'express'
import ServerState from '../state'

const router = Router()
const state = ServerState.getInstance()

/**
 * GET /api/blockchain
 * Get the complete blockchain.
 */
router.get('/blockchain', (req: Request, res: Response) => {
  try {
    const chain = state.blockchain.getChain()
    res.json({
      success: true,
      data: {
        chain: chain.map((block) => block.toJSON()),
        length: chain.length,
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
 * GET /api/blockchain/stats
 * Get blockchain statistics.
 */
router.get('/blockchain/stats', (req: Request, res: Response) => {
  try {
    const stats = state.blockchain.getStats()
    res.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/blockchain/blocks/:index
 * Get a block by index.
 */
router.get('/blockchain/blocks/:index', (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index)
    if (isNaN(index)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid block index',
      })
    }

    const block = state.blockchain.getBlockByIndex(index)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Block not found',
      })
    }

    res.json({
      success: true,
      data: block.toJSON(),
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

/**
 * GET /api/blockchain/blocks/:index/transactions
 * Get all transactions in a block.
 */
router.get(
  '/blockchain/blocks/:index/transactions',
  (req: Request, res: Response) => {
    try {
      const index = parseInt(req.params.index)
      if (isNaN(index)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid block index',
        })
      }

      const block = state.blockchain.getBlockByIndex(index)
      if (!block) {
        return res.status(404).json({
          success: false,
          error: 'Block not found',
        })
      }

      res.json({
        success: true,
        data: {
          blockIndex: index,
          blockHash: block.hash,
          transactions: block.transactions.map((tx) => tx.toJSON()),
        },
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }
)

/**
 * GET /api/blockchain/validate
 * Validate the entire blockchain.
 */
router.get('/blockchain/validate', (req: Request, res: Response) => {
  try {
    const isValid = state.blockchain.isValidChain()
    res.json({
      success: true,
      data: {
        isValid,
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
