# Building a Simple Bitcoin: Part 1

When we hear the word Bitcoin, concepts such as price volatility, mining, and blockchain may immediately come to mind. But if we truly want to understand what Bitcoin is, one of the best approaches is to build a simplified version ourselves. In the first article in this series, we will start with the fundamentals and gradually construct the core components of a Bitcoin system.

## Starting with a Question

In a traditional banking system, every transaction record is stored on the bank's central servers. If Alice wants to send Bob 100 units of currency, the bank subtracts 100 from Alice's account and adds 100 to Bob's account in its database. The process appears simple, but it depends on one assumption: we must trust the bank.

Bitcoin's innovation is that it enables people who do not trust one another to transfer value securely without relying on a central authority. Achieving this requires us to solve several essential problems: How can you prove that funds belong to you? How can the system prevent you from spending the same funds twice? How can every participant agree on the state of the ledger?

This article begins with the first question: how to prove ownership.

## Cryptographic Foundations: Digital Signatures

Bitcoin uses the Elliptic Curve Digital Signature Algorithm (ECDSA) to prove authorization over transaction funds. Its core mechanism relies on a key pair:

- **Private key**: A 256-bit random number known only to its owner and used to create signatures
- **Public key**: Derived from the private key through elliptic-curve operations, safe to share, and used to verify signatures

Digital signatures have several important properties:
- ✅ Creating a signature with a private key is straightforward
- ✅ Verifying a signature with a public key is straightforward
- ❌ Recovering the private key from a signature or public key is computationally infeasible
- ❌ A valid signature cannot be forged without the private key

**Signing and verification flow:**

```
Alice signs                  Bob/miner verifies
─────────────────            ─────────────────
Message "Transfer 50 BTC"   Receives: message + signature + Alice's public key
    ↓                             ↓
Calculate hash(message)      Calculate hash(message)
    ↓                             ↓
Sign with private key        Verify with public key
sign(hash, private key)      verify(hash, signature, public key)
    ↓                             ↓
Broadcast: message + signature + public key    ✓ Verification succeeds
```

**Implementation:**

```typescript
export class KeyPair {
  private _privateKey: string
  private _publicKey: string

  constructor(privateKey?: string) {
    if (privateKey) {
      this._privateKey = privateKey
      this._publicKey = Signature.getPublicKeyFromPrivate(privateKey)
    } else {
      const { privateKey: privKey, publicKey: pubKey } = Signature.generateKeyPair()
      this._privateKey = privKey
      this._publicKey = pubKey
    }
  }

  sign(data: string): string {
    return Signature.sign(data, this._privateKey)
  }

  verify(data: string, signature: string): boolean {
    return Signature.verify(data, signature, this._publicKey)
  }
}
```

In a transaction, the sender signs with a private key, while verifiers such as miners and nodes use the public key included in the transaction to validate the signature.

## From Public Key to Address

Once we have a key pair, the next question is: where should funds be sent? In Bitcoin, recipients generally use an address rather than a raw public key. An address is a string derived from the public key through a sequence of hashing and encoding operations.

There are several reasons for this design. Public keys are long and inconvenient to handle. Hashing also adds a layer of protection around the public key. Finally, Base58 encoding makes addresses easier for people to read by excluding visually ambiguous characters.

The address-generation process first hashes the public key with SHA-256, hashes that result with RIPEMD-160, and finally encodes it with Base58. A traditional Bitcoin address produced through the complete real-world process commonly begins with 1 and contains 26 to 35 characters.


```typescript
private generateAddress(): string {
  const sha256Hash = Hash.sha256(this.keyPair.publicKey)
  const ripemd160Hash = Hash.ripemd160(sha256Hash)
  const address = encodeBase58(ripemd160Hash)
  return address
}
```

Although the process may look complicated, every step serves a purpose. SHA-256 provides strong collision resistance, RIPEMD-160 shortens the result, and Base58 makes the address more human-friendly. Base58 excludes easily confused characters such as the digit 0 and letter O, as well as the digit 1 and letter I.

## UTXO: A Different Accounting Model

After explaining how ownership is proven, we need to consider another question: how do we record how much Bitcoin each participant controls?

Traditional banking systems use an account model in which every account has a balance. For example, Alice's account might contain 500 units and Bob's account 300 units. When Alice sends Bob 100 units, the system updates both account balances.

