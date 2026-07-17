# Real Bitcoin vs. Our Simplified Implementation

## Transaction Structure Comparison

### Real Bitcoin Transaction

```javascript
// Real Bitcoin transaction
{
  version: 1,
  inputs: [
    {
      previousTxHash: "abc123...",       // Previous transaction hash
      previousOutputIndex: 0,             // Referenced output
      scriptSig: "<signature> <publicKey>", // ⭐ Unlocking script containing the signature and public key
      sequence: 0xffffffff
    }
  ],
  outputs: [
    {
      value: 5000000000,  // Amount in satoshis; 1 BTC = 100,000,000 satoshis
      scriptPubKey: "OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG"  // ⭐ Locking script
    }
  ],
  lockTime: 0
}
```

### Our Simplified Implementation

```typescript
// Our simplified implementation
{
  inputs: [
    {
      txId: "abc123...",         // Transaction ID
      outputIndex: 0,             // Output index
      signature: "sig...",        // ⭐ Store the signature directly
      publicKey: "pub..."         // ⭐ Store the public key directly
    }
  ],
  outputs: [
    {
      amount: 50,                 // Amount in BTC
      address: "1A1zP1..."        // ⭐ Store the recipient address directly
    }
  ],
  timestamp: 1234567890
}
```

## Key Differences

### 1. Script System

**Real Bitcoin**:
- Uses a stack-based scripting language
- `scriptSig` (unlocking script): Provides the signature and public key
- `scriptPubKey` (locking script): Defines how validation is performed
- Scripts provide flexibility for complex functionality such as multisignature and time locks

```
Real Bitcoin validation:
Execute scriptSig + scriptPubKey
<signature> <publicKey> OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

**Our implementation**:
- Simplifies the structure by storing signatures and public keys directly
- Hard-codes validation logic in the application
- Does not support complex transaction types

```typescript
// Our validation
Signature.verify(txData, signature, publicKey)
// Verify that the address corresponding to the public key matches
```

### 2. Signed Content

**Real Bitcoin**:
- Does not sign the complete transaction object directly
- Signs a specific form of the transaction with `scriptSig` removed or replaced as required
- Uses SIGHASH types to specify the signature scope

```
Signing process:
1. Build the transaction with an empty or temporary scriptSig
2. Serialize the transaction
3. Modify the content to be signed according to the SIGHASH type
4. Apply double SHA-256 to the modified content
5. Sign the hash with ECDSA
6. Place the signature and SIGHASH type in scriptSig
```

**Our implementation**:
- Simplifies signing by signing the complete transaction JSON string
- Does not account for SIGHASH types

```typescript
// Our signing process
const txData = JSON.stringify(transaction)
const signature = wallet.sign(txData)
```

### 3. Relationship Between Public Keys and Addresses

**Real Bitcoin**:
- A transaction output contains `scriptPubKey`, which includes the public key hash (`pubKeyHash`)
- A transaction input contains `scriptSig`, which includes the complete public key
- Validation checks: HASH160(publicKey) == pubKeyHash

```
UTXO locking:
scriptPubKey: "OP_DUP OP_HASH160 <Alice's public key hash> OP_EQUALVERIFY OP_CHECKSIG"

When spending:
scriptSig: "<Alice's signature> <Alice's public key>"

