import {useState, useEffect} from 'react'
import {blockchainAPI} from '../services/api'
import type {Block} from '../types'
import {Link} from 'react-router-dom'
import {Blocks, Hash, Timer, TrendingUp} from 'lucide-react'

export default function BlockchainView() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [blocksRes, statsRes] = await Promise.all([
        blockchainAPI.getBlockchain(),
        blockchainAPI.getStats(),
      ])
      setBlocks(blocksRes.data.chain)
      setStats(statsRes.data)
      setError(null)
    } catch (err: any) {
      setError(err.error || 'Unable to load blockchain data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Blockchain Explorer</h1>

      {/* Blockchain statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Blocks</p>
                <p className="text-2xl font-bold text-blue-900">{stats.length}</p>
              </div>
              <Blocks className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">UTXO Count</p>
                <p className="text-2xl font-bold text-green-900">{stats.utxoCount}</p>
              </div>
              <Hash className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Current Difficulty</p>
                <p className="text-2xl font-bold text-purple-900">{stats.difficulty}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Latest Block</p>
                <p className="text-2xl font-bold text-orange-900">
                  #{stats.latestBlock.index}
                </p>
              </div>
              <Timer className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Block list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">All Blocks</h2>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {blocks.map((block) => (
            <Link
              key={block.index}
              to={`/block/${block.index}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      #{block.index}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(block.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Hash:</span>
                      <span className="font-mono text-gray-900">
                        {block.hash.substring(0, 16)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Previous Block:</span>
                      <span className="font-mono text-gray-900">
                        {block.previousHash.substring(0, 16)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">
                    {block.transactions.length} transactions
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Difficulty:</span>
                    <span className="font-medium">{block.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Nonce:</span>
                    <span className="font-medium">{block.nonce}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

