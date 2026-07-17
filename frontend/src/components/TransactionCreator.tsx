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
      console.error('Unable to load wallets:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromAddress || !toAddress || !amount) {
      setMessage({type: 'error', text: 'Complete all fields'})
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({type: 'error', text: 'Amount must be greater than 0'})
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
        text: `Transaction created successfully! Transaction ID: ${res.data.transaction.id.substring(0, 16)}...`,
      })
      
      // Reset the form
      setAmount('')
      setToAddress('')
      
      // Refresh wallet balances
      loadWallets()
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.error || 'Unable to create transaction',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedWallet = wallets.find((w) => w.address === fromAddress)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create Transaction</h1>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Sender wallet selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Wallet
            </label>
            <select
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            >
              <option value="">Select a wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.address.substring(0, 12)}... ({wallet.balance} BTC)
                </option>
              ))}
            </select>
            {selectedWallet && (
              <p className="mt-2 text-sm text-gray-600">
                Available balance: <span className="font-bold">{selectedWallet.balance} BTC</span>
              </p>
            )}
          </div>

          {/* Recipient address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Enter the recipient wallet address"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              disabled={sending}
            />
            {/* Quick-select another wallet */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Quick select:</span>
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

          {/* Transfer amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (BTC)
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
                  All
                </button>
              </div>
            )}
          </div>

          {/* Status message */}
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

          {/* Submit button */}
          <button
            type="submit"
            disabled={sending || !fromAddress || !toAddress || !amount}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Create Transaction
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="font-medium text-yellow-800 mb-2">Before You Submit:</p>
          <ul className="list-disc list-inside text-yellow-700 space-y-1">
            <li>New transactions remain pending until a miner includes them in a block</li>
            <li>The simulator selects suitable UTXOs and calculates change automatically</li>
            <li>Make sure the sender has enough available balance</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

