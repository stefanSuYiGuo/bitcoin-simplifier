/**
 * Base58 encoding utilities.
 * Bitcoin uses Base58 to produce human-readable addresses.
 * Base58 omits easily confused characters: 0, O, I, and l.
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE = BigInt(58)

/**
 * Encodes a hexadecimal string as Base58.
 * @param hex Hexadecimal string
 * @returns Base58-encoded string
 */
export function encodeBase58(hex: string): string {
  if (hex.length === 0) return ''
  
  // Convert to a BigInt
  let num = BigInt('0x' + hex)
  
  // Encode the value
  let encoded = ''
  while (num > 0) {
    const remainder = Number(num % BASE)
    encoded = ALPHABET[remainder] + encoded
    num = num / BASE
  }
  
  // Preserve leading zero bytes as 1 characters
  for (let i = 0; i < hex.length && hex.substring(i, i + 2) === '00'; i += 2) {
    encoded = '1' + encoded
  }
  
  return encoded
}

/**
 * Decodes a Base58 string as hexadecimal.
 * @param base58 Base58-encoded string
 * @returns Hexadecimal string
 */
export function decodeBase58(base58: string): string {
  if (base58.length === 0) return ''
  
  // Count leading 1 characters
  let leadingOnes = 0
  for (let i = 0; i < base58.length && base58[i] === '1'; i++) {
    leadingOnes++
  }
  
  // If every character is 1, return the matching number of zero bytes
  if (leadingOnes === base58.length) {
    return '00'.repeat(leadingOnes)
  }
  
  // Decode the portion after the leading 1 characters
  let num = BigInt(0)
  for (let i = leadingOnes; i < base58.length; i++) {
    const char = base58[i]
    const value = ALPHABET.indexOf(char)
    
    if (value === -1) {
      throw new Error(`Invalid Base58 character: ${char}`)
    }
    
    num = num * BASE + BigInt(value)
  }
  
  // Convert to hexadecimal
  let hex = num.toString(16)
  
  // Ensure an even number of hexadecimal digits
  if (hex.length % 2 !== 0) {
    hex = '0' + hex
  }
  
  // Restore one leading zero byte for each leading 1
  return '00'.repeat(leadingOnes) + hex
}
