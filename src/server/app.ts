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

// Middleware
app.use(cors())
app.use(express.json())

// Request logging
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Initialize server state
const state = ServerState.getInstance()

// API routes
app.use('/api', blockchainRouter)
app.use('/api', walletRouter)
app.use('/api', transactionRouter)
app.use('/api', miningRouter)
app.use('/api', merkleRouter)

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Bitcoin API Server is running',
    timestamp: new Date().toISOString(),
  })
})

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Simple Bitcoin API Server',
    version: '1.0.0',
    endpoints: {
      blockchain: {
        'GET /api/blockchain': 'Get the complete blockchain',
        'GET /api/blockchain/stats': 'Get blockchain statistics',
        'GET /api/blockchain/blocks/:index': 'Get a block by index',
        'GET /api/blockchain/blocks/:index/transactions': 'Get transactions from a block',
        'GET /api/blockchain/validate': 'Validate the blockchain',
      },
      wallets: {
        'GET /api/wallets': 'Get all wallets',
        'POST /api/wallets': 'Create a wallet',
        'GET /api/wallets/:address': 'Get wallet details',
        'GET /api/wallets/:address/balance': 'Get a wallet balance',
        'GET /api/wallets/:address/utxos': 'Get wallet UTXOs',
      },
      transactions: {
        'POST /api/transactions': 'Create a transaction',
        'GET /api/transactions/pending': 'Get pending transactions',
        'GET /api/transactions/:txId': 'Get transaction details',
        'DELETE /api/transactions/pending': 'Clear pending transactions',
      },
      mining: {
        'POST /api/mine': 'Mine a block',
        'GET /api/mine/difficulty': 'Get mining difficulty',
      },
      merkle: {
        'POST /api/merkle/verify': 'Verify a Merkle proof',
        'GET /api/merkle/tree/:blockIndex': 'Get a Merkle tree',
      },
    },
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
  })
})

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  })
})

// Start the server
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
