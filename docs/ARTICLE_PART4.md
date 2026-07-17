# Building a Simple Bitcoin: Part 4 - The Script System

In the previous articles, we implemented Bitcoin's core components: cryptographic foundations, the UTXO model, the transaction system, the blockchain, and the mining mechanism. We will now explore one of Bitcoin's most powerful but often overlooked features: the **script system**.

## Why Is a Script System Necessary?

In our previous implementation, transaction validation was "hard-coded": verify that the signature is correct and that the public key matches. Real Bitcoin is far more flexible:

```
Traditional validation: signature + public key → pass/fail

Script validation: unlocking script + locking script → execute → pass if the top stack value is true
```

The script system allows Bitcoin to support:

1. **P2PKH (Pay-to-Public-Key-Hash)** - The most common transaction type
2. **P2SH (Pay-to-Script-Hash)** - Transactions that support complex scripts
3. **Multisignature** - Requires signatures from multiple participants to spend
4. **Time locks** - Allows spending only after a specified time
5. **Hash locks** - Requires a specific preimage to spend, forming the basis of atomic swaps

## Understanding Bitcoin Script

### Stack-Based Execution Model

Bitcoin Script is a simple, stack-based programming language. It is not Turing-complete: it has no loops and executes sequentially. This is an intentional design choice that guarantees script termination and prevents malicious code from running indefinitely.

```
Stack operation examples:

          OP_DUP (duplicate the top item)
[A]  →  [A, A]

          OP_ADD (pop two items and push their sum)
[3, 5]  →  [8]

          OP_EQUALVERIFY (pop two items; continue if equal, otherwise fail)
[A, A]  →  []  (continue execution)
[A, B]  →  Script Failed!
```

### Locking and Unlocking Scripts

Every transaction output has a **locking script (scriptPubKey)** that defines its spending conditions.
To spend the output, an input must provide an **unlocking script (scriptSig)**.

During validation, the two scripts are executed together:

```
scriptSig + scriptPubKey → execute → validation succeeds if the top stack value is true
```

## Opcode Design

Let us implement the core opcodes:

```typescript
// src/script/OpCodes.ts
export enum OpCode {
  // Constant opcodes
  OP_0 = 0x00,              // Push an empty byte array
  OP_1 = 0x51,              // Push the number 1
  OP_2 = 0x52,              // Push the number 2
  // ... OP_3 through OP_16
  
  // Stack operations
  OP_DUP = 0x76,            // Duplicate the top item
  OP_DROP = 0x75,           // Remove the top item
  OP_SWAP = 0x7c,           // Swap the top two items
  
  // Cryptographic operations
  OP_HASH160 = 0xa9,        // SHA256 + RIPEMD160
  OP_CHECKSIG = 0xac,       // Verify a signature
  OP_CHECKMULTISIG = 0xae,  // Verify multiple signatures
  
  // Comparison operations
  OP_EQUAL = 0x87,          // Check equality
  OP_EQUALVERIFY = 0x88,    // Check equality and verify
  OP_VERIFY = 0x69,         // Fail if the top stack value is false
}
```

## Execution Stack Implementation

The stack is the core data structure used during script execution:

```typescript
// src/script/Stack.ts
export class Stack {
  private items: string[] = []  // Hexadecimal strings
  private maxSize: number = 1000  // Bitcoin limit

  push(item: string): void {
    if (this.items.length >= this.maxSize) {
      throw new Error('Stack overflow')
    }
    this.items.push(item)
  }

  pop(): string {
    if (this.items.length === 0) {
      throw new Error('Stack underflow')
    }
    return this.items.pop()!
  }

  dup(): void {
    this.push(this.peek())
  }

  swap(): void {
    const a = this.pop()
    const b = this.pop()
    this.push(a)
    this.push(b)
  }
}
```

### Number Encoding

Bitcoin Script uses a specialized number encoding:

```typescript
export const StackUtils = {
  // Encode a number as signed little-endian bytes
  encodeNumber(num: number): string {
    if (num === 0) return ''
    
    const negative = num < 0
    let absNum = Math.abs(num)
    const bytes: number[] = []
    
    while (absNum > 0) {
      bytes.push(absNum & 0xff)
      absNum >>= 8
    }
    
    // Handle the sign bit
    if (bytes[bytes.length - 1] & 0x80) {
      bytes.push(negative ? 0x80 : 0x00)
    } else if (negative) {
      bytes[bytes.length - 1] |= 0x80
    }
    
    return Buffer.from(bytes).toString('hex')
  },

  // Determine whether the value is true
  isTrue(element: string): boolean {
    if (element === '') return false
    // All-zero values and negative zero are false
    const bytes = Buffer.from(element, 'hex')
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) {
        if (i === bytes.length - 1 && bytes[i] === 0x80) {
          return false  // Negative zero
        }
        return true
      }
    }
    return false
  }
}
```

