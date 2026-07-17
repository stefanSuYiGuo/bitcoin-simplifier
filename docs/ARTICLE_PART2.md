# Building a Simple Bitcoin: Part 2 - The Transaction System

In the previous article, we implemented the foundational components of Bitcoin: cryptographic utilities, wallets, and the UTXO model. These are essential building blocks, but a functioning Bitcoin system also needs a transaction system.

This article explores how to implement a complete transaction system, including transaction construction, signing, validation, UTXO selection, and change handling.

## 1. Why a Transaction System Is Necessary

In a traditional banking system, a transfer is simple: subtract an amount from account A and add the same amount to account B. Bitcoin's UTXO model works differently and more closely resembles a cash transaction.

Imagine that your physical wallet contains one 100-unit note, one 50-unit note, and two 20-unit notes. If you want to purchase something for 60 units, you might:

1. Hand over the 100-unit note
2. Pay the merchant 60 units
3. Receive 40 units in change

In this process, the original 100-unit note is spent and replaced by 60 units received by the merchant and 40 units returned to you as change.

Bitcoin's transaction system models this process. Every transaction must:

- Select suitable UTXOs, which act like banknotes
- Calculate the change amount
- Sign the transaction to demonstrate authorization
- Allow the network to validate the transaction

## 2. Basic Transaction Structure

Before implementing the system, we need to understand transaction structure. A Bitcoin transaction has three core components:

```
Transaction
├── Transaction ID (txId)
├── Input list (inputs)
│   ├── Input 1: referenced UTXO + signature + public key
│   ├── Input 2: referenced UTXO + signature + public key
│   └── ...
├── Output list (outputs)
│   ├── Output 1: amount + recipient address
│   ├── Output 2: amount + recipient address
│   └── ...
└── Timestamp
```

Each input references an existing UTXO and provides a signature demonstrating authorization to spend it. Each output creates a new UTXO that can be spent by a future transaction.

Consider an example in which Alice owns two UTXOs:

**UTXO set before the transaction:**

| UTXO | Amount | Owner | Status |
|------|------|--------|------|
| tx1:0 | 100 BTC | Alice | Unspent |
| tx2:0 | 50 BTC | Alice | Unspent |

**Alice creates a new transaction to send Bob 60 BTC:**

Transaction input:

| Referenced UTXO | Amount | Signature | Public key |
|----------|------|------|------|
| tx1:0 | 100 BTC | Alice's signature | Alice's public key |

Transaction outputs:

| Output index | Amount | Recipient address | Description |
|---------|------|---------|------|
| 0 | 60 BTC | Bob's address | Payment |
| 1 | 40 BTC | Alice's address | Change |

**UTXO set after the transaction:**

| UTXO | Amount | Owner | Status | Description |
|------|------|--------|------|------|
| tx1:0 | 100 BTC | Alice | Spent | Consumed by the new transaction |
| tx2:0 | 50 BTC | Alice | Unspent | Not used |
| tx3:0 | 60 BTC | Bob | Unspent | Newly created |
| tx3:1 | 40 BTC | Alice | Unspent | Change |

Note that Alice's original `tx1:0` is marked as spent and is no longer part of the UTXO set.

## 3. The Transaction Class: The Core of a Transaction

We can now implement the `Transaction` class. It manages inputs and outputs, calculates the transaction ID, and provides validation behavior.

### 3.1 Creating a Transaction

```typescript
export class Transaction {
  id: string
  inputs: TxInput[]
  outputs: TxOutput[]
  timestamp: number

  constructor(
    inputs: TxInput[],
    outputs: TxOutput[],
    timestamp: number = Date.now()
  ) {
    if (inputs.length === 0) {
      throw new Error('Transaction must have at least one input')
    }
    if (outputs.length === 0) {
      throw new Error('Transaction must have at least one output')
    }

    this.inputs = inputs
    this.outputs = outputs
    this.timestamp = timestamp
    this.id = this.calculateId()
  }
}
```

The essential rule is that a transaction must contain at least one input and one output. Without an input there is no source of funds, and without an output there is no recipient.

### 3.2 Calculating the Transaction ID

The transaction ID is a hash of the transaction content and uniquely identifies the transaction. In this implementation, the signing content excludes signatures because each signature is itself derived from that content. Including it would create a circular dependency.

