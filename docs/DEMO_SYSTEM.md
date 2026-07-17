# Simple Bitcoin Visual Demo: Product Features

> A hands-on blockchain demonstration system. Open a browser to experience the complete workflow: create wallets, transfer funds, mine blocks, inspect the blockchain, and verify transactions.

---

## What Can This Demo Help You Do?

Think of it as a **locally hosted miniature blockchain laboratory**.

With this system, you can:

- **Create your own wallets** and obtain unique addresses and keys
- **Mine bitcoin** and observe block rewards arriving in a wallet
- **Transfer funds to other wallets** and experience the complete transaction lifecycle from creation to confirmation
- **Browse the entire blockchain** and inspect the contents of each block
- **Verify transactions** with Merkle proofs to confirm that a transaction is recorded on the chain

The entire process is visual, making every state change easy to observe. It is well suited to demonstrating how Bitcoin works.

---

## Product Architecture

| Component | Responsibility |
|------|------|
| **Frontend interface** | Provides an intuitive interface with navigation, data presentation, forms, and real-time feedback |
| **Backend service** | Maintains blockchain state, wallet data, and the transaction pool, and exposes capabilities to the frontend through APIs |

> Tip: This is a demonstration system, and all data is stored in memory. Restarting the service clears the data, allowing you to begin a new demonstration from a clean state at any time.

---

## Quick Start

**Start the backend**
```bash
cd bitcoin
pnpm run server
# Service runs at http://localhost:3001
```

**Start the frontend**
```bash
cd bitcoin/frontend
pnpm run dev
# Interface runs at http://localhost:3000
```

Open `http://localhost:3000` in a browser to begin.

---

## Feature Pages

### Navigation Overview

After entering the system, the left navigation bar lists every feature:

| Navigation item | Purpose |
|--------|----------|
| Blockchain | View every block and blockchain statistics |
| Wallets | Create wallets and view balances and asset details |
| Create Transaction | Initiate a transfer |
| Mining | Mine new blocks and package pending transactions |
| UTXO | Examine how funds are represented at the underlying level |
| Merkle | Verify whether a transaction is included in a block |

**[Screenshot placeholder: Home page — left navigation and overall layout]**

---

### Blockchain Explorer

**See the complete chain at a glance**

This is the system's overview dashboard. It displays:

- **Statistics cards**: Total blocks, UTXO count, current mining difficulty, and latest block height
- **Block list**: Basic information for each block, including height, time, hash, and transaction count
- Select any block to open its detail page and inspect the complete contents

This page answers the question: **"What does the chain look like now?"**

**[Screenshot placeholder: Blockchain explorer — statistics cards and block list]**

---

### Block Details

**Open a block and inspect its contents**

After selecting a block, you will see:

- Block header information: Height, timestamp, hash, previous block hash, difficulty, and nonce
- Every transaction in the block, including the coinbase transaction that pays the mining reward and regular transfer transactions

This page answers the question: **"What exactly is in this block?"**

**[Screenshot placeholder: Block details — block header information and transaction list]**

---

### Wallet Management

**Your digital identity and asset center**

Here you can:

- **Create a new wallet**: Generate an address, public key, and private key with one action
- **View all wallets**: See each wallet's address and current balance in a list
- **View wallet details**: See the complete address, public key, and private key, hide or reveal the private key, and copy values with one action
- **View UTXO details**: See the transactions from which the wallet's funds originated

This page answers the questions: **"Which wallets do I have? How much does each contain? Where did the funds come from?"**

**[Screenshot placeholder: Wallet list — multiple wallets and balances]**

**[Screenshot placeholder: Wallet details — address, public key, and private key]**

**[Screenshot placeholder: UTXO details — unspent outputs for the wallet]**

---

### Create Transaction

**Initiate a transfer**

The transfer workflow is straightforward:

1. **Select the sender**: Choose from your wallet list; the interface displays the available balance
2. **Enter the recipient**: Enter an address or quickly select another wallet in the system
3. **Enter the amount**: Enter an exact amount or quickly select 25%, 50%, 75%, or the entire balance
4. **Confirm creation**: The transaction enters the pending pool and waits for a miner to package it

