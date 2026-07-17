import {Router, Request, Response} from 'express'
import ServerState from '../state'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/mine
 * 挖矿
 * Body: { minerAddress: string, transactionIds?: string[] }
 */
router.post('/mine', (req: Request, res: Response) => {
  try {
    const {minerAddress, transactionIds} = req.body
    
    if (!minerAddress) {
      return res.status(400).json({
        success: false,
        error: '缺少矿工地址',
      })
    }
    
    const miner = state.miners.get(minerAddress)
    if (!miner) {
      return res.status(404).json({
        success: false,
        error: '矿工不存在',
      })
    }
    
    const startTime = Date.now()
    
    let block
    let miningResult
    
    // 如果指定了交易 ID，则只挖这些交易
    if (transactionIds && transactionIds.length > 0) {
      const transactions = transactionIds
        .map((id: string) => state.pendingTransactions.find((tx) => tx.id === id))
        .filter((tx: any) => tx !== undefined)
      
      if (transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: '未找到指定的待处理交易',
        })
      }
      
      const result = miner.mineBlock(transactions)
      block = result.block
      miningResult = result.miningResult
      
      // 从待处理池中移除已挖矿的交易
      state.pendingTransactions = state.pendingTransactions.filter(
        (tx) => !transactionIds.includes(tx.id)
      )
    } else {
      // 挖所有待处理交易
      const transactions = [...state.pendingTransactions]
      
      if (transactions.length === 0) {
        // 没有待处理交易，挖空块
        const result = miner.mineEmptyBlock()
        block = result.block
        miningResult = result.miningResult
      } else {
        const result = miner.mineBlock(transactions)
        block = result.block
        miningResult = result.miningResult
        
        // 清空待处理交易池
        state.clearPendingTransactions()
      }
    }
    
    // 将区块添加到区块链
    const success = state.blockchain.addBlock(block)
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: '区块添加失败',
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
        message: '挖矿成功',
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
 * 获取当前挖矿难度
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

