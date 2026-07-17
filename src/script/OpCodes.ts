/**
 * Bitcoin Script opcode definitions.
 * Implements a subset of the Bitcoin scripting language.
 */

/**
 * Opcode enumeration.
 */
export enum OpCode {
  // ============ Constant opcodes ============
  OP_0 = 0x00, // Push an empty byte array onto the stack
  OP_FALSE = 0x00, // Alias for OP_0
  OP_PUSHDATA1 = 0x4c, // The next byte specifies the data length
  OP_PUSHDATA2 = 0x4d, // The next two bytes specify the data length
  OP_PUSHDATA4 = 0x4e, // The next four bytes specify the data length
  OP_1NEGATE = 0x4f, // Push -1 onto the stack
  OP_1 = 0x51, // Push 1 onto the stack
  OP_TRUE = 0x51, // Alias for OP_1
  OP_2 = 0x52,
  OP_3 = 0x53,
  OP_4 = 0x54,
  OP_5 = 0x55,
  OP_6 = 0x56,
  OP_7 = 0x57,
  OP_8 = 0x58,
  OP_9 = 0x59,
  OP_10 = 0x5a,
  OP_11 = 0x5b,
  OP_12 = 0x5c,
  OP_13 = 0x5d,
  OP_14 = 0x5e,
  OP_15 = 0x5f,
  OP_16 = 0x60,

  // ============ Flow control ============
  OP_NOP = 0x61, // No operation
  OP_IF = 0x63, // Conditional execution
  OP_NOTIF = 0x64, // Inverted conditional execution
  OP_ELSE = 0x67, // Else branch
  OP_ENDIF = 0x68, // End the conditional
  OP_VERIFY = 0x69, // Fail if the top stack item is false
  OP_RETURN = 0x6a, // Mark the transaction invalid for data storage

  // ============ Stack operations ============
  OP_TOALTSTACK = 0x6b, // Move the top item to the alternate stack
  OP_FROMALTSTACK = 0x6c, // Move an item back from the alternate stack
  OP_IFDUP = 0x73, // Duplicate the top item if it is nonzero
  OP_DEPTH = 0x74, // Push the stack depth
  OP_DROP = 0x75, // Remove the top stack item
  OP_DUP = 0x76, // Duplicate the top stack item
  OP_NIP = 0x77, // Remove the second stack item
  OP_OVER = 0x78, // Copy the second item to the top
  OP_PICK = 0x79, // Copy the nth stack item to the top
  OP_ROLL = 0x7a, // Move the nth stack item to the top
  OP_ROT = 0x7b, // Rotate the top three items
  OP_SWAP = 0x7c, // Swap the top two items
  OP_TUCK = 0x7d, // Insert the top item before the second item
  OP_2DROP = 0x6d, // Remove the top two items
  OP_2DUP = 0x6e, // Duplicate the top two items
  OP_3DUP = 0x6f, // Duplicate the top three items
  OP_2OVER = 0x70, // Copy the third and fourth items to the top
  OP_2ROT = 0x71, // Rotate the top six items
  OP_2SWAP = 0x72, // Swap the top two pairs

  // ============ String operations ============
  OP_SIZE = 0x82, // Push the byte length of the top item

  // ============ Bitwise operations ============
  OP_EQUAL = 0x87, // Check whether two items are equal
  OP_EQUALVERIFY = 0x88, // OP_EQUAL + OP_VERIFY

  // ============ Arithmetic operations ============
  OP_1ADD = 0x8b, // Add 1
  OP_1SUB = 0x8c, // Subtract 1
  OP_NEGATE = 0x8f, // Negate
  OP_ABS = 0x90, // Absolute value
  OP_NOT = 0x91, // Logical NOT
  OP_0NOTEQUAL = 0x92, // Return 1 for a nonzero value
  OP_ADD = 0x93, // Addition
  OP_SUB = 0x94, // Subtraction
  OP_BOOLAND = 0x9a, // Logical AND
  OP_BOOLOR = 0x9b, // Logical OR
  OP_NUMEQUAL = 0x9c, // Numeric equality
  OP_NUMEQUALVERIFY = 0x9d, // Numeric equality followed by verification
  OP_NUMNOTEQUAL = 0x9e, // Numeric inequality
  OP_LESSTHAN = 0x9f, // Less than
  OP_GREATERTHAN = 0xa0, // Greater than
  OP_LESSTHANOREQUAL = 0xa1, // Less than or equal
  OP_GREATERTHANOREQUAL = 0xa2, // Greater than or equal
  OP_MIN = 0xa3, // Minimum value
  OP_MAX = 0xa4, // Maximum value
  OP_WITHIN = 0xa5, // Range check