Bitcoin uses a fundamentally different approach called the UTXO model. UTXO stands for "Unspent Transaction Output." Although the term may initially sound unfamiliar, the underlying concept is intuitive.

Let us compare the two models:

**Account model (traditional banking):**

| Account | Balance before | Balance after | Description |
|--------|-----------|-----------|------|
| Alice  | 500 units | 400 units | Balance updated by -100 |
| Bob    | 300 units | 400 units | Balance updated by +100 |

**UTXO model (Bitcoin):**

Before the transaction:

| UTXO ID | Amount | Owner | Status |
|---------|------|--------|------|
| UTXO_1  | 300 units | Alice | Unspent |
| UTXO_2  | 200 units | Alice | Unspent |
| UTXO_3  | 300 units | Bob   | Unspent |

- Alice's effective balance: 300 + 200 = **500 units**
- Bob's effective balance: 300 = **300 units**

After Alice sends Bob 100 units:

| UTXO ID | Amount | Owner | Status | Description |
|---------|------|--------|------|------|
| UTXO_1  | 300 units | Alice | Spent | Consumed by the transaction |
| UTXO_2  | 200 units | Alice | Unspent | Not used |
| UTXO_3  | 300 units | Bob   | Unspent | Not used |
| UTXO_4  | 100 units | Bob   | Unspent | Newly created |
| UTXO_5  | 200 units | Alice | Unspent | Change |

- Alice's effective balance: 200 + 200 = **400 units**
- Bob's effective balance: 300 + 100 = **400 units**

We can think of UTXOs as banknotes with different denominations. Suppose Alice wants to send Bob 100 units and holds a 150-unit "banknote" represented by one UTXO. She cannot tear off part of it. Instead, she spends the entire 150-unit UTXO and creates two new outputs: 100 units for Bob and 50 units in change for herself.

Consider a complete example:

**Initial state:**

| UTXO | Amount | Owner | Status |
|------|------|--------|------|
| TX_0:0 | 150 BTC | Alice | Unspent |
| TX_1:0 | 200 BTC | Carol | Unspent |

**Alice creates transaction TX_2:**

Transaction input:

| Input index | Referenced UTXO | Amount | Signature | Public key |
|---------|----------|------|------|------|
| 0 | TX_0:0 | 150 BTC | Alice's signature | Alice's public key |

Transaction outputs:

| Output index | Amount | Recipient address | Description |
|---------|------|---------|------|
| 0 | 100 BTC | Bob's address | Payment |
| 1 | 50 BTC | Alice's address | Change |

- Total input amount: 150 BTC
- Total output amount: 150 BTC
- Mining fee: 0 BTC
- A verifier uses Alice's public key to validate Alice's signature

**State after confirmation:**

| UTXO | Amount | Owner | Status | Description |
|------|------|--------|------|------|
| TX_0:0 | 150 BTC | Alice | Spent | Consumed by TX_2 |
| TX_1:0 | 200 BTC | Carol | Unspent | Not used |
| TX_2:0 | 100 BTC | Bob | Unspent | Newly created |
| TX_2:1 | 50 BTC | Alice | Unspent | Change |

**Balance summary:**
- Alice: 50 BTC (TX_2:1)
- Bob: 100 BTC (TX_2:0)
- Carol: 200 BTC (TX_1:0)

This model offers several advantages. First, each UTXO can be spent only once, which makes double-spend detection straightforward: the system only needs to check whether a UTXO has already been consumed. Second, UTXOs are independent, so transactions can be processed in parallel as long as they do not reference the same outputs. Finally, the UTXO model can improve privacy because a new address may be used for each transaction.

## Transaction Structure

In the UTXO model, every transaction contains two main components: inputs and outputs. Inputs reference existing UTXOs and provide evidence that the spender is authorized to use them. Outputs create new UTXOs with specified amounts and recipient addresses.

A transaction input contains several essential pieces of information: the referenced transaction ID, output index, signature, and public key. The transaction ID and output index locate a specific UTXO. The signature demonstrates authorization to spend it, while the public key allows miners and nodes to verify that signature.

