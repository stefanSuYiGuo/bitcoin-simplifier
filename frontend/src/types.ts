// Block type
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



// Transaction input
export interface TxInput {
  txId: string
  outputIndex: number
  signature?: string
  publicKey?: string
}

// Transaction output
export interface TxOutput {
  amount: number
  address: string
}

// Transaction type
export interface Transaction {
  id: string
  inputs: TxInput[]
  outputs: TxOutput[]
  timestamp: number
}

// Wallet type
export interface Wallet {
  address: string
  publicKey: string
  privateKey?: string
  balance: number
}

// UTXO type
export interface UTXO {
  txId: string
  outputIndex: number
  amount: number
  address: string
}

// Merkle proof element
export interface MerkleProofElement {
  hash: string
  position: 'left' | 'right'
}

// API response type
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