  // ============ Cryptographic operations ============
  OP_RIPEMD160 = 0xa6, // RIPEMD-160 hash
  OP_SHA1 = 0xa7, // SHA-1 hash
  OP_SHA256 = 0xa8, // SHA-256 hash
  OP_HASH160 = 0xa9, // SHA-256 + RIPEMD-160
  OP_HASH256 = 0xaa, // Double SHA-256
  OP_CODESEPARATOR = 0xab, // Signature separator
  OP_CHECKSIG = 0xac, // Verify a signature
  OP_CHECKSIGVERIFY = 0xad, // Verify a signature followed by OP_VERIFY
  OP_CHECKMULTISIG = 0xae, // Verify multiple signatures
  OP_CHECKMULTISIGVERIFY = 0xaf, // Verify multiple signatures followed by OP_VERIFY

  // ============ Lock time ============
  OP_CHECKLOCKTIMEVERIFY = 0xb1, // CLTV
  OP_CHECKSEQUENCEVERIFY = 0xb2, // CSV
}

/**
 * Opcode name mapping.
 */
export const OpCodeNames: Record<number, string> = {
  [OpCode.OP_0]: 'OP_0',
  [OpCode.OP_PUSHDATA1]: 'OP_PUSHDATA1',
  [OpCode.OP_PUSHDATA2]: 'OP_PUSHDATA2',
  [OpCode.OP_PUSHDATA4]: 'OP_PUSHDATA4',
  [OpCode.OP_1NEGATE]: 'OP_1NEGATE',
  [OpCode.OP_1]: 'OP_1',
  [OpCode.OP_2]: 'OP_2',
  [OpCode.OP_3]: 'OP_3',
  [OpCode.OP_4]: 'OP_4',
  [OpCode.OP_5]: 'OP_5',
  [OpCode.OP_6]: 'OP_6',
  [OpCode.OP_7]: 'OP_7',
  [OpCode.OP_8]: 'OP_8',
  [OpCode.OP_9]: 'OP_9',
  [OpCode.OP_10]: 'OP_10',
  [OpCode.OP_11]: 'OP_11',
  [OpCode.OP_12]: 'OP_12',
  [OpCode.OP_13]: 'OP_13',
  [OpCode.OP_14]: 'OP_14',
  [OpCode.OP_15]: 'OP_15',
  [OpCode.OP_16]: 'OP_16',
  [OpCode.OP_NOP]: 'OP_NOP',
  [OpCode.OP_IF]: 'OP_IF',
  [OpCode.OP_NOTIF]: 'OP_NOTIF',
  [OpCode.OP_ELSE]: 'OP_ELSE',
  [OpCode.OP_ENDIF]: 'OP_ENDIF',
  [OpCode.OP_VERIFY]: 'OP_VERIFY',
  [OpCode.OP_RETURN]: 'OP_RETURN',
  [OpCode.OP_TOALTSTACK]: 'OP_TOALTSTACK',
  [OpCode.OP_FROMALTSTACK]: 'OP_FROMALTSTACK',
  [OpCode.OP_IFDUP]: 'OP_IFDUP',
  [OpCode.OP_DEPTH]: 'OP_DEPTH',
  [OpCode.OP_DROP]: 'OP_DROP',
  [OpCode.OP_DUP]: 'OP_DUP',
  [OpCode.OP_NIP]: 'OP_NIP',
  [OpCode.OP_OVER]: 'OP_OVER',
  [OpCode.OP_PICK]: 'OP_PICK',
  [OpCode.OP_ROLL]: 'OP_ROLL',
  [OpCode.OP_ROT]: 'OP_ROT',
  [OpCode.OP_SWAP]: 'OP_SWAP',
  [OpCode.OP_TUCK]: 'OP_TUCK',
  [OpCode.OP_2DROP]: 'OP_2DROP',
  [OpCode.OP_2DUP]: 'OP_2DUP',
  [OpCode.OP_3DUP]: 'OP_3DUP',
  [OpCode.OP_2OVER]: 'OP_2OVER',
  [OpCode.OP_2ROT]: 'OP_2ROT',
  [OpCode.OP_2SWAP]: 'OP_2SWAP',
  [OpCode.OP_SIZE]: 'OP_SIZE',
  [OpCode.OP_EQUAL]: 'OP_EQUAL',
  [OpCode.OP_EQUALVERIFY]: 'OP_EQUALVERIFY',
  [OpCode.OP_1ADD]: 'OP_1ADD',
  [OpCode.OP_1SUB]: 'OP_1SUB',
  [OpCode.OP_NEGATE]: 'OP_NEGATE',
  [OpCode.OP_ABS]: 'OP_ABS',
  [OpCode.OP_NOT]: 'OP_NOT',
  [OpCode.OP_0NOTEQUAL]: 'OP_0NOTEQUAL',
  [OpCode.OP_ADD]: 'OP_ADD',
  [OpCode.OP_SUB]: 'OP_SUB',
  [OpCode.OP_BOOLAND]: 'OP_BOOLAND',
  [OpCode.OP_BOOLOR]: 'OP_BOOLOR',
  [OpCode.OP_NUMEQUAL]: 'OP_NUMEQUAL',
  [OpCode.OP_NUMEQUALVERIFY]: 'OP_NUMEQUALVERIFY',
  [OpCode.OP_NUMNOTEQUAL]: 'OP_NUMNOTEQUAL',
  [OpCode.OP_LESSTHAN]: 'OP_LESSTHAN',
  [OpCode.OP_GREATERTHAN]: 'OP_GREATERTHAN',
  [OpCode.OP_LESSTHANOREQUAL]: 'OP_LESSTHANOREQUAL',
  [OpCode.OP_GREATERTHANOREQUAL]: 'OP_GREATERTHANOREQUAL',
  [OpCode.OP_MIN]: 'OP_MIN',
  [OpCode.OP_MAX]: 'OP_MAX',
  [OpCode.OP_WITHIN]: 'OP_WITHIN',
  [OpCode.OP_RIPEMD160]: 'OP_RIPEMD160',
  [OpCode.OP_SHA1]: 'OP_SHA1',
  [OpCode.OP_SHA256]: 'OP_SHA256',
  [OpCode.OP_HASH160]: 'OP_HASH160',
  [OpCode.OP_HASH256]: 'OP_HASH256',
  [OpCode.OP_CODESEPARATOR]: 'OP_CODESEPARATOR',
  [OpCode.OP_CHECKSIG]: 'OP_CHECKSIG',
  [OpCode.OP_CHECKSIGVERIFY]: 'OP_CHECKSIGVERIFY',
  [OpCode.OP_CHECKMULTISIG]: 'OP_CHECKMULTISIG',
  [OpCode.OP_CHECKMULTISIGVERIFY]: 'OP_CHECKMULTISIGVERIFY',
  [OpCode.OP_CHECKLOCKTIMEVERIFY]: 'OP_CHECKLOCKTIMEVERIFY',
  [OpCode.OP_CHECKSEQUENCEVERIFY]: 'OP_CHECKSEQUENCEVERIFY',
}

