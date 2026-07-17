import {useState, useEffect} from 'react'
import {walletAPI, blockchainAPI} from '../services/api'
import type {UTXO, Wallet} from '../types'
import {Database, Filter} from 'lucide-react'

export default function UTXOExplorer() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [allUTXOs, setAllUTXOs] = useState<UTXO[]>([])
  const [filteredUTXOs, setFilteredUTXOs] = useState<UTXO[]>([])
  const [filterAddress, setFilterAddress] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (filterAddress) {
      setFilteredUTXOs(allUTXOs.filter((utxo) => utxo.address === filterAddress))
    } else {
      setFilteredUTXOs(allUTXOs)
    }
  }, [filterAddress, allUTXOs])

  const loadData = async () => {
    try {
      setLoading(true)
      const walletsRes = await walletAPI.getWallets()
      setWallets(walletsRes.data)

      // 获取所有钱包的 UTXO
      const utxoPromises = walletsRes.data.map((w: Wallet) =>
        walletAPI.getUTXOs(w.address)
      )
      const utxoResults = await Promise.all(utxoPromises)
      
      const allUtxos: UTXO[] = []
      utxoResults.forEach((res) => {
        allUtxos.push(...res.data.utxos)
      })
      
      setAllUTXOs(allUtxos)
      setFilteredUTXOs(allUtxos)
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>
  }

  const totalValue = filteredUTXOs.reduce((sum, utxo) => sum + utxo.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">UTXO 浏览器</h1>

      {/* 统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">总 UTXO 数</p>
              <p className="text-2xl font-bold text-blue-900">{allUTXOs.length}</p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">显示 UTXO</p>
              <p className="text-2xl font-bold text-green-900">{filteredUTXOs.length}</p>
            </div>
            <Filter className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div>
            <p className="text-sm text-purple-600">总价值</p>
            <p className="text-2xl font-bold text-purple-900">{totalValue.toFixed(2)} BTC</p>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          按地址筛选
        </label>
        <select
          value={filterAddress}
          onChange={(e) => setFilterAddress(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">全部地址</option>
          {wallets.map((wallet) => (
            <option key={wallet.address} value={wallet.address}>
              {wallet.address.substring(0, 16)}... ({wallet.balance} BTC)
            </option>
          ))}
        </select>
      </div>

      {/* UTXO 列表 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">交易 ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">输出索引</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">地址</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">金额</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUTXOs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  暂无 UTXO
                </td>
              </tr>
            ) : (
              filteredUTXOs.map((utxo, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">
                    {utxo.txId.substring(0, 16)}...
                  </td>
                  <td className="px-4 py-3 text-sm">{utxo.outputIndex}</td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {utxo.address.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold">
                    {utxo.amount} BTC
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

