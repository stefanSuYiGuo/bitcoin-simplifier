import {Router, Request, Response} from 'express'
import ServerState from '../state'
import {MerkleTree} from '../../merkle'
import {Hash} from '../../crypto'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/merkle/verify
 * Verify a Merkle proof.
 * Body: { blockIndex: number, txId: string }
 */
router.post('/merkle/verify', (req: Request, res: Response) => {
  try {
    const {blockIndex, txId} = req.body
    
    if (blockIndex === undefined || !txId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: blockIndex, txId',
      })
    }
    
    const block = state.blockchain.getBlockByIndex(blockIndex)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Block not found',
      })
    }
    
    // Check whether the transaction is in the block
    const tx = block.transactions.find((t) => t.id === txId)
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction is not in the specified block',
      })
    }
    
    // Build the Merkle tree
    const txIds = block.transactions.map((t) => t.id)
    const merkleTree = new MerkleTree(txIds)
    
    // Get the proof path
    const proof = merkleTree.getProof(txId)
    if (!proof) {
      return res.status(500).json({
        success: false,
        error: 'Unable to generate Merkle proof',
      })
    }
    
    // Verify the proof
    const isValid = MerkleTree.verify(txId, proof, block.merkleRoot)
    
    // Get the complete tree structure for visualization
    const rootNode = merkleTree.getRootNode()
    
    // Serialize tree nodes
    function serializeNode(node: any): any {
      if (!node) return null
      return {
        hash: node.hash,
        left: serializeNode(node.left),
        right: serializeNode(node.right),
      }
    }
    
    // Calculate the target transaction's leaf hash
    const targetLeafHash = Hash.sha256(txId)
    
    // Collect every hash in the proof path for highlighting
    const proofPath = new Set<string>()
    proofPath.add(targetLeafHash)
    let currentHash = targetLeafHash
    for (const p of proof) {
      proofPath.add(p.hash)
      if (p.position === 'left') {
        currentHash = Hash.sha256(p.hash + currentHash)
      } else {
        currentHash = Hash.sha256(currentHash + p.hash)
      }
      proofPath.add(currentHash)
    }
    
    res.json({
      success: true,
      data: {
        blockIndex,
        blockHash: block.hash,
        txId,
        targetLeafHash,
        merkleRoot: block.merkleRoot,
        proof: proof.map((p) => ({
          hash: p.hash,
          position: p.position,
        })),
        proofPath: Array.from(proofPath),
        isValid,
        tree: serializeNode(rootNode),
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
 * GET /api/merkle/tree/:blockIndex
 * Get the Merkle tree structure for a block.
 */
router.get('/merkle/tree/:blockIndex', (req: Request, res: Response) => {
  try {
    const blockIndex = parseInt(req.params.blockIndex)
    
    if (isNaN(blockIndex)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid block index',
      })
    }
    
    const block = state.blockchain.getBlockByIndex(blockIndex)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Block not found',
      })
    }
    
    const txIds = block.transactions.map((t) => t.id)
    const merkleTree = new MerkleTree(txIds)
    
    // Serialize Merkle tree nodes
    function serializeNode(node: any): any {
      if (!node) return null
      return {
        hash: node.hash,
        left: serializeNode(node.left),
        right: serializeNode(node.right),
      }
    }
    
    const root = merkleTree.getRoot()
    
    res.json({
      success: true,
      data: {
        blockIndex,
        blockHash: block.hash,
        merkleRoot: block.merkleRoot,
        transactionCount: txIds.length,
        tree: root ? serializeNode(root) : null,
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