## Script Execution Engine

The core execution engine processes opcodes one at a time:

```typescript
// src/script/Script.ts
export class Script {
  private elements: ScriptElement[] = []

  execute(context: ScriptContext = {}): ScriptResult {
    const stack = new Stack()
    const altStack = new Stack()
    let opCount = 0

    for (const element of this.elements) {
      // Push data directly onto the stack
      if (element.type === 'data') {
        stack.push(element.data)
        continue
      }

      // Execute an opcode
      const opcode = element.code
      opCount++
      
      if (opCount > 201) {  // Bitcoin limit
        throw new Error('Maximum operation count exceeded')
      }

      this.executeOpCode(opcode, stack, altStack, context)
    }

    // Success requires a nonempty stack with a true top value
    return {
      success: !stack.isEmpty() && StackUtils.isTrue(stack.peek()),
      stack: stack.getItems(),
      opCount
    }
  }
}
```

### Implementing Key Opcodes

```typescript
private executeOpCode(opcode: OpCode, stack: Stack, ...): void {
  switch (opcode) {
    case OpCode.OP_DUP:
      stack.dup()
      break

    case OpCode.OP_HASH160: {
      const data = stack.pop()
      const hash = Hash.ripemd160(Hash.sha256(data))
      stack.push(hash)
      break
    }

    case OpCode.OP_EQUALVERIFY: {
      const b = stack.pop()
      const a = stack.pop()
      if (a !== b) {
        throw new Error('OP_EQUALVERIFY failed')
      }
      break
    }

    case OpCode.OP_CHECKSIG: {
      const publicKey = stack.pop()
      const signature = stack.pop()
      
      const isValid = Signature.verify(
        context.signatureHash,
        signature,
        publicKey
      )
      stack.push(StackUtils.encodeBool(isValid))
      break
    }
    
    // ... Other opcodes
  }
}
```

## P2PKH: The Most Common Transaction Type

P2PKH (Pay-to-Public-Key-Hash) is Bitcoin's most common transaction type. Let us examine how it works in detail.

### Locking Script

```
OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
```

This script states: "To spend these funds, you must provide a public key whose hash equals this value and a signature created with the corresponding private key."

### Unlocking Script

```
<signature> <publicKey>
```

### Execution Process

```
Initial stack: []

1. Push signature
   Stack: [sig]

2. Push publicKey
   Stack: [sig, pubKey]

3. OP_DUP - Duplicate the top item
   Stack: [sig, pubKey, pubKey]

4. OP_HASH160 - Hash the top item
   Stack: [sig, pubKey, hash(pubKey)]

5. Push pubKeyHash from the locking script
   Stack: [sig, pubKey, hash(pubKey), pubKeyHash]

6. OP_EQUALVERIFY - Compare and verify
   Stack: [sig, pubKey]  (continue if equal; otherwise fail)

7. OP_CHECKSIG - Verify the signature
   Stack: [true/false]

Final result: Validation succeeds when the top stack value is true
```

### Implementation

```typescript
// src/script/ScriptBuilder.ts
export class ScriptBuilder {
  // Build a P2PKH locking script
  static buildP2PKHLockingScript(pubKeyHash: string): Script {
    return new Script()
      .addOpCode(OpCode.OP_DUP)
      .addOpCode(OpCode.OP_HASH160)
      .addData(pubKeyHash)
      .addOpCode(OpCode.OP_EQUALVERIFY)
      .addOpCode(OpCode.OP_CHECKSIG)
  }

  // Build a P2PKH unlocking script
  static buildP2PKHUnlockingScript(
    signature: string,
    publicKey: string
  ): Script {
    return new Script()
      .addData(signature)
      .addData(publicKey)
  }
}
```

## Multisignature: A Major Security Improvement

Multisignature (MultiSig) supports an m-of-n signature scheme: m signatures corresponding to n public keys are required to spend the funds.

### 2-of-3 Multisignature Example

This is commonly used for corporate treasury management, where any two of the CEO, CFO, and COO must sign before funds can be spent.

**Redeem Script**:
```
OP_2 <pubKey1> <pubKey2> <pubKey3> OP_3 OP_CHECKMULTISIG
```

**Unlocking script**:
```
OP_0 <sig1> <sig2>
```

> Note: `OP_0` is required because of a well-known `OP_CHECKMULTISIG` bug that pops one extra element. The bug has been preserved for backward compatibility.

### Implementation