/**
 * Get an opcode by name.
 */
export function getOpCodeByName(name: string): OpCode | undefined {
  const upperName = name.toUpperCase()
  for (const [code, codeName] of Object.entries(OpCodeNames)) {
    if (codeName === upperName) {
      return parseInt(code) as OpCode
    }
  }
  return undefined
}

/**
 * Get an opcode name.
 */
export function getOpCodeName(code: OpCode): string {
  return OpCodeNames[code] || `UNKNOWN(0x${code.toString(16)})`
}

/**
 * Check whether a value is a data-push opcode (0x01-0x4b).
 * These opcodes directly specify the number of following data bytes.
 */
export function isDataPushOpCode(code: number): boolean {
  return code >= 0x01 && code <= 0x4b
}

/**
 * Check whether an opcode is a numeric constant (OP_1 through OP_16).
 */
export function isNumberOpCode(code: number): boolean {
  return code >= OpCode.OP_1 && code <= OpCode.OP_16
}

/**
 * Get the numeric value represented by an opcode.
 */
export function getNumberFromOpCode(code: OpCode): number {
  if (code === OpCode.OP_0) return 0
  if (code === OpCode.OP_1NEGATE) return -1
  if (code >= OpCode.OP_1 && code <= OpCode.OP_16) {
    return code - OpCode.OP_1 + 1
  }
  throw new Error(`Not a numeric opcode: ${getOpCodeName(code)}`)
}

/**
 * Get the numeric opcode for a value.
 */
export function getOpCodeFromNumber(num: number): OpCode {
  if (num === 0) return OpCode.OP_0
  if (num === -1) return OpCode.OP_1NEGATE
  if (num >= 1 && num <= 16) {
    return (OpCode.OP_1 + num - 1) as OpCode
  }
  throw new Error(`Value is outside the numeric opcode range: ${num}; use PUSHDATA`)
}


