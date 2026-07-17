import express, {Request, Response} from 'express'
import cors from 'cors'
import ServerState from './state'
import blockchainRouter from './routes/blockchain'
import walletRouter from './routes/wallet'
import transactionRouter from './routes/transaction'
import miningRouter from './routes/mining'
import merkleRouter from './routes/merkle'

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 请求日志
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// 初始化服务器状态
const state = ServerState.getInstance()

// API 路由
app.use('/api', blockchainRouter)
app.use('/api', walletRouter)
app.use('/api', transactionRouter)
app.use('/api', miningRouter)
app.use('/api', merkleRouter)

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Bitcoin API Server is running',
    timestamp: new Date().toISOString(),
  })
})

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Simple Bitcoin API Server',
    version: '1.0.0',
    endpoints: {
      blockchain: {
        'GET /api/blockchain': '获取完整区块链',
        'GET /api/blockchain/stats': '获取统计信息',
        'GET /api/blockchain/blocks/:index': '获取指定区块',
        'GET /api/blockchain/blocks/:index/transactions': '获取区块交易',
        'GET /api/blockchain/validate': '验证区块链',
      },
      wallets: {
        'GET /api/wallets': '获取所有钱包',
        'POST /api/wallets': '创建新钱包',
        'GET /api/wallets/:address': '获取钱包详情',
        'GET /api/wallets/:address/balance': '获取钱包余额',
        'GET /api/wallets/:address/utxos': '获取钱包 UTXO',
      },
      transactions: {
        'POST /api/transactions': '创建交易',
        'GET /api/transactions/pending': '获取待处理交易',
        'GET /api/transactions/:txId': '获取交易详情',
        'DELETE /api/transactions/pending': '清空待处理交易',
      },
      mining: {
        'POST /api/mine': '挖矿',
        'GET /api/mine/difficulty': '获取难度',
      },
      merkle: {
        'POST /api/merkle/verify': '验证 Merkle 证明',
        'GET /api/merkle/tree/:blockIndex': '获取 Merkle 树',
      },
    },
  })
})

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
  })
})

// 错误处理
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log('='.repeat(60))
  console.log('  Simple Bitcoin API Server')
  console.log('='.repeat(60))
  console.log(`  Server running on: http://localhost:${PORT}`)
  console.log(`  Health check: http://localhost:${PORT}/health`)
  console.log(`  API docs: http://localhost:${PORT}/`)
  console.log('='.repeat(60))
  console.log('')
})

export default app