Validation:
1. Check HASH160(Alice's public key) == Alice's public key hash ✓
2. Check signature validity ✓
```

**Our implementation**:
- Stores the address directly in the output; the address is a Base58 encoding of the public key hash
- Stores the public key directly in the input
- Validation checks: Base58(RIPEMD160(SHA256(publicKey))) == address

### 4. Transaction ID Calculation

**Real Bitcoin**:
- Transaction ID = SHA256(SHA256(serialized transaction data))
- Includes version, inputs, outputs, and lockTime
- A change to scriptSig changes the transaction ID

**Our implementation**:
- Transaction ID = SHA256(JSON string of the transaction content)
- Uses a simplified serialization format

## Real Bitcoin Transaction Example

### P2PKH (Pay-to-Public-Key-Hash) Transaction

This is the most common Bitcoin transaction type:

```
Alice sends Bob 1 BTC:

inputs: [
  {
    previousTxHash: "7a9f2c...",
    previousOutputIndex: 0,
    scriptSig: "
      304402203f... (Alice's signature)
      03ab12cd... (Alice's public key)
    "
  }
]

outputs: [
  {
    value: 100000000,  // 1 BTC
    scriptPubKey: "
      OP_DUP 
      OP_HASH160 
      89abcdef... (Bob's public key hash)
      OP_EQUALVERIFY 
      OP_CHECKSIG
    "
  }
]
```

### Detailed Validation Process

```
Stack execution process:

1. The stack is initially empty
   Stack: []

2. Execute scriptSig: <signature> <publicKey>
   Stack: [signature, publicKey]

3. OP_DUP: Duplicate the top stack item
   Stack: [signature, publicKey, publicKey]

4. OP_HASH160: Apply SHA256 + RIPEMD160 to the top stack item
   Stack: [signature, publicKey, hash(publicKey)]

5. <pubKeyHash>: Push the expected public key hash
   Stack: [signature, publicKey, hash(publicKey), expectedHash]

6. OP_EQUALVERIFY: Compare the top two stack items
   If they are equal, pop both items; otherwise fail
   Stack: [signature, publicKey]

7. OP_CHECKSIG: Verify the signature
   Use publicKey to verify the transaction signature
   Push true if valid; otherwise push false
   Stack: [true]

8. Validation succeeds if the top stack value is true ✓
```

## Why Simplify?

Our implementation makes these simplifications for educational purposes:

### Advantages:
1. **Easier to understand**: Stores public keys and signatures directly, making the logic clear
2. **Concise code**: Does not require a complete script engine
3. **Focus on the core**: Concentrates on concepts such as the UTXO model and signature validation
4. **Rapid implementation**: Supports quick prototyping and validation of ideas

### Disadvantages:
1. **No advanced functionality**: Does not support multisignature, time locks, hash locks, and similar features
2. **Limited flexibility**: Cannot implement complex payment conditions
3. **Incompatible with real Bitcoin**: Cannot interact with the Bitcoin network

## How to Upgrade Toward Real Bitcoin

Implementing full Bitcoin compatibility would require:

1. **Implement a script engine**
   ```typescript
   class Script {
     execute(scriptSig: string, scriptPubKey: string): boolean
     // Implement opcodes such as OP_DUP, OP_HASH160, and OP_CHECKSIG
   }
   ```

2. **Improve the transaction structure**
   ```typescript
   interface TxInput {
     previousTxHash: string
     previousOutputIndex: number
     scriptSig: string  // Script rather than a direct signature
     sequence: number
   }
   
   interface TxOutput {
     value: number  // Satoshis
     scriptPubKey: string  // Locking script
   }
   ```

3. **Implement SIGHASH types**
   - SIGHASH_ALL: Sign all inputs and outputs
   - SIGHASH_NONE: Sign only the inputs
   - SIGHASH_SINGLE: Sign the corresponding input and output
   - SIGHASH_ANYONECANPAY: Allow other participants to add inputs

4. **Support multiple transaction types**
   - P2PKH (Pay-to-Public-Key-Hash)
   - P2SH (Pay-to-Script-Hash)
   - P2WPKH (Pay-to-Witness-Public-Key-Hash) - SegWit
   - P2WSH (Pay-to-Witness-Script-Hash) - SegWit
   - Taproot (P2TR)

5. **Implement Segregated Witness (SegWit)**
   - Move signature data to a separate witness field
   - Address transaction malleability
   - Increase transaction capacity

## References

- [Bitcoin Script](https://en.bitcoin.it/wiki/Script)
- [Transaction Structure](https://developer.bitcoin.org/reference/transactions.html)
- [Mastering Bitcoin - Chapter 6: Transactions](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch06.asciidoc)
- [BIP 141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)

## Summary

Although our implementation simplifies Bitcoin's script system, it preserves the core security mechanisms:

✅ **Preserved core concepts**:
- UTXO model
- Digital signature validation
- Public-key-to-address mapping
- Ownership validation

❌ **Simplified components**:
- Script system → stores signatures and public keys directly
- Complex transaction types → supports only simple transfers
- Flexible validation logic → uses a hard-coded validation process

These simplifications allow us to focus on understanding Bitcoin's core concepts without being distracted by implementation details.

