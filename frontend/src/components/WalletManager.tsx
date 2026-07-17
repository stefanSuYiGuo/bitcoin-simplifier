import {useState, useEffect} from 'react'
import {walletAPI} from '../services/api'
import type {Wallet, UTXO} from '../types'
import {Wallet as WalletIcon, Plus, Eye, EyeOff, Copy, Check} from 'lucide-react'

export default function WalletManager() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [utxos, setUtxos] = useState<UTXO[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      setLoading(true)
      const res = await walletAPI.getWallets()
      setWallets(res.data)
    } catch (err) {
      console.error('Unable to load wallets:', err)
    } finally {
      setLoading(false)
    }
  }

  const createWallet = async () => {
    try {
      setCreating(true)
      const res = await walletAPI.createWallet()
      setWallets([...wallets, res.data])
      alert('Wallet created successfully!')
    } catch (err: any) {
      alert('Unable to create wallet: ' + (err.error || 'Unknown error'))
    } finally {
      setCreating(false)
    }
  }

  const selectWallet = async (wallet: Wallet) => {
    try {
      const [detailRes, utxoRes] = await Promise.all([
        walletAPI.getWallet(wallet.address),
        walletAPI.getUTXOs(wallet.address),
      ])
      setSelectedWallet(detailRes.data)
      setUtxos(utxoRes.data.utxos)
    } catch (err) {
      console.error('Unable to load wallet details:', err)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wallets</h1>
        <button
          onClick={createWallet}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating...' : 'Create Wallet'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet list */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">All Wallets</h2>
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <div
                key={wallet.address}
                onClick={() => selectWallet(wallet)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedWallet?.address === wallet.address
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <WalletIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-mono text-sm text-gray-600">
                        {wallet.address.substring(0, 12)}...
                        {wallet.address.substring(wallet.address.length - 8)}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {wallet.balance} BTC
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet details */}
        <div className="space-y-4">
          {selectedWallet ? (
            <>
              <h2 className="text-xl font-semibold">Wallet Details</h2>
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded break-all">
                      {selectedWallet.address}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.address, 'address')}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      {copied === 'address' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Key
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded break-all">
                      {selectedWallet.publicKey}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.publicKey, 'publicKey')}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      {copied === 'publicKey' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {selectedWallet.privateKey && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Private Key
                      </label>
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {showPrivateKey ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Show
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-sm bg-red-50 p-2 rounded break-all">
                        {showPrivateKey ? selectedWallet.privateKey : '••••••••••••'}
                      </span>
                      {showPrivateKey && (
                        <button
                          onClick={() =>
                            copyToClipboard(selectedWallet.privateKey!, 'privateKey')
                          }
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          {copied === 'privateKey' ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UTXOs ({utxos.length})
                  </label>
                  {utxos.length === 0 ? (
                    <p className="text-sm text-gray-500">No UTXOs found</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {utxos.map((utxo, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-3 rounded text-sm space-y-1"
                        >
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transaction ID:</span>
                            <span className="font-mono">
                              {utxo.txId.substring(0, 12)}...
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Output index:</span>
                            <span>{utxo.outputIndex}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-bold">{utxo.amount} BTC</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a wallet to view its details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