```typescript
// Build a multisignature script
static buildMultiSigScript(m: number, publicKeys: string[]): Script {
  const n = publicKeys.length
  const script = new Script()
  
  // m
  script.addOpCode(this.numberToOpCode(m))
  
  // All public keys
  for (const pubKey of publicKeys) {
    script.addData(pubKey)
  }
  
  // n
  script.addOpCode(this.numberToOpCode(n))
  
  // OP_CHECKMULTISIG
  script.addOpCode(OpCode.OP_CHECKMULTISIG)
  
  return script
}

// Multisignature unlocking script
static buildMultiSigUnlockingScript(signatures: string[]): Script {
  const script = new Script()
  
  // Bug workaround: a dummy element is required
  script.addOpCode(OpCode.OP_0)
  
  for (const sig of signatures) {
    script.addData(sig)
  }
  
  return script
}
```

### OP_CHECKMULTISIG Implementation

```typescript
case OpCode.OP_CHECKMULTISIG: {
  // Get n and the public keys
  const n = StackUtils.decodeNumber(stack.pop())
  const publicKeys: string[] = []
  for (let i = 0; i < n; i++) {
    publicKeys.push(stack.pop())
  }

  // Get m and the signatures
  const m = StackUtils.decodeNumber(stack.pop())
  const signatures: string[] = []
  for (let i = 0; i < m; i++) {
    signatures.push(stack.pop())
  }

  // CHECKMULTISIG bug: pop one extra element
  stack.pop()

  // Match signatures and public keys in order
  let sigIndex = 0
  let keyIndex = 0
  while (sigIndex < m && keyIndex < n) {
    const isValid = Signature.verify(
      context.signatureHash,
      signatures[sigIndex],
      publicKeys[keyIndex]
    )
    if (isValid) {
      sigIndex++
    }
    keyIndex++
  }

  const success = sigIndex === m
  stack.push(StackUtils.encodeBool(success))
  break
}
```

## P2SH: A Script for Scripts

P2SH (Pay-to-Script-Hash) is an elegant solution: instead of placing the complete locking script in an output, it places the script hash there.

### Why Is P2SH Necessary?

1. **Shorter addresses** - Address length remains fixed regardless of script complexity
2. **Privacy** - The locking conditions remain unknown until the output is spent
3. **Fee transfer** - The spender bears the cost of the complex script

### P2SH Locking Script

```
OP_HASH160 <scriptHash> OP_EQUAL
```

### P2SH Unlocking Script

```
<data...> <redeemScript>
```

### Validation Process

1. First verify `hash(redeemScript) == scriptHash`
2. Then execute `<data...> + redeemScript`

### Implementation

```typescript
// Build a P2SH locking script
static buildP2SHLockingScript(scriptHash: string): Script {
  return new Script()
    .addOpCode(OpCode.OP_HASH160)
    .addData(scriptHash)
    .addOpCode(OpCode.OP_EQUAL)
}

// Generate P2SH from a redeem script
static buildP2SHFromRedeemScript(redeemScript: Script): Script {
  const scriptHash = ScriptBuilder.hash160(redeemScript.toHex())
  return ScriptBuilder.buildP2SHLockingScript(scriptHash)
}

// P2SH multisignature, the most common practical use
static buildP2SHMultiSig(m: number, publicKeys: string[]): {
  lockingScript: Script
  redeemScript: Script
} {
  const redeemScript = ScriptBuilder.buildMultiSigScript(m, publicKeys)
  const lockingScript = ScriptBuilder.buildP2SHFromRedeemScript(redeemScript)
  return { lockingScript, redeemScript }
}
```

## Updating the Transaction Structure

We now need to update `TxInput` and `TxOutput` to support scripts:

```typescript
// TxInput.ts
export class TxInput {
  private _scriptSig?: Script
  
  // Backward-compatible signature setter
  setSignature(signature: string, publicKey: string): void {
    this.signature = signature
    this.publicKey = publicKey
    // Update scriptSig at the same time
    this._scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature, publicKey
    )
  }
  
  // Set the script directly
  setScriptSig(scriptSig: Script): void {
    this._scriptSig = scriptSig
  }
  
  getScriptSig(): Script {
    if (this._scriptSig) return this._scriptSig
    // Build from the legacy fields
    return ScriptBuilder.buildP2PKHUnlockingScript(
      this.signature, this.publicKey
    )
  }
}

// TxOutput.ts
export class TxOutput {
  private _scriptPubKey?: Script
  
  // Factory method for an output with a script
  static createWithScript(amount: number, scriptPubKey: Script): TxOutput {
    const output = new TxOutput(amount, 'script:...')
    output._scriptPubKey = scriptPubKey
    return output
  }
  
  getScriptPubKey(): Script {
    if (this._scriptPubKey) return this._scriptPubKey
    // Generate a P2PKH script from the address
    return ScriptBuilder.buildP2PKHLockingScript(this.address)
  }
  
  getScriptType(): string {
    return ScriptBuilder.getScriptType(this.getScriptPubKey())
  }
}
```

## Script Type Recognition