```typescript
private calculateId(): string {
  const content = this.getContentForSigning()
  return Hash.sha256(content)
}

getContentForSigning(): string {
  const inputsForSigning = this.inputs.map(input => ({
    txId: input.txId,
    outputIndex: input.outputIndex,
  }))

  const content = {
    inputs: inputsForSigning,
    outputs: this.outputs.map(output => output.toJSON()),
    timestamp: this.timestamp,
  }

  return JSON.stringify(content)
}
```

The value returned by `getContentForSigning()`:
- Includes input reference data (`txId` and `outputIndex`)
- Excludes signatures and public keys
- Includes every output and the timestamp

This keeps the signing content deterministic regardless of signature changes, so the transaction ID remains stable.

### 3.3 Validating Amounts

The transaction system enforces a basic economic rule: total input value must be greater than or equal to total output value. The difference is the mining fee.

```typescript
getInputAmount(utxoSet: Map<string, TxOutput>): number {
  let total = 0
  for (const input of this.inputs) {
    const key = `${input.txId}:${input.outputIndex}`
    const utxo = utxoSet.get(key)
    if (!utxo) {
      throw new Error(`UTXO not found: ${key}`)
    }
    total += utxo.amount
  }
  return total
}

getOutputAmount(): number {
  return this.outputs.reduce((sum, output) => sum + output.amount, 0)
}

calculateFee(utxoSet: Map<string, TxOutput>): number {
  const inputAmount = this.getInputAmount(utxoSet)
  const outputAmount = this.getOutputAmount()
  return inputAmount - outputAmount
}
```

The following example illustrates the mining fee:

```
Inputs:
  UTXO1: 100 BTC
  UTXO2: 50 BTC
  Total: 150 BTC

Outputs:
  Payment to Bob: 60 BTC
  Change: 89 BTC
  Total: 149 BTC

Mining fee = 150 - 149 = 1 BTC
```

The 1 BTC difference is the fee awarded to the miner who includes the transaction in a block.

### 3.4 Coinbase Transactions: A Special First Transaction

The first transaction in every block is a special coinbase transaction that pays the miner's reward. It has no conventional input because it creates new bitcoin according to the protocol's issuance rules.

```typescript
static createCoinbase(
  minerAddress: string,
  amount: number,
  blockHeight: number = 0
): Transaction {
  const coinbaseInput = new TxInput(
    '0000000000000000000000000000000000000000000000000000000000000000',
    blockHeight,
    '',
    ''
  )

  const coinbaseOutput = new TxOutput(amount, minerAddress)

  return new Transaction([coinbaseInput], [coinbaseOutput])
}

isCoinbase(): boolean {
  return (
    this.inputs.length === 1 &&
    this.inputs[0].txId === '0000000000000000000000000000000000000000000000000000000000000000'
  )
}
```

A coinbase transaction uses a special all-zero transaction ID as its input in this model, indicating newly issued bitcoin. On the real Bitcoin network, a new block is found approximately every ten minutes, and the miner receives the block reward through its coinbase transaction.

## 4. TransactionSigner: Signing and Verification

With the transaction structure in place, we need a mechanism for demonstrating authorization and validating transactions. This is the purpose of signing and verification.

### 4.1 Signing a Transaction

Signing a transaction means using a private key to sign its content, demonstrating authorization to spend the UTXOs referenced by its inputs.

```typescript
export class TransactionSigner {
  static signTransaction(transaction: Transaction, wallet: Wallet): Transaction {
    const txData = transaction.getContentForSigning()

    for (const input of transaction.inputs) {
      if (input.isSigned()) {
        continue
      }

      const signature = wallet.sign(txData)
      input.setSignature(signature, wallet.publicKey)
    }

    transaction.id = transaction.calculateId()

    return transaction
  }
}
```

The signing process is straightforward:
1. Obtain the original transaction content without signatures
2. Sign each unsigned input
3. Store the signature and public key in the input

Consider a practical signing example:

**Original unsigned transaction:**

```
Input:
  - txId: tx1
  - outputIndex: 0
  - signature: (empty)
  - publicKey: (empty)
```

**Signing process**
↓

**Signed transaction:**

```
Input:
  - txId: tx1
  - outputIndex: 0
  - signature: 3045...a7b9
  - publicKey: 04f3...c2d1
```

### 4.2 Transaction Validation: Two Layers of Protection

