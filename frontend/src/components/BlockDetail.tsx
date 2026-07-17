import {useState, useEffect} from 'react'
import {useParams, Link, useNavigate} from 'react-router-dom'
import {blockchainAPI} from '../services/api'
import type{Block} from '../types'
import {ArrowLeft, Hash, Clock, Layers, Box} from 'lucide-react'

export default function BlockDetail() {
  const {index} = useParams<{index: string}>()
  const navigate = useNavigate()
  const [block, setBlock] = useState<Block | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBlock()
  }, [index])

  const loadBlock = async () => {
    if (!index) return

    try {
      setLoading(true)
      const res = await blockchainAPI.getBlock(parseInt(index))
      setBlock(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.error || 'Unable to load block')
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

  if (error || !block) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/blockchain')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blockchain
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error || 'Block not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/blockchain')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-3xl font-bold">Block #{block.index}</h1>
      </div>

      {/* Block header information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold mb-4">Block Header</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Index
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono">
              #{block.index}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timestamp
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded">
              {new Date(block.timestamp).toLocaleString('zh-CN')}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Hash
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono text-sm break-all">
              {block.hash}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Block Hash
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono text-sm break-all">
              {block.previousHash}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merkle Root
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono text-sm break-all">
              {block.merkleRoot}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono">
              {block.difficulty}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nonce
            </label>
            <div className="px-3 py-2 bg-gray-50 rounded font-mono">
              {block.nonce}
            </div>
          </div>
        </div>
      </div>

      {/* Proof-of-work validation status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">
            PoW Validation: {block.hash.startsWith('0'.repeat(block.difficulty)) ? '✓ Valid' : '✗ Invalid'}
          </span>
        </div>
        <p className="text-sm text-green-700 mt-2">
          Hash begins with {block.difficulty} zeroes: {block.hash.substring(0, block.difficulty + 10)}...
        </p>
      </div>

      {/* Transaction list */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Transactions ({block.transactions.length})
        </h2>

        <div className="space-y-4">
          {block.transactions.map((tx, idx) => (
            <div
              key={tx.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    #{idx}
                  </span>
                  {idx === 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      Coinbase
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(tx.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Transaction ID
                  </label>
                  <div className="font-mono text-xs bg-white p-2 rounded break-all">
                    {tx.id}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inputs ({tx.inputs.length})
                    </label>
                    <div className="space-y-1">
                      {tx.inputs.map((input, i) => (
                        <div key={i} className="text-xs bg-white p-2 rounded">
                          <div className="font-mono text-gray-600">
                            {input.txId ? `${input.txId.substring(0, 12)}...` : 'Coinbase'}
                          </div>
                          {input.txId && (
                            <div className="text-gray-500">Output index: {input.outputIndex}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Outputs ({tx.outputs.length})
                    </label>
                    <div className="space-y-1">
                      {tx.outputs.map((output, i) => (
                        <div key={i} className="text-xs bg-white p-2 rounded">
                          <div className="font-bold text-green-700">{output.amount} BTC</div>
                          <div className="font-mono text-gray-600">
                            {output.address.substring(0, 16)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {block.index > 0 ? (
          <Link
            to={`/block/${block.index - 1}`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Block
          </Link>
        ) : (
          <div></div>
        )}

        <Link
          to={`/block/${block.index + 1}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Next Block
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </Link>
      </div>
    </div>
  )
}

