import {Router, Request, Response} from 'express'
import ServerState from '../state'

const router = Router()
const state = ServerState.getInstance()

/**
 * GET /api/blockchain
 * 获取完整区块链
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
 * 获取区块链统计信息
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
 * 获取指定区块
 */
router.get('/blockchain/blocks/:index', (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index)
    if (isNaN(index)) {
      return res.status(400).json({
        success: false,
        error: '无效的区块索引',
      })
    }

    const block = state.blockchain.getBlockByIndex(index)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: '区块不存在',
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
 * 获取区块的所有交易
 */
router.get(
  '/blockchain/blocks/:index/transactions',
  (req: Request, res: Response) => {
    try {
      const index = parseInt(req.params.index)
      if (isNaN(index)) {
        return res.status(400).json({
          success: false,
          error: '无效的区块索引',
        })
      }

      const block = state.blockchain.getBlockByIndex(index)
      if (!block) {
        return res.status(404).json({
          success: false,
          error: '区块不存在',
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
 * 验证整个区块链
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