```typescript
static getScriptType(script: Script): string {
  if (ScriptBuilder.isP2PKH(script)) return 'P2PKH'
  if (ScriptBuilder.isP2SH(script)) return 'P2SH'
  if (ScriptBuilder.isP2PK(script)) return 'P2PK'
  if (ScriptBuilder.isMultiSig(script)) return 'MultiSig'
  if (ScriptBuilder.isOpReturn(script)) return 'OP_RETURN'
  return 'Unknown'
}

static isP2PKH(script: Script): boolean {
  const elements = script.getElements()
  return (
    elements.length === 5 &&
    elements[0].code === OpCode.OP_DUP &&
    elements[1].code === OpCode.OP_HASH160 &&
    elements[2].type === 'data' &&
    elements[3].code === OpCode.OP_EQUALVERIFY &&
    elements[4].code === OpCode.OP_CHECKSIG
  )
}
```

## Complete Validation Example

Consider a complete P2PKH validation:

```typescript
// Generate a key pair
const { privateKey, publicKey } = Signature.generateKeyPair()
const pubKeyHash = ScriptBuilder.hash160(publicKey)

// Build the locking script, created by the sender
const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)

// Simulate transaction signing
const txHash = Hash.sha256('transaction data')
const signature = Signature.sign(txHash, privateKey)

// Build the unlocking script, created when the recipient spends the output
const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(signature, publicKey)

// Verify
const result = Script.verify(scriptSig, scriptPubKey, {
  signatureHash: txHash
})

console.log(result.success)  // true
```

## OP_RETURN: Data Storage

`OP_RETURN` stores arbitrary data on the blockchain while marking the output as unspendable:

```typescript
static buildOpReturnScript(data: string): Script {
  return new Script()
    .addOpCode(OpCode.OP_RETURN)
    .addData(data)
}
```

Use cases:
- Proving that a file existed through a timestamping service
- Storing metadata
- Colored Coins
- Protocol-layer data such as Omni Layer data

## Security Considerations

Bitcoin Script has strict limits:

1. **Maximum script size**: 10,000 bytes
2. **Maximum operation count**: 201
3. **Stack depth limit**: 1,000 elements
4. **No loops**: Guarantees script termination
5. **Limited opcode set**: Reduces the attack surface

```typescript
execute(context: ScriptContext): ScriptResult {
  const maxOps = 201
  
  for (const element of this.elements) {
    opCount++
    if (opCount > maxOps) {
      throw new Error('Maximum operation count exceeded')
    }
    // ...
  }
}
```

## Tests

```typescript
describe('Complete P2PKH validation', () => {
  test('signature verification', () => {
    const { privateKey, publicKey } = Signature.generateKeyPair()
    const pubKeyHash = ScriptBuilder.hash160(publicKey)
    
    const scriptPubKey = ScriptBuilder.buildP2PKHLockingScript(pubKeyHash)
    const txHash = Hash.sha256('test transaction')
    const signature = Signature.sign(txHash, privateKey)
    const scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(signature, publicKey)
    
    const result = Script.verify(scriptSig, scriptPubKey, {
      signatureHash: txHash
    })
    
    expect(result.success).toBe(true)
  })
})

describe('Multisignature validation', () => {
  test('2-of-3 multisignature', () => {
    const keys = [
      Signature.generateKeyPair(),
      Signature.generateKeyPair(),
      Signature.generateKeyPair()
    ]
    
    const redeemScript = ScriptBuilder.buildMultiSigScript(
      2, keys.map(k => k.publicKey)
    )
    
    const txHash = Hash.sha256('test multisig')
    const sig1 = Signature.sign(txHash, keys[0].privateKey)
    const sig2 = Signature.sign(txHash, keys[1].privateKey)
    
    const scriptSig = ScriptBuilder.buildMultiSigUnlockingScript([sig1, sig2])
    
    const result = Script.verify(scriptSig, redeemScript, {
      signatureHash: txHash
    })
    
    expect(result.success).toBe(true)
  })
})
```

## Summary

By implementing the script system, our Bitcoin implementation gains:

1. **Programmability** - Transaction conditions can be defined with scripts
2. **Flexibility** - Supports multiple transaction types
3. **Security** - Advanced features such as multisignature and time locks
4. **Compatibility** - Backward-compatible with the simple signature model

The script system is the foundation of Bitcoin's concept of "programmable money." Although it is not as powerful as Ethereum smart contracts, its simplicity and security have stood the test of time.

In the next article, we will explore the network layer and implement communication and block synchronization between nodes.

---

**Code repository**: See the `src/script/` directory for the complete code

**Related documentation**:
- [Bitcoin Script Wiki](https://en.bitcoin.it/wiki/Script)
- [BIP 16 - P2SH](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki)
- [BIP 11 - M-of-N Multisig](https://github.com/bitcoin/bips/blob/master/bip-0011.mediawiki)



