// 区块类型
export interface Block {
  index: number
  previousHash: string
  timestamp: number
  transactions: Transaction[]
  merkleRoot: string
  difficulty: number
  nonce: number
  hash: string
}

// 交易输入
export interface TxInput {
  txId: string
  outputIndex: number
  signature?: string
  publicKey?: string
}

// 交易输出
export interface TxOutput {
  amount: number
  address: string
}

// 交易类型
export interface Transaction {
  id: string
  inputs: TxInput[]
  outputs: TxOutput[]
  timestamp: number
}

// 钱包类型
export interface Wallet {
  address: string
  publicKey: string
  privateKey?: string
  balance: number
}

// UTXO 类型
export interface UTXO {
  txId: string
  outputIndex: number
  amount: number
  address: string
}

// Merkle 证明元素
export interface MerkleProofElement {
  hash: string
  position: 'left' | 'right'
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

