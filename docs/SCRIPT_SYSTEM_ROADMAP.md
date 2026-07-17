# Bitcoin Script System Implementation Roadmap

## Overview

The script system is one of Bitcoin's core features and provides a flexible transaction validation mechanism. This document plans how to add the script system to the current simplified implementation.

## Why Is a Script System Necessary?

### Limitations of the Current Implementation

```typescript
// Simplified version: supports only basic single-signature transfers
interface TxInput {
  txId: string
  outputIndex: number
  signature: string    // Single signature
  publicKey: string    // Single public key
}
```

### Advantages of the Script System

1. **Multisignature support**: 2-of-3, 3-of-5, and other multisignature wallets
2. **Time locks**: Permit spending only after a specified time
3. **Hash locks**: Require knowledge of a preimage to spend, as used in atomic swaps
4. **Complex conditions**: Combine multiple payment conditions
5. **Closer to real Bitcoin**: Understand how real Bitcoin works

## Implementation Plan

### Phase 1: Core Components (2–3 Weeks)

#### 1.1 Stack Data Structure (`Stack.ts`)

```typescript
class Stack {
  private items: Buffer[] = []
  
  push(item: Buffer): void
  pop(): Buffer | undefined
  peek(): Buffer | undefined
  size(): number
  dup(): void      // Duplicate the top item
  swap(): void     // Swap the top two items
  clear(): void
}
```

**Testing focus**:
- Basic stack operations
- Boundary conditions, including empty stacks and stack overflow
- Buffer type handling

#### 1.2 Opcode Definitions (`OpCodes.ts`)

```typescript
export enum OpCode {
  // Constants
  OP_0 = 0x00,
  OP_1 = 0x51,
  // ... OP_2 through OP_16
  
  // Stack operations
  OP_DUP = 0x76,
  OP_DROP = 0x75,
  OP_SWAP = 0x7c,
  
  // Cryptographic operations
  OP_SHA256 = 0xa8,
  OP_HASH160 = 0xa9,
  OP_CHECKSIG = 0xac,
  OP_CHECKMULTISIG = 0xae,
  
  // Logical operations
  OP_EQUAL = 0x87,
  OP_EQUALVERIFY = 0x88,
  OP_VERIFY = 0x69,
}

export interface OpCodeHandler {
  execute(stack: Stack, tx?: Transaction, inputIndex?: number): boolean
}
```

**Opcode implementation** (in priority order):
1. First group: OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG (required for P2PKH)
2. Second group: OP_EQUAL, OP_VERIFY (basic validation)
3. Third group: OP_CHECKMULTISIG (multisignature)
4. Fourth group: Other stack and arithmetic operations

#### 1.3 Script Parser and Executor (`Script.ts`)

```typescript
class Script {
  private bytecode: Buffer
  
  constructor(script: string | Buffer) {
    this.bytecode = this.parse(script)
  }
  
  // Parse a script string or hexadecimal value into bytecode
  parse(script: string | Buffer): Buffer
  
  // Execute the script
  execute(
    stack: Stack,
    transaction?: Transaction,
    inputIndex?: number
  ): boolean
  
  // Serialize
  serialize(): Buffer
  toHex(): string
  toString(): string  // Human-readable format
  
  // Deserialize
  static deserialize(buffer: Buffer): Script
  static fromHex(hex: string): Script
}
```

**Execution flow**:
```
1. Initialize an empty stack
2. Iterate through the bytecode
3. For each element:
   - If it is data, push it onto the stack
   - If it is an opcode, execute the corresponding operation
4. Check the execution result; the top stack value must be true
```

### Phase 2: Script Builder (1 Week)

#### 2.1 ScriptBuilder (`ScriptBuilder.ts`)

