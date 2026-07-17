import axios from 'axios'

const API_BASE = '/api'
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error.response?.data || error)
  }
)

// 区块链 API
export const blockchainAPI = {
  getBlockchain: () => api.get('/blockchain'),
  getStats: () => api.get('/blockchain/stats'),
  getBlock: (index: number) => api.get(`/blockchain/blocks/${index}`),
  getBlockTransactions: (index: number) => api.get(`/blockchain/blocks/${index}/transactions`),
  validate: () => api.get('/blockchain/validate'),
}

// 钱包 API
export const walletAPI = {
  getWallets: () => api.get('/wallets'),
  createWallet: () => api.post('/wallets'),
  getWallet: (address: string) => api.get(`/wallets/${address}`),
  getBalance: (address: string) => api.get(`/wallets/${address}/balance`),
  getUTXOs: (address: string) => api.get(`/wallets/${address}/utxos`),
}

// 交易 API
export const transactionAPI = {
  createTransaction: (data: {
    fromAddress: string
    toAddress: string
    amount: number
  }) => api.post('/transactions', data),
  getPendingTransactions: () => api.get('/transactions/pending'),
  getTransaction: (txId: string) => api.get(`/transactions/${txId}`),
  clearPendingTransactions: () => api.delete('/transactions/pending'),
}

// 挖矿 API
export const miningAPI = {
  mine: (data: {
    minerAddress: string
    transactionIds?: string[]
  }) => api.post('/mine', data),
  getDifficulty: () => api.get('/mine/difficulty'),
}

// Merkle API
export const merkleAPI = {
  verify: (data: {
    blockIndex: number
    txId: string
  }) => api.post('/merkle/verify', data),
  getTree: (blockIndex: number) => api.get(`/merkle/tree/${blockIndex}`),
}

export default api