During validation, the system uses the public key supplied by the input and the recipient address of the referenced UTXO to verify two conditions. First, the address derived from the public key must match the UTXO recipient address. Second, the signature must have been created with the corresponding private key. The input is valid only when both conditions hold.

Real Bitcoin uses a more sophisticated scripting system called Script. Signatures and public keys are placed in the `scriptSig` unlocking script rather than stored directly as they are in this simplified model. Bitcoin Script is a stack-based language that supports flexible conditions such as multisignature authorization and time locks. This implementation stores the signature and public key directly to make the core concepts easier to understand.

```typescript
export class TxInput {
  constructor(
    public readonly txId: string,
    public readonly outputIndex: number,
    public signature: string = '',
    public publicKey: string = ''
  ) {
    if (!txId || txId.trim().length === 0) {
      throw new Error('Transaction ID cannot be empty')
    }
    if (outputIndex < 0) {
      throw new Error('Output index cannot be negative')
    }
  }

  getUTXOKey(): string {
    return `${this.txId}:${this.outputIndex}`
  }
}
```

This class has a deliberately simple design. Each input explicitly identifies a UTXO by transaction ID and output index. The signature and public key may not exist when the input is first created because the complete transaction content must be assembled before it can be signed, so both fields default to empty strings.

Transaction outputs are even simpler and require only an amount and recipient address. The amount must be greater than zero and the address cannot be empty. These basic validation rules are enforced by the constructor.

```typescript
export class TxOutput {
  constructor(
    public readonly amount: number,
    public readonly address: string
  ) {
    if (amount <= 0) {
      throw new Error('Output amount must be greater than 0')
    }
    if (!address || address.trim().length === 0) {
      throw new Error('Recipient address cannot be empty')
    }
  }
}
```

A complete transaction may contain multiple inputs and outputs. The total value of all inputs must be greater than or equal to the total value of all outputs. Any difference becomes the mining fee paid to the miner who includes the transaction in a block.

Consider a more complex example in which Alice owns several UTXOs and wants to send Bob 180 BTC:

**Alice's UTXOs:**

| UTXO | Amount | Owner |
|------|------|--------|
| TX_A:0 | 100 BTC | Alice |
| TX_B:0 | 50 BTC | Alice |
| TX_C:0 | 60 BTC | Alice |

**Alice creates transaction TX_D to send Bob 180 BTC:**

Transaction inputs:

| Input index | Referenced UTXO | Amount | Signature | Public key |
|---------|----------|------|------|------|
| 0 | TX_A:0 | 100 BTC | Alice's signature | Alice's public key |
| 1 | TX_B:0 | 50 BTC | Alice's signature | Alice's public key |
| 2 | TX_C:0 | 60 BTC | Alice's signature | Alice's public key |

Transaction outputs:

| Output index | Amount | Recipient address | Description |
|---------|------|---------|------|
| 0 | 180 BTC | Bob | Payment |
| 1 | 27 BTC | Alice | Change |

**Transaction summary:**

| Item | Amount |
|------|------|
| Total inputs | 210 BTC |
| Total outputs | 207 BTC |
| Mining fee | 3 BTC |

**Transaction validation:**

- Every input UTXO exists
- Every signature is valid, with each input containing the signature and public key needed for verification
- Total inputs (210) ≥ total outputs (207)
- Mining fee = 210 - 207 = 3 BTC

In this example, Alice uses three UTXOs totaling 210 BTC as inputs. She creates two outputs: 180 BTC for Bob and 27 BTC in change for herself. The remaining 3 BTC becomes the mining fee.

## Managing the UTXO Set

The system needs a place to store every currently spendable UTXO. This is the role of the UTXO set. Whenever a new transaction is confirmed, the system removes the outputs it spends and adds the outputs it creates.

The UTXO set uses a `Map` in which each key combines a transaction ID and output index, and each value is the transaction output itself. This design provides efficient O(1) average-time lookups.

```typescript
export class UTXOSet {
  private utxos: Map<string, TxOutput>

  add(txId: string, outputIndex: number, output: TxOutput): void {
    const key = this.makeKey(txId, outputIndex)
    this.utxos.set(key, output)
  }

  remove(txId: string, outputIndex: number): boolean {
    const key = this.makeKey(txId, outputIndex)
    return this.utxos.delete(key)
  }

  private makeKey(txId: string, outputIndex: number): string {
    return `${txId}:${outputIndex}`
  }
}
```

