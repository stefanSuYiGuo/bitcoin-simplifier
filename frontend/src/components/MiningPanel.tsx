import {useState, useEffect} from 'react'
import {walletAPI, transactionAPI, miningAPI, blockchainAPI} from '../services/api'
import type {Wallet, Transaction} from '../types'
import {Pickaxe, Loader, CheckCircle} from 'lucide-react'

export default function MiningPanel() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [minerAddress, setMinerAddress] = useState('')
  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([])
  const [selectedTxs, setSelectedTxs] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<any>(null)
  const [mining, setMining] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [walletsRes, txRes, diffRes] = await Promise.all([
        walletAPI.getWallets(),
        transactionAPI.getPendingTransactions(),
        miningAPI.getDifficulty(),
      ])
      setWallets(walletsRes.data)
      setPendingTxs(txRes.data.transactions)
      setDifficulty(diffRes.data)
    } catch (err) {
      console.error('Unable to load mining data:', err)
    }
  }

  const handleMine = async () => {
    if (!minerAddress) {
      alert('Select a miner address')
      return
    }

    try {
      setMining(true)
      setResult(null)
      
      const res = await miningAPI.mine({
        minerAddress,
        transactionIds: selectedTxs.length > 0 ? selectedTxs : undefined,
      })

      setResult(res.data)
      
      // Refresh the data
      await loadData()
      setSelectedTxs([])
    } catch (err: any) {
      alert('Mining failed: ' + (err.error || 'Unknown error'))
    } finally {
      setMining(false)
    }
  }

  const toggleTx = (txId: string) => {
    setSelectedTxs((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mining</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mining settings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Mining Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Miner Address
              </label>
              <select
                value={minerAddress}
                onChange={(e) => setMinerAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                disabled={mining}
              >
                <option value="">Select a miner</option>
                {wallets.map((wallet) => (
                  <option key={wallet.address} value={wallet.address}>
                    {wallet.address.substring(0, 16)}... ({wallet.balance} BTC)
                  </option>
                ))}
              </select>
            </div>

            {difficulty && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Current difficulty:</span>
                    <span className="ml-2 font-bold">{difficulty.current}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Next block difficulty:</span>
                    <span className="ml-2 font-bold">{difficulty.next}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleMine}
              disabled={mining || !minerAddress}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {mining ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Mining...
                </>
              ) : (
                <>
                  <Pickaxe className="w-5 h-5" />
                  Start Mining
                </>
              )}
            </button>
          </div>

          {/* Mining result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Block Mined Successfully!</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Block hash:</span>
                  <span className="font-mono">{result.block.hash.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Block height:</span>
                  <span className="font-bold">#{result.block.index}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span>{result.block.transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nonce:</span>
                  <span>{result.block.nonce}</span>
                </div>
                <div className="flex justify-between">
                  <span>Attempts:</span>
                  <span>{result.mining.attempts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{result.mining.duration}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pending transactions */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Pending Transactions ({pendingTxs.length})
              </h2>
              <button
                onClick={loadData}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Refresh
              </button>
            </div>

            {pendingTxs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No pending transactions
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingTxs.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => toggleTx(tx.id)}
                    className={`p-3 border rounded cursor-pointer transition-all ${
                      selectedTxs.includes(tx.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm space-y-1">
                      <div className="font-mono text-xs text-gray-600">
                        {tx.id.substring(0, 16)}...
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{tx.inputs.length} inputs</span>
                        <span className="text-gray-500">{tx.outputs.length} outputs</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingTxs.length > 0 && (
              <div className="mt-4 pt-4 border-t text-sm">
                <button
                  onClick={() =>
                    setSelectedTxs(
                      selectedTxs.length === pendingTxs.length
                        ? []
                        : pendingTxs.map((tx) => tx.id)
                    )
                  }
                  className="text-blue-600 hover:text-blue-700"
                >
                  {selectedTxs.length === pendingTxs.length ? 'Clear Selection' : 'Select All'}
                </button>
                <span className="ml-2 text-gray-500">
                  ({selectedTxs.length}/{pendingTxs.length} selected)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

