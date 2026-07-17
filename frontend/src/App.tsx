import {BrowserRouter, Routes, Route, Link, Navigate} from 'react-router-dom'
import BlockchainView from './components/BlockchainView'
import BlockDetail from './components/BlockDetail'
import WalletManager from './components/WalletManager'
import TransactionCreator from './components/TransactionCreator'
import MiningPanel from './components/MiningPanel'
import UTXOExplorer from './components/UTXOExplorer'
import MerkleVerifier from './components/MerkleVerifier'
import {Blocks, Wallet, Send, Pickaxe, Database, GitBranch} from 'lucide-react'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Simple Bitcoin
            </h1>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0">
              <nav className="bg-white border border-gray-200 rounded-lg p-4 sticky top-6">
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/blockchain"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Blocks className="w-5 h-5" />
                      区块链
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/wallets"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Wallet className="w-5 h-5" />
                      钱包
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/transaction"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      创建交易
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/mining"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Pickaxe className="w-5 h-5" />
                      挖矿
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/utxo"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Database className="w-5 h-5" />
                      UTXO
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/merkle"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <GitBranch className="w-5 h-5" />
                      Merkle
                    </Link>
                  </li>
                </ul>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Navigate to="/blockchain" replace />} />
                <Route path="/blockchain" element={<BlockchainView />} />
                <Route path="/block/:index" element={<BlockDetail />} />
                <Route path="/wallets" element={<WalletManager />} />
                <Route path="/transaction" element={<TransactionCreator />} />
                <Route path="/mining" element={<MiningPanel />} />
                <Route path="/utxo" element={<UTXOExplorer />} />
                <Route path="/merkle" element={<MerkleVerifier />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