The UTXO set also provides useful operations such as finding the outputs associated with an address and calculating that address's total balance. These operations traverse the complete set. This simple approach is suitable for the educational simulator, although production Bitcoin software uses more sophisticated storage and indexing strategies at scale.

Finding every UTXO associated with an address is a key step in transaction construction. When Alice wants to pay Bob, the system finds Alice's available UTXOs and selects enough of them to cover the transfer amount.

```typescript
getUTXOsByAddress(address: string): Array<{
  txId: string
  outputIndex: number
  output: TxOutput
}> {
  const result: Array<{
    txId: string
    outputIndex: number
    output: TxOutput
  }> = []

  for (const [key, output] of this.utxos.entries()) {
    if (output.address === address) {
      const [txId, outputIndex] = this.parseKey(key)
      result.push({ txId, outputIndex, output })
    }
  }

  return result
}
```

This method scans all UTXOs and selects those belonging to the requested address. Each result includes both the output and its location—the transaction ID and output index—so it can be used directly when constructing transaction inputs.

The following example demonstrates how the UTXO set changes over time:

```typescript
// Initialize the UTXO set
const utxoSet = new UTXOSet()

// Genesis transaction: give Alice 100 BTC
utxoSet.add('tx0', 0, new TxOutput(100, 'AliceAddress'))

console.log('Alice balance:', utxoSet.getBalance('AliceAddress'))
// Output: 100

// Alice sends Bob 60 BTC
// Transaction tx1 references tx0:0 and creates 60 for Bob plus 40 in change for Alice
utxoSet.remove('tx0', 0)  // Spend the old UTXO
utxoSet.add('tx1', 0, new TxOutput(60, 'BobAddress'))      // Bob receives payment
utxoSet.add('tx1', 1, new TxOutput(40, 'AliceAddress'))    // Alice receives change

console.log('Alice balance:', utxoSet.getBalance('AliceAddress'))  // 40
console.log('Bob balance:', utxoSet.getBalance('BobAddress'))      // 60

// Inspect Alice's UTXOs
const aliceUTXOs = utxoSet.getUTXOsByAddress('AliceAddress')
console.log("Alice's UTXOs:", aliceUTXOs)
// Output: [{ txId: 'tx1', outputIndex: 1, output: { amount: 40, address: 'AliceAddress' }}]
```

This example shows how the UTXO set changes as transactions are processed. Each transaction consumes existing outputs and creates new ones, allowing the system to track the funds controlled by every participant.

## Hashes: Fingerprints for Digital Data

Hash functions are one of Bitcoin's core building blocks. They have several important properties:
- **Fixed-length output**: The output length remains constant regardless of the input size
- **One-way operation**: The original data cannot feasibly be recovered from its hash
- **Avalanche effect**: A small input change produces a completely different output

**Implementation:**

```typescript
export class Hash {
  static sha256(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  static doubleSha256(data: string): string {
    const firstHash = this.sha256(data)
    return this.sha256(firstHash)
  }

  static ripemd160(data: string): string {
    return CryptoJS.RIPEMD160(data).toString()
  }
}
```

**Hash algorithms used in Bitcoin:**
- **SHA-256**: Produces a 256-bit hash used for transaction identifiers, mining, and block linking
- **Double SHA-256**: Applies SHA-256 twice and is used throughout the Bitcoin protocol
- **RIPEMD-160**: Produces a shorter 160-bit hash used in address construction

**Applications of hashing:**

| Use case | Process |
|------|------|
| Transaction ID | Transaction content → SHA-256 → unique identifier |
| Address generation | Public key → SHA-256 → RIPEMD-160 → Base58 encoding |
| Proof of work | Block header + nonce → SHA-256 → difficulty target satisfied |
| Block linking | Each block contains the previous block's hash |

**Avalanche-effect example:**

```
"Hello World"  → a591a6d40bf420404a011733cfb7b190...
"Hello World!" → 7f83b1657ff1fc53b92dc18148a1d65d... (completely different)
"hello world"  → b94d27b9934d3e08a52e52d7da7dabfa... (completely different)
```

A tiny change in the input produces a completely different output, making data tampering immediately apparent.