Transaction validation is essential to network security. This simplified process contains two layers:

**Layer 1: Verify the signature itself**

```typescript
const isSignatureValid = Signature.verify(txData, signature, publicKey)
```

This step confirms that the signature was created by someone controlling the corresponding private key.

**Layer 2: Verify that the public key controls the referenced UTXO**

```typescript
const sha256Hash = Hash.sha256(input.publicKey)
const ripemd160Hash = Hash.ripemd160(sha256Hash)
const addressFromPublicKey = encodeBase58(ripemd160Hash)

if (addressFromPublicKey !== utxo.address) {
  return false
}
```

The transaction is valid only if both checks succeed. Bob can create a valid signature with his own key, but the second check fails if the address derived from that public key does not own the referenced UTXO.

The following attack scenario demonstrates why both layers are necessary:

**Scenario: Bob attempts to steal Alice's UTXO**

```
Alice's UTXO: tx1:0 (100 BTC)
Owner address: alice_address

Bob creates a fraudulent transaction:

Input:
  - txId: tx1 (Alice's UTXO)
  - outputIndex: 0
  - signature: Bob signs with his private key
  - publicKey: Bob's public key

Output:
  - 100 BTC → Bob's address

Validation process:
[PASS] Layer 1: Signature verification succeeds
       (Bob's signature is valid for Bob's public key)

[FAIL] Layer 2: Ownership verification fails
       Address derived from Bob's public key: bob_address
       UTXO owner address: alice_address
       The addresses do not match
```

These two layers ensure that:
1. The transaction was signed by someone controlling the private key, preventing signature forgery
2. The signer controls the referenced UTXO, preventing unauthorized spending

Complete validation code:

```typescript
static verifyTransaction(
  transaction: Transaction,
  utxoSet: Map<string, {amount: number; address: string}>
): boolean {
  if (transaction.isCoinbase()) {
    return true
  }

  const txData = transaction.getContentForSigning()

  for (const input of transaction.inputs) {
    if (!input.isSigned()) {
      return false
    }

    // Layer 1: Verify the signature
    if (!Signature.verify(txData, input.signature, input.publicKey)) {
      return false
    }

    // Layer 2: Verify ownership
    const utxoKey = `${input.txId}:${input.outputIndex}`
    const utxo = utxoSet.get(utxoKey)

    if (!utxo) {
      return false
    }

    const sha256Hash = Hash.sha256(input.publicKey)
    const ripemd160Hash = Hash.ripemd160(sha256Hash)
    const addressFromPublicKey = encodeBase58(ripemd160Hash)

    if (addressFromPublicKey !== utxo.address) {
      return false
    }
  }

  return true
}
```

## 5. TransactionBuilder: A Convenient Transaction Builder

Constructing transactions manually is tedious because it requires selecting UTXOs, calculating change, and handling signatures. The `TransactionBuilder` class encapsulates this complexity behind a concise API.

### 5.1 Usage

The following examples show how to use `TransactionBuilder`:

```typescript
// Simple transfer
const tx = new TransactionBuilder(utxoSet)
  .from(aliceWallet)
  .to(bobWallet.address, 60)
  .buildAndSign()

// Transfer to multiple recipients
const tx = new TransactionBuilder(utxoSet)
  .from(aliceWallet)
  .to(bobWallet.address, 30)
  .to(charlieWallet.address, 20)
  .withChangeAddress(aliceWallet.address)
  .buildAndSign()

// Or use the static helper
const tx = TransactionBuilder.createSimpleTransfer(
  aliceWallet,
  bobWallet.address,
  60,
  utxoSet
)
```

This fluent API keeps transaction-building code concise and readable.

### 5.2 UTXO Selection Strategy: A Greedy Algorithm

UTXO selection is a central transaction-building problem. Given a target amount, how should a wallet choose among several available UTXOs?

This implementation uses a greedy algorithm that selects the largest UTXOs first until the target is met.

```typescript
private selectUTXOs(
  utxos: Array<{txId: string; outputIndex: number; output: TxOutput}>,
  targetAmount: number
): Array<{txId: string; outputIndex: number; output: TxOutput}> {
  // Sort by amount in descending order
  const sorted = [...utxos].sort((a, b) => b.output.amount - a.output.amount)

  const selected: Array<{
    txId: string
    outputIndex: number
    output: TxOutput
  }> = []
  let total = 0

  for (const utxo of sorted) {
    selected.push(utxo)
    total += utxo.amount

    if (total >= targetAmount) {
      break
    }
  }

  if (total < targetAmount) {
    return []
  }

  return selected
}
```

