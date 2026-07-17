import {useState, useEffect} from 'react'
import {walletAPI, transactionAPI} from '../services/api'
import type {Wallet} from '../types'
import {Send, Loader} from 'lucide-react'

export default function TransactionCreator() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [fromAddress, setFromAddress] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      const res = await walletAPI.getWallets()
      setWallets(res.data)
    } catch (err) {
      console.error('加载钱包失败:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromAddress || !toAddress || !amount) {
      setMessage({type: 'error', text: '请填写所有字段'})
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({type: 'error', text: '金额必须大于 0'})
      return
    }

    try {
      setSending(true)
      setMessage(null)
      
      const res = await transactionAPI.createTransaction({
        fromAddress,
        toAddress,
        amount: amountNum,
      })

      setMessage({
        type: 'success',
        text: `交易创建成功！交易 ID: ${res.data.transaction.id.substring(0, 16)}...`,
      })
      
      // 重置表单
      setAmount('')
      setToAddress('')
      
      // 刷新钱包余额
      loadWallets()
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.error || '交易创建失败',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedWallet = wallets.find((w) => w.address === fromAddress)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">创建交易</h1>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* 发送方钱包选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              发送方钱包
            </label>
            <select
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            >
              <option value="">选择钱包</option>
              {wallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.address.substring(0, 12)}... ({wallet.balance} BTC)
                </option>
              ))}
            </select>
            {selectedWallet && (
              <p className="mt-2 text-sm text-gray-600">
                可用余额: <span className="font-bold">{selectedWallet.balance} BTC</span>
              </p>
            )}
          </div>

          {/* 接收方地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              接收方地址
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="输入接收方的钱包地址"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              disabled={sending}
            />
            {/* 快速选择其他钱包 */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">快速选择:</span>
              {wallets
                .filter((w) => w.address !== fromAddress)
                .map((wallet) => (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => setToAddress(wallet.address)}
                    className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    disabled={sending}
                  >
                    {wallet.address.substring(0, 8)}...
                  </button>
                ))}
            </div>
          </div>

          {/* 转账金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              转账金额 (BTC)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            />
            {selectedWallet && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmount((selectedWallet.balance * 0.25).toFixed(2))}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={sending}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((selectedWallet.balance * 0.5).toFixed(2))}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={sending}
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((selectedWallet.balance * 0.75).toFixed(2))}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={sending}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(selectedWallet.balance.toFixed(2))}
                  className="text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  disabled={sending}
                >
                  全部
                </button>
              </div>
            )}
          </div>

          {/* 消息提示 */}
          {message && (
            <div
              className={`p-4 rounded ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={sending || !fromAddress || !toAddress || !amount}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                创建交易
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800 mb-2">注意事项：</p>
          <ul className="list-disc list-inside text-yellow-700 space-y-1">
            <li>交易创建后会进入待处理池，需要矿工挖矿才能确认</li>
            <li>系统会自动选择合适的 UTXO 并计算找零</li>
            <li>确保发送方有足够的余额</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