```typescript
class ScriptBuilder {
  private ops: Buffer[] = []
  
  // P2PKH: Pay-to-Public-Key-Hash
  static buildP2PKHLock(pubKeyHash: Buffer): Script {
    return new ScriptBuilder()
      .pushOp(OpCode.OP_DUP)
      .pushOp(OpCode.OP_HASH160)
      .pushData(pubKeyHash)
      .pushOp(OpCode.OP_EQUALVERIFY)
      .pushOp(OpCode.OP_CHECKSIG)
      .build()
  }
  
  static buildP2PKHUnlock(signature: Buffer, publicKey: Buffer): Script {
    return new ScriptBuilder()
      .pushData(signature)
      .pushData(publicKey)
      .build()
  }
  
  // P2SH: Pay-to-Script-Hash
  static buildP2SHLock(scriptHash: Buffer): Script
  static buildP2SHUnlock(redeemScript: Script, ...data: Buffer[]): Script
  
  // MultiSig
  static buildMultiSig(m: number, publicKeys: Buffer[]): Script
  static buildMultiSigUnlock(signatures: Buffer[]): Script
  
  // Helper methods
  pushOp(opcode: OpCode): ScriptBuilder
  pushData(data: Buffer): ScriptBuilder
  build(): Script
}
```

### Phase 3: Transaction Integration (1–2 Weeks)

#### 3.1 Update the Transaction Data Structure

```typescript
// Add script-based inputs and outputs
interface TxInputScript {
  txId: string
  outputIndex: number
  scriptSig: string    // Hexadecimal-encoded script
  sequence: number     // Defaults to 0xffffffff
}

interface TxOutputScript {
  amount: number
  scriptPubKey: string // Hexadecimal-encoded script
}

// The transaction class supports both modes
class Transaction {
  version: number
  inputs: TxInput[] | TxInputScript[]
  outputs: TxOutput[] | TxOutputScript[]
  lockTime: number
  
  // Mode indicator
  useScriptMode: boolean
}
```

#### 3.2 Script Validator

```typescript
class ScriptValidator {
  validateInput(
    transaction: Transaction,
    inputIndex: number,
    utxoSet: UTXOSet
  ): boolean {
    const input = transaction.inputs[inputIndex]
    const utxo = utxoSet.get(input.txId, input.outputIndex)
    
    // Create the stack
    const stack = new Stack()
    
    // Execute scriptSig
    const scriptSig = Script.fromHex(input.scriptSig)
    if (!scriptSig.execute(stack, transaction, inputIndex)) {
      return false
    }
    
    // Execute scriptPubKey
    const scriptPubKey = Script.fromHex(utxo.scriptPubKey)
    if (!scriptPubKey.execute(stack, transaction, inputIndex)) {
      return false
    }
    
    // Check the result
    return this.isStackTrue(stack)
  }
  
  private isStackTrue(stack: Stack): boolean {
    if (stack.size() === 0) return false
    const top = stack.peek()
    return !this.isZero(top)
  }
}
```

### Phase 4: Backward Compatibility (1 Week)

#### 4.1 Compatibility Layer

```typescript
class TransactionAdapter {
  // Simplified version → script version
  static toScriptMode(simpleTx: Transaction): Transaction {
    const scriptTx = { ...simpleTx }
    
    scriptTx.inputs = simpleTx.inputs.map(input => {
      const sig = Buffer.from(input.signature, 'hex')
      const pubKey = Buffer.from(input.publicKey, 'hex')
      const scriptSig = ScriptBuilder.buildP2PKHUnlock(sig, pubKey)
      
      return {
        txId: input.txId,
        outputIndex: input.outputIndex,
        scriptSig: scriptSig.toHex(),
        sequence: 0xffffffff
      }
    })
    
    scriptTx.outputs = simpleTx.outputs.map(output => {
      const pubKeyHash = this.addressToPubKeyHash(output.address)
      const scriptPubKey = ScriptBuilder.buildP2PKHLock(pubKeyHash)
      
      return {
        amount: output.amount,
        scriptPubKey: scriptPubKey.toHex()
      }
    })
    
    return scriptTx
  }
  
  // Script version → simplified version (P2PKH only)
  static toSimpleMode(scriptTx: Transaction): Transaction {
    // Parse the script to extract the signature and public key
  }
}
```

#### 4.2 Configuration Switch

