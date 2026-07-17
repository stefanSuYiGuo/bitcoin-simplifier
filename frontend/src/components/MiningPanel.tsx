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
      console.error('加载数据失败:', err)
    }
  }

  const handleMine = async () => {
    if (!minerAddress) {
      alert('请选择矿工地址')
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
      
      // 刷新数据
      await loadData()
      setSelectedTxs([])
    } catch (err: any) {
      alert('挖矿失败: ' + (err.error || '未知错误'))
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
      <h1 className="text-3xl font-bold">挖矿面板</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 挖矿设置 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">挖矿设置</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                矿工地址
              </label>
              <select
                value={minerAddress}
                onChange={(e) => setMinerAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                disabled={mining}
              >
                <option value="">选择矿工</option>
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
                    <span className="text-blue-600">当前难度:</span>
                    <span className="ml-2 font-bold">{difficulty.current}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">下个区块难度:</span>
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
                  挖矿中...
                </>
              ) : (
                <>
                  <Pickaxe className="w-5 h-5" />
                  开始挖矿
                </>
              )}
            </button>
          </div>

          {/* 挖矿结果 */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">挖矿成功！</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>区块哈希:</span>
                  <span className="font-mono">{result.block.hash.substring(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>区块高度:</span>
                  <span className="font-bold">#{result.block.index}</span>
                </div>
                <div className="flex justify-between">
                  <span>交易数:</span>
                  <span>{result.block.transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nonce:</span>
                  <span>{result.block.nonce}</span>
                </div>
                <div className="flex justify-between">
                  <span>尝试次数:</span>
                  <span>{result.mining.attempts}</span>
                </div>
                <div className="flex justify-between">
                  <span>用时:</span>
                  <span>{result.mining.duration}ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 待处理交易 */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                待处理交易 ({pendingTxs.length})
              </h2>
              <button
                onClick={loadData}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                刷新
              </button>
            </div>

            {pendingTxs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                暂无待处理交易
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
                        <span className="text-gray-500">{tx.inputs.length} 输入</span>
                        <span className="text-gray-500">{tx.outputs.length} 输出</span>
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
                  {selectedTxs.length === pendingTxs.length ? '取消全选' : '全选'}
                </button>
                <span className="ml-2 text-gray-500">
                  (已选 {selectedTxs.length}/{pendingTxs.length})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