## Wallets: Bringing the Components Together

With these foundational components in place, we can build a wallet. A wallet is the primary interface through which a user interacts with the Bitcoin system. It contains a key pair, derives an address, and signs transaction data.

```typescript
export class Wallet {
  private keyPair: KeyPair
  private _address: string

  constructor(privateKey?: string) {
    this.keyPair = new KeyPair(privateKey)
    this._address = this.generateAddress()
  }

  get publicKey(): string {
    return this.keyPair.publicKey
  }

  get address(): string {
    return this._address
  }

  sign(data: string): string {
    return this.keyPair.sign(data)
  }
}
```

Wallet creation is straightforward. If a private key is provided, the wallet is restored from that key; otherwise, it generates a new key pair. In both cases, the wallet derives the corresponding address.

The wallet provides a signing method, which is essential to transaction creation. When a user wants to spend a UTXO, the transaction must be signed with the appropriate private key to demonstrate authorization. Other participants can verify that signature with the public key provided by the transaction.

The wallet also supports export and import. A user can back up the private key and later restore the wallet elsewhere. This is critical because losing the private key permanently removes the ability to spend funds controlled by its corresponding address.

The following example demonstrates a complete wallet workflow:

```typescript
// 1. Create wallets
const alice = new Wallet()
const bob = new Wallet()

console.log("Alice's address:", alice.address)
// Output: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
console.log("Bob's address:", bob.address)

// 2. Alice signs a transaction message
const message = 'Transfer 50 BTC to Bob'
const signature = alice.sign(message)
console.log("Alice's signature:", signature)
// Output: 304502210089ab3c...

// 3. Alice sends the message, signature, and public key together
const transaction = {
  message: message,
  signature: signature,
  publicKey: alice.publicKey  // Other participants need this for verification
}

// 4. Bob, or any other participant, verifies the signature
// The verifier must use the signer's public key
// Use Signature.verify() rather than wallet.verify() in this scenario
import { Signature } from './crypto/signature'

const isValid = Signature.verify(
  transaction.message,
  transaction.signature,
  transaction.publicKey  // Use Alice's public key
)
console.log('Is the signature valid?', isValid)  // true

// 5. Alice can also verify her own signature for testing
const selfVerify = alice.verify(message, signature)
console.log('Self-verification:', selfVerify)  // true

// 6. Export wallet data; handle it carefully because it contains the private key
const walletData = alice.export()
console.log('Wallet data:', walletData)
// {
//   privateKey: 'e9873d...',
//   publicKey: '04a34b...',
//   address: '1A1zP1...'
// }

// 7. Restore a wallet from the private key
const recovered = Wallet.fromPrivateKey(walletData.privateKey)
console.log('Recovered address:', recovered.address)  // Matches the original address
```

The complete system workflow can be understood as follows:

**Bitcoin system workflow:**

```
1. Create a wallet
   Wallet() → generate a key pair → derive an address

2. Receive Bitcoin
   Receive a transfer → create a new UTXO → add it to the UTXO set

3. Initiate a transfer
   Select UTXOs → build a transaction → sign the transaction → broadcast it to the network

4. Confirm the transaction
   Miner includes the transaction → performs proof of work → adds the block to the blockchain

5. Update state
   Mark old UTXOs as spent → add new UTXOs to the set
```

## Summary

This article implemented the foundational layer of the simplified Bitcoin system, including:

**Core components:**
- ✅ **Key pairs and signatures**: ECDSA elliptic-curve cryptography
- ✅ **Address generation**: Public key → SHA-256 → RIPEMD-160 → Base58
- ✅ **UTXO model**: An accounting model based on unspent transaction outputs
- ✅ **Transaction structure**: Inputs (UTXO references + signatures) and outputs (amounts + addresses)
- ✅ **UTXO set**: Efficient management of currently spendable outputs
- ✅ **Wallet**: Key management, address derivation, and transaction signing

**Current capabilities:**
Create a wallet → derive an address → build a transaction → sign and verify it

**Next step:**
Part 2 will implement the blockchain, proof of work (mining), and the basic consensus mechanism.

Bitcoin's design combines cryptography, data structures, and economic incentives to create a decentralized electronic cash system. Implementing a simplified version helps us understand both the underlying principles and the elegance of the design.