```typescript
// Global configuration
export const Config = {
  useScriptMode: false,  // Use simplified mode by default
  scriptLimits: {
    maxScriptSize: 10000,
    maxStackSize: 1000,
    maxOpsPerScript: 201
  }
}

// Check the mode during validation
if (Config.useScriptMode) {
  // Use script validation
  return ScriptValidator.validateInput(...)
} else {
  // Use simplified validation
  return Signature.verify(...)
}
```

### Phase 5: Tests and Documentation (1–2 Weeks)

#### 5.1 Unit Tests

- [ ] Stack operation tests
- [ ] Tests for each OpCode
- [ ] Script parsing and execution tests
- [ ] ScriptBuilder tests
- [ ] Complete P2PKH workflow tests
- [ ] Complete P2SH workflow tests
- [ ] Complete MultiSig workflow tests
- [ ] Compatibility layer tests

#### 5.2 Integration Tests

- [ ] Create and validate script transactions
- [ ] Multisignature wallet transfer workflow
- [ ] Simplified mode ↔ script mode conversion
- [ ] Error handling and boundary conditions

#### 5.3 Examples and Documentation

- [ ] P2PKH transaction example
- [ ] Multisignature wallet example
- [ ] P2SH transaction example
- [ ] API documentation
- [ ] Migration guide (simplified version → script version)

## Key Technical Decisions

### 1. Bytecode Format

Use Bitcoin's original bytecode format:
- Compatible with real Bitcoin
- Supports learning real script execution
- Facilitates debugging and understanding

### 2. Execution Engine

Stack-based virtual machine:
- Simple and intuitive
- Easy to implement
- Consistent with Bitcoin

### 3. Security Limits

Implement all Bitcoin security limits:
- Script size limit
- Stack depth limit
- Opcode count limit
- Disable certain dangerous opcodes

### 4. Backward Compatibility

Retain the simplified interface:
- Do not break existing code
- Provide a smooth migration path
- Allow both modes to coexist

## Expected Benefits

### Learning Value

1. Develop a deep understanding of the Bitcoin script system
2. Understand stack-based virtual machines
3. Learn about multisignature and complex transactions
4. Master how real Bitcoin works

### Technical Value

1. Support more complex transaction types
2. Implement multisignature wallets
3. Establish a foundation for future extensions
4. Move closer to a production-grade implementation

### Educational Value

1. Present the complete Bitcoin technology stack
2. Demonstrate advanced features
3. Provide better examples and documentation
4. Provide a more compelling implementation

## Risks and Challenges

### Technical Challenges

1. **Increased complexity**: The script system is significantly more complex than the simplified version
2. **Testing difficulty**: Extensive test coverage is required
3. **Debugging difficulty**: Script execution errors are difficult to locate
4. **Performance impact**: Script execution is slower than direct validation

### Solutions

1. **Phased implementation**: Implement core functionality before extending it
2. **Detailed logging**: Add script execution tracing
3. **Visualization tools**: Implement stack state visualization
4. **Performance optimization**: Cache validation results for frequently used scripts

## Time Estimate

| Phase | Duration | Task |
|------|------|------|
| Phase 1 | 2–3 weeks | Core component implementation |
| Phase 2 | 1 week | Script builder |
| Phase 3 | 1–2 weeks | Transaction integration |
| Phase 4 | 1 week | Backward compatibility |
| Phase 5 | 1–2 weeks | Tests and documentation |
| **Total** | **6–9 weeks** | |

## Next Actions

1. [ ] Review and confirm the technical approach
2. [ ] Create the `feature/script-system` feature branch
3. [ ] Implement the Stack class and tests
4. [ ] Implement basic opcodes such as OP_DUP and OP_HASH160
5. [ ] Implement the Script execution engine
6. [ ] Implement P2PKH scripts
7. [ ] Integrate scripts into transaction validation
8. [ ] Complete tests and documentation

## References

- [Bitcoin Script](https://en.bitcoin.it/wiki/Script)
- [Mastering Bitcoin - Chapter 7: Advanced Transactions](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch07.asciidoc)
- [BIP 16: Pay to Script Hash](https://github.com/bitcoin/bips/blob/master/bip-0016.mediawiki)
- [BIP 141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [Bitcoin Script Debugger](https://bitcoin.sipa.be/miniscript/)