The following examples illustrate the algorithm:

```
Scenario: Alice needs to pay 60 BTC

Alice's UTXOs:
  UTXO1: 100 BTC
  UTXO2: 50 BTC
  UTXO3: 25 BTC
  UTXO4: 10 BTC

Step 1: Sort from largest to smallest
  [100, 50, 25, 10]

Step 2: Select outputs
  - Select 100 BTC
  - Running total: 100 BTC
  - 100 >= 60, so stop

Result: Select one UTXO (100 BTC)
Change: 100 - 60 = 40 BTC
```

If the payment is 120 BTC:

```
Step 1: Sort
  [100, 50, 25, 10]

Step 2: Select outputs
  - Select 100 BTC; running total: 100
  - 100 < 120, so continue
  - Select 50 BTC; running total: 150
  - 150 >= 120, so stop

Result: Select two UTXOs (100 + 50 = 150 BTC)
Change: 150 - 120 = 30 BTC
```

Advantages of this greedy algorithm:
- Simple and efficient
- Often selects a small number of UTXOs
- Reduces transaction size because fewer inputs require less data

### 5.3 Complete Workflow

The following example demonstrates the complete workflow:

**Initial state:**

| UTXO | Amount | Owner |
|------|------|--------|
| tx1:0 | 100 BTC | Alice |
| tx2:0 | 50 BTC | Alice |
| tx3:0 | 25 BTC | Alice |

**Goal:** Alice sends Bob 60 BTC

**Step 1: Select UTXOs**
```
Selection algorithm: greedy, largest first
Selected: tx1:0 (100 BTC)
```

**Step 2: Build the inputs**
```typescript
inputs = [
  TxInput(txId: 'tx1', outputIndex: 0)
]
```

**Step 3: Build the outputs**
```typescript
recipients = [
  { address: 'bob_address', amount: 60 }
]

outputs = [
  TxOutput(60, 'bob_address')
]
```

**Step 4: Calculate change**
```
totalInput = 100
totalOutput = 60
change = 100 - 60 = 40
```

**Step 5: Add the change output**
```typescript
outputs.push(
  TxOutput(40, 'alice_address')
)
```

**Step 6: Create the transaction**
```typescript
tx = new Transaction(inputs, outputs)
```

**Step 7: Sign the transaction**
```typescript
Sign each input
input.signature = sign(txData, alice_privateKey)
input.publicKey = alice_publicKey
```

**Final transaction (tx4):**

| Item | Content |
|------|------|
| Transaction ID | tx4 |
| **Input** | |
| - tx1:0 | signature: signed<br/>publicKey: Alice's PubKey |
| **Outputs** | |
| - Output 0 | 60 BTC → bob_address |
| - Output 1 | 40 BTC → alice_address |

After executing the transaction, the UTXO set changes as follows:

| UTXO | Amount | Owner | Status | Description |
|------|------|--------|------|------|
| tx1:0 | 100 BTC | Alice | Spent | Consumed by tx4 |
| tx2:0 | 50 BTC | Alice | Unspent | Not used |
| tx3:0 | 25 BTC | Alice | Unspent | Not used |
| tx4:0 | 60 BTC | Bob | Unspent | Newly created |
| tx4:1 | 40 BTC | Alice | Unspent | Change |

**Final balances:**
- Alice: tx2:0 (50) + tx3:0 (25) + tx4:1 (40) = **115 BTC**
- Bob: tx4:0 (60) = **60 BTC**

## 6. Summary

In this article, we implemented the simplified Bitcoin transaction system. We learned how to construct transactions by selecting UTXOs, calculating change, and generating transaction IDs. We examined two layers of transaction authorization: validating the signature itself and confirming that the signer controls the referenced UTXO. We also implemented `TransactionBuilder`, which encapsulates UTXO selection and change calculation behind a concise fluent API.

These components form the core of value transfer in this project. Together they can create, sign, and validate transactions. `Transaction` manages the data structure, `TransactionSigner` handles authorization checks, and `TransactionBuilder` provides a convenient construction interface. Each class has a distinct responsibility within the transaction system.
