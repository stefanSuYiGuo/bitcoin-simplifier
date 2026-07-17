# Bitcoin Simplifier

Bitcoin Simplifier is an interactive educational simulator for exploring the simplified mechanics behind Bitcoin. It combines a TypeScript domain model, an Express API, and a React interface so that wallets, transactions, blocks, mining, UTXOs, and Merkle proofs can be inspected in a controlled local environment.

This project is not a complete Bitcoin implementation. It does not connect to the Bitcoin network, participate in consensus, or create, transfer, or custody real assets. All wallets, balances, blocks, and transactions exist only in the simulator's in-memory state.

## What the project demonstrates

- Wallet creation, elliptic-curve key pairs, addresses, and digital signatures
- A UTXO-based transaction model with input selection and change outputs
- Transaction construction, signing, ownership checks, and double-spend prevention
- Inputs signed independently by multiple wallets
- Coinbase transactions, block rewards, and transaction fees
- Blocks linked by previous-block hashes
- Merkle tree construction, proof generation, and proof verification
- Simplified proof-of-work mining with double SHA-256 hashing
- Simplified difficulty adjustment based on block timing
- A stack-based educational script system
- In-memory blockchain validation and statistics

The browser interface provides views for the blockchain, individual blocks, wallets, transaction creation, mining, UTXOs, and Merkle proof verification. A command-line demonstration is also included.

## Technology stack

- TypeScript and Node.js
- Express and CORS for the local API
- React, Vite, React Router, and Tailwind CSS for the interface
- `elliptic` and `crypto-js` for educational cryptographic operations
- Jest and ts-jest for automated tests

## Prerequisites

- Node.js 20 or a compatible current Node.js release
- npm or pnpm

## Installation

Install the API and core project dependencies from the repository root, then install the frontend dependencies:

```bash
npm install
cd frontend
npm install
cd ..
```

The same commands may be run with pnpm if that is your preferred package manager.

## Run the interactive simulator

Start the API and frontend together from the repository root:

```bash
npm run dev:all
```

The API listens on `http://localhost:3001`. Vite prints the local frontend URL when it starts. The frontend forwards `/api` requests to the local API server.

To run each process separately, use two terminals:

```bash
# Terminal 1: API server
npm run server:dev

# Terminal 2: frontend
npm run frontend
```

The API health check is available at `http://localhost:3001/health`, and `http://localhost:3001/` lists the available endpoints.

## Run the command-line demonstration

```bash
npm start
```

The demonstration creates wallets and UTXOs, builds and verifies transactions, mines blocks, and prints the resulting state to the terminal.

## Build and test

```bash
# Compile the TypeScript backend and core modules
npm run build

# Run the Jest test suite
npm test

# Run tests in watch mode
npm run test:watch

# Generate a coverage report
npm run test:coverage

# Build the frontend
cd frontend
npm run build
```

## Project structure

```text
.
├── src/
│   ├── blockchain/     # Blocks, chain state, mining, and proof of work
│   ├── crypto/         # Hashing and signature helpers
│   ├── examples/       # Command-line demonstration
│   ├── merkle/         # Merkle trees and proofs
│   ├── script/         # Simplified stack-based script system
│   ├── server/         # Express API and in-memory simulator state
│   ├── transaction/    # Transactions, UTXOs, signing, and construction
│   ├── utils/          # Base58 utilities
│   └── wallet/         # Key pairs, addresses, and wallet behavior
├── frontend/           # React and Vite interface
├── docs/               # Design notes, tutorials, and project references
├── package.json
└── tsconfig.json
```

## Core concepts

### UTXOs and transactions

Balances are derived from unspent transaction outputs rather than stored directly on a wallet. A transaction consumes existing outputs and creates new outputs for recipients and, when needed, change.

```typescript
const alice = new Wallet()
const bob = new Wallet()
const utxoSet = new UTXOSet()

utxoSet.add('genesis_tx', 0, new TxOutput(100, alice.address))

const transaction = new TransactionBuilder(utxoSet)
  .from(alice)
  .to(bob.address, 60)
  .buildAndSign()
```

### Independent input signatures

Transactions may contain inputs owned by different wallets. Each owner signs only the corresponding input:

```typescript
const transaction = new Transaction(
  [new TxInput('alice_tx', 0), new TxInput('bob_tx', 0)],
  [new TxOutput(75, recipient.address)]
)

TransactionSigner.signInput(transaction, 0, alice)
TransactionSigner.signInput(transaction, 1, bob)
```

See [Multi-party Transactions](./docs/MULTI_PARTY_TRANSACTIONS.md) for a detailed discussion. That document may include content in another language; the root README is maintained in English.

### Blocks and mining

The simulator groups transactions into blocks, calculates a Merkle root, links each block to its predecessor, and searches for a nonce whose hash satisfies a simplified difficulty target.

```typescript
const blockchain = new Blockchain({
  initialDifficulty: 2,
  blockReward: 50,
  targetBlockTime: 10,
  difficultyAdjustmentInterval: 10,
})

const miner = new Miner(minerWallet, blockchain)
const {block} = miner.mineEmptyBlock()
blockchain.addBlock(block)
```

### Merkle proofs

```typescript
const tree = new MerkleTree(['tx1', 'tx2', 'tx3', 'tx4'])
const root = tree.getRoot()
const proof = tree.getProof('tx1')
const isValid = MerkleTree.verify('tx1', proof, root)
```

## Additional documentation

- [Technical Design](./docs/TECH_DESIGN.md)
- [Implementation Plan](./docs/PLAN.md)
- [Tutorial: Part 1](./docs/ARTICLE_PART1.md)
- [Tutorial: Part 2](./docs/ARTICLE_PART2.md)
- [Tutorial: Part 3](./docs/ARTICLE_PART3.md)
- [Tutorial: Part 4](./docs/ARTICLE_PART4.md)
- [Multi-party Transactions](./docs/MULTI_PARTY_TRANSACTIONS.md)
- [Real Bitcoin Compared with This Simulator](./docs/REAL_BITCOIN_VS_OUR_IMPLEMENTATION.md)

## Educational scope and limitations

Bitcoin Simplifier deliberately trades protocol completeness for readability and fast local experimentation. In particular:

- There is no peer-to-peer networking or node discovery.
- State is held in memory and is reset when the server restarts.
- The simulator does not parse or relay Bitcoin network messages.
- Addresses, transaction formats, consensus rules, and script behavior are simplified and are not Bitcoin-compatible in every detail.
- Difficulty adjustment and proof-of-work targets are designed for quick demonstrations.
- UTXO selection uses a simple greedy strategy.
- There is no mempool policy, block-size policy, wallet encryption, or secure key storage.

The implementation is intended for learning, demonstrations, and code exploration. It should not be used as a wallet, node, payment system, security reference, or basis for financial software.

## Disclaimer

This repository is educational software. It does not provide financial, investment, or security advice and must not be used with real funds or production credentials. Cryptographic keys generated by the simulator are local demonstration data and should never be reused elsewhere.

## References

- [Bitcoin white paper](https://bitcoin.org/bitcoin.pdf)
- [Mastering Bitcoin](https://github.com/bitcoinbook/bitcoinbook)
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)

## License

MIT
