import {Router, Request, Response} from 'express'
import ServerState from '../state'
import {MerkleTree} from '../../merkle'
import {Hash} from '../../crypto'

const router = Router()
const state = ServerState.getInstance()

/**
 * POST /api/merkle/verify
 * 验证 Merkle 证明
 * Body: { blockIndex: number, txId: string }
 */
router.post('/merkle/verify', (req: Request, res: Response) => {
  try {
    const {blockIndex, txId} = req.body
    
    if (blockIndex === undefined || !txId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: blockIndex, txId',
      })
    }
    
    const block = state.blockchain.getBlockByIndex(blockIndex)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: '区块不存在',
      })
    }
    
    // 检查交易是否在区块中
    const tx = block.transactions.find((t) => t.id === txId)
    if (!tx) {
      return res.status(404).json({
        success: false,
        error: '交易不在指定区块中',
      })
    }
    
    // 构建 Merkle 树
    const txIds = block.transactions.map((t) => t.id)
    const merkleTree = new MerkleTree(txIds)
    
    // 获取证明路径
    const proof = merkleTree.getProof(txId)
    if (!proof) {
      return res.status(500).json({
        success: false,
        error: '无法生成 Merkle 证明',
      })
    }
    
    // 验证证明
    const isValid = MerkleTree.verify(txId, proof, block.merkleRoot)
    
    // 获取完整的树结构用于可视化
    const rootNode = merkleTree.getRootNode()
    
    // 序列化树节点
    function serializeNode(node: any): any {
      if (!node) return null
      return {
        hash: node.hash,
        left: serializeNode(node.left),
        right: serializeNode(node.right),
      }
    }
    
    // 计算目标交易的叶子哈希
    const targetLeafHash = Hash.sha256(txId)
    
    // 收集验证路径上的所有哈希（用于高亮）
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
 * 获取区块的 Merkle 树结构
 */
router.get('/merkle/tree/:blockIndex', (req: Request, res: Response) => {
  try {
    const blockIndex = parseInt(req.params.blockIndex)
    
    if (isNaN(blockIndex)) {
      return res.status(400).json({
        success: false,
        error: '无效的区块索引',
      })
    }
    
    const block = state.blockchain.getBlockByIndex(blockIndex)
    if (!block) {
      return res.status(404).json({
        success: false,
        error: '区块不存在',
      })
    }
    
    const txIds = block.transactions.map((t) => t.id)
    const merkleTree = new MerkleTree(txIds)
    
    // 序列化 Merkle 树节点
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