> Note: A transaction does not take effect immediately after creation. It is confirmed only after a miner includes it in a mined block.

This page answers the question: **"How do I transfer funds to someone else?"**

**[Screenshot placeholder: Transaction form — sender, recipient, and amount]**

**[Screenshot placeholder: Successful transaction creation message]**

---

### Mining Panel

**Mine a new block and record transactions on the chain**

This is the most distinctive stage of the demonstration:

1. **Select the miner**: Specify the wallet that will receive the 50 BTC block reward
2. **View difficulty**: See the current difficulty and the expected difficulty of the next block
3. **View pending transactions**: See every transaction waiting to be packaged
4. **Select transactions to package**: Select specific transactions or select all of them
5. **Start mining**: The system performs proof of work and finds a suitable nonce
6. **View the result**: After successful mining, see the block hash, attempt count, duration, and other details

After mining succeeds, open the Blockchain page to see the new block and the Wallets page to see balance changes.

This page answers the questions: **"How is a transaction confirmed? How does a miner work?"**

**[Screenshot placeholder: Mining panel — miner selection and difficulty information]**

**[Screenshot placeholder: Pending transaction list — select transactions to package]**

**[Screenshot placeholder: Mining result — block hash, nonce, attempt count, and duration]**

---

### UTXO Explorer

**Understand balances from the underlying model**

Bitcoin does not use account balances; it uses unspent transaction outputs (UTXOs). This page displays:

- **Global UTXO list**: Every spendable output in the system
- **Information for each UTXO**: Source transaction, output index, amount, and owner
- **Address filtering**: Display only the UTXOs associated with a particular wallet

After transferring funds or mining, refresh this page to observe how UTXOs are consumed and created.

This page answers the question: **"How are funds represented in Bitcoin?"**

**[Screenshot placeholder: UTXO explorer — global UTXO list]**

**[Screenshot placeholder: UTXOs filtered by address]**

---

### Merkle Verifier

**Verify that a transaction is recorded on the chain**

A Merkle tree is the data structure Bitcoin uses for efficient transaction verification. This page demonstrates the verification process:

1. **Select a block**
2. **Select a transaction in the block**
3. **Start verification**: The system generates and verifies a Merkle proof
4. **View the result**: See whether verification succeeded and inspect the complete Merkle path

This feature demonstrates an important concept: **a transaction can be verified without downloading the entire blockchain**, which is the principle behind SPV lightweight clients.

This page answers the question: **"How can I prove that a transaction was recorded in a block?"**

**[Screenshot placeholder: Merkle verifier — block and transaction selection]**

**[Screenshot placeholder: Verification result — success or failure status]**

**[Screenshot placeholder: Merkle path, when available]**

---

## Recommended Demonstration Workflow

If you are recording a demonstration video or preparing annotated screenshots, use the following sequence:

| Step | Action | Screenshot focus |
|------|------|----------|
| 1 | Open the Wallets page and create two new wallets | Wallet list and new wallet addresses |
| 2 | Open the Mining page, select one wallet as the miner, and mine a block | Successful mining result and the miner receiving 50 BTC |
| 3 | Open the transaction page and send 20 BTC from the miner wallet to the other wallet | Successful transaction creation message |
| 4 | Return to the Mining page and package the new transaction in a block | Pending transaction selected and successful mining |
| 5 | Open the Blockchain page and inspect the new block | Additional block in the list and the transaction in its details |
| 6 | Open the Wallets page and inspect both balance changes | Sender balance decreases and recipient balance increases |
| 7 | Open the UTXO page and observe the UTXO changes | Old UTXO disappears and new UTXOs appear |
| 8 | Open the Merkle page and verify the transaction | Successful verification and Merkle path |

---

## Summary

This demo connects Bitcoin's core concepts—**wallets, transactions, mining, the blockchain, UTXOs, and Merkle proofs**—into a complete hands-on workflow.

You do not need to understand the underlying code. By following the interface workflow, you can directly observe:

- How funds are created through mining
- How funds move through transactions
- How transactions are confirmed by being packaged into blocks
- How the blockchain grows one block at a time
- How to prove that a transaction exists through Merkle verification

**Open the browser and begin exploring the blockchain.**
