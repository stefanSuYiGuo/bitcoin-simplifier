/**
 * Base58 编码工具
 * 比特币使用 Base58 编码来生成人类可读的地址
 * Base58 去除了容易混淆的字符：0 (零), O (大写o), I (大写i), l (小写L)
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE = BigInt(58)

/**
 * 将十六进制字符串编码为 Base58
 * @param hex 十六进制字符串
 * @returns Base58 编码的字符串
 */
export function encodeBase58(hex: string): string {
  if (hex.length === 0) return ''
  
  // 转换为 BigInt
  let num = BigInt('0x' + hex)
  
  // 编码
  let encoded = ''
  while (num > 0) {
    const remainder = Number(num % BASE)
    encoded = ALPHABET[remainder] + encoded
    num = num / BASE
  }
  
  // 处理前导零（十六进制的 00 应该编码为 '1'）
  for (let i = 0; i < hex.length && hex.substring(i, i + 2) === '00'; i += 2) {
    encoded = '1' + encoded
  }
  
  return encoded
}

/**
 * 将 Base58 字符串解码为十六进制
 * @param base58 Base58 编码的字符串
 * @returns 十六进制字符串
 */
export function decodeBase58(base58: string): string {
  if (base58.length === 0) return ''
  
  // 计算前导 '1' 的数量
  let leadingOnes = 0
  for (let i = 0; i < base58.length && base58[i] === '1'; i++) {
    leadingOnes++
  }
  
  // 如果全是 '1'，直接返回对应数量的 '00'
  if (leadingOnes === base58.length) {
    return '00'.repeat(leadingOnes)
  }
  
  // 解码非前导 '1' 部分
  let num = BigInt(0)
  for (let i = leadingOnes; i < base58.length; i++) {
    const char = base58[i]
    const value = ALPHABET.indexOf(char)
    
    if (value === -1) {
      throw new Error(`Invalid Base58 character: ${char}`)
    }
    
    num = num * BASE + BigInt(value)
  }
  
  // 转换为十六进制
  let hex = num.toString(16)
  
  // 确保偶数长度
  if (hex.length % 2 !== 0) {
    hex = '0' + hex
  }
  
  // 添加前导 '00' (每个前导 '1' 对应一个 '00')
  return '00'.repeat(leadingOnes) + hex
}
