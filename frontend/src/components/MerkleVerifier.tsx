import {useState, useEffect} from 'react'
import {blockchainAPI, merkleAPI} from '../services/api'
import type {Block} from '../types'
import {CheckCircle, XCircle, GitBranch, TreeDeciduous} from 'lucide-react'

interface MerkleProofStep {
  hash: string
  position: 'left' | 'right'
}

interface TreeNode {
  hash: string
  left?: TreeNode
  right?: TreeNode
}

/**
 * 完整 Merkle 树可视化组件
 */
function MerkleTreeVisualization({
  tree,
  targetLeafHash,
  proofPath,
  txCount,
}: {
  tree: TreeNode | null
  targetLeafHash?: string
  proofPath?: string[]
  txCount: number
}) {
  const shortHash = (hash: string) => hash.substring(0, 8) + '...'
  const proofSet = new Set(proofPath || [])

  // 将树转换为层级数组便于渲染
  const getLevels = (node: TreeNode | null): TreeNode[][] => {
    if (!node) return []

    const levels: TreeNode[][] = []
    let currentLevel: TreeNode[] = [node]

    while (currentLevel.length > 0) {
      levels.push(currentLevel)
      const nextLevel: TreeNode[] = []
      for (const n of currentLevel) {
        if (n.left) nextLevel.push(n.left)
        if (n.right && n.right !== n.left) nextLevel.push(n.right)
      }
      currentLevel = nextLevel
    }

    return levels
  }

  const levels = getLevels(tree)

  // 判断节点类型
  const getNodeStyle = (hash: string, levelIndex: number, levels: TreeNode[][]) => {
    const isRoot = levelIndex === 0
    const isLeaf = levelIndex === levels.length - 1
    const isTarget = hash === targetLeafHash
    const isInProofPath = proofSet.has(hash)

    if (isTarget) {
      return 'bg-yellow-500/30 border-yellow-400 text-yellow-300 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/50'
    }
    if (isInProofPath) {
      if (isRoot) {
        return 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20'
      }
      return 'bg-purple-500/30 border-purple-400 text-purple-300 shadow-lg shadow-purple-500/20'
    }
    return 'bg-slate-700 border-slate-600 text-slate-400'
  }

  // 获取层级标签
  const getLevelLabel = (levelIndex: number, totalLevels: number) => {
    if (levelIndex === 0) return 'Merkle Root'
    if (levelIndex === totalLevels - 1) return `叶子节点 (${txCount} 笔交易)`
    return `第 ${levelIndex} 层`
  }

  if (!tree) {
    return (
      <div className="bg-slate-900 rounded-xl p-12 text-center">
        <TreeDeciduous className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500">验证后将显示完整 Merkle 树结构</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-6 overflow-x-auto">
      <div className="flex items-center gap-2 mb-6">
        <TreeDeciduous className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">Merkle 树结构</h3>
      </div>

      {/* 完整树形图 */}
      <div className="flex flex-col items-center gap-4 min-w-fit">
        {levels.map((level, levelIndex) => (
          <div key={levelIndex} className="flex flex-col items-center">
            {/* 层级标签 */}
            <div className="text-xs text-slate-500 mb-2">
              {getLevelLabel(levelIndex, levels.length)}
            </div>

            {/* 当前层的节点 */}
            <div className="flex gap-3 flex-wrap justify-center">
              {level.map((node, nodeIndex) => (
                <div key={`${levelIndex}-${nodeIndex}`} className="flex flex-col items-center">
                  <div
                    className={`px-3 py-2 rounded-lg font-mono text-xs border-2 transition-all ${getNodeStyle(
                      node.hash,
                      levelIndex,
                      levels
                    )}`}
                    title={node.hash}
                  >
                    {shortHash(node.hash)}
                  </div>
                  {/* 叶子节点显示交易编号 */}
                  {levelIndex === levels.length - 1 && (
                    <div className="text-xs text-slate-500 mt-1">TX #{nodeIndex}</div>
                  )}
                  {/* 目标节点标记 */}
                  {node.hash === targetLeafHash && (
                    <div className="text-xs text-yellow-400 mt-1">← 目标</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500/30 border-2 border-yellow-400"></div>
          <span className="text-slate-400">目标交易</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500/30 border-2 border-purple-400"></div>
          <span className="text-slate-400">验证路径节点</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500/30 border-2 border-emerald-400"></div>
          <span className="text-slate-400">Merkle Root</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-700 border-2 border-slate-600"></div>
          <span className="text-slate-400">其他节点</span>
        </div>
      </div>
    </div>
  )
}

export default function MerkleVerifier() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(
    null
  )
  const [selectedTxId, setSelectedTxId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    loadBlocks()
  }, [])

  const loadBlocks = async () => {
    try {
      const res = await blockchainAPI.getBlockchain()
      setBlocks(res.data.chain)
    } catch (err) {
      console.error('加载区块失败:', err)
    }
  }

  const handleVerify = async () => {
    if (selectedBlockIndex === null || !selectedTxId) {
      alert('请选择区块和交易')
      return
    }

    try {
      setVerifying(true)
      setResult(null)

      const res = await merkleAPI.verify({
        blockIndex: selectedBlockIndex,
        txId: selectedTxId,
      })

      setResult(res.data)
    } catch (err: any) {
      alert('验证失败: ' + (err.error || '未知错误'))
    } finally {
      setVerifying(false)
    }
  }

  const selectedBlock = blocks.find((b) => b.index === selectedBlockIndex)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Merkle 验证器</h1>

      {/* 概念说明卡片 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-3">
          什么是 Merkle 树？
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              Merkle 树是一种<strong>二叉哈希树</strong>
              ，用于高效验证数据的完整性。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>叶子节点是各个交易的哈希值</li>
              <li>父节点是两个子节点哈希的组合哈希</li>
              <li>根节点（Merkle Root）代表所有交易的摘要</li>
            </ul>
          </div>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>优势：</strong>只需提供少量哈希值（O(log n)）即可验证任一交易是否在区块中。
            </p>
            <p>
              <strong>应用：</strong>SPV（简单支付验证）钱包可以不下载完整区块，只需 Merkle 证明即可验证交易。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：选择器和结果 */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">选择验证目标</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择区块
              </label>
              <select
                value={selectedBlockIndex ?? ''}
                onChange={(e) => {
                  setSelectedBlockIndex(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                  setSelectedTxId('')
                  setResult(null)
                }}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">请选择区块</option>
                {blocks.map((block) => (
                  <option key={block.index} value={block.index}>
                    #{block.index} - {block.transactions.length} 笔交易
                  </option>
                ))}
              </select>
            </div>

            {selectedBlock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择交易
                </label>
                <select
                  value={selectedTxId}
                  onChange={(e) => {
                    setSelectedTxId(e.target.value)
                    setResult(null)
                  }}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">请选择交易</option>
                  {selectedBlock.transactions.map((tx, idx) => (
                    <option key={tx.id} value={tx.id}>
                      TX #{idx}: {tx.id.substring(0, 20)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || !selectedBlockIndex || !selectedTxId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <GitBranch className="w-4 h-4" />
              {verifying ? '验证中...' : '验证 Merkle 证明'}
            </button>
          </div>

          {/* 验证结果 */}
          {result && (
            <div
              className={`border rounded-lg p-6 ${
                result.isValid
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {result.isValid ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">
                      验证成功 ✓
                    </h3>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">
                      验证失败 ✗
                    </h3>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">区块索引:</span>
                  <span className="ml-2 font-bold">#{result.blockIndex}</span>
                </div>
                <div>
                  <span className="text-gray-600">证明路径长度:</span>
                  <span className="ml-2 font-bold">
                    {result.proof.length} 步
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Merkle Root:</span>
                  <div className="font-mono text-xs mt-1 break-all bg-white/50 p-2 rounded">
                    {result.merkleRoot}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：原理图解 */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
            <h3 className="text-lg font-semibold mb-4">Merkle 证明原理</h3>
            <div className="relative">
              <pre className="text-xs font-mono text-gray-600 bg-gray-50 p-4 rounded overflow-x-auto">
                {`                    ┌─────────────┐
                    │ Merkle Root │  ← 存储在区块头
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
        ┌─────┴─────┐             ┌─────┴─────┐
        │   H(AB)   │             │   H(CD)   │
        └─────┬─────┘             └─────┬─────┘
              │                         │
       ┌──────┴──────┐           ┌──────┴──────┐
       │             │           │             │
    ┌──┴──┐       ┌──┴──┐     ┌──┴──┐       ┌──┴──┐
    │ H(A)│       │ H(B)│     │ H(C)│       │ H(D)│
    └─────┘       └─────┘     └─────┘       └─────┘

验证 TX B 只需要: H(A) + H(CD) = 2 个哈希值
而不需要知道 TX A, TX C, TX D 的完整内容`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 底部：完整树形可视化（全宽） */}
      <MerkleTreeVisualization
        tree={result?.tree || null}
        targetLeafHash={result?.targetLeafHash}
        proofPath={result?.proofPath}
        txCount={selectedBlock?.transactions.length || 0}
      />
    </div>
  )
}
