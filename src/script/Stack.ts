/**
 * Script execution stack.
 * Bitcoin Script uses a stack-based execution model.
 */

/**
 * Stack element type.
 * Represents a byte array as a hexadecimal string.
 */
export type StackElement = string

/**
 * Script execution stack.
 */
export class Stack {
  private items: StackElement[] = []
  private maxSize: number

  /**
   * @param maxSize Maximum stack depth, defaulting to Bitcoin's limit of 1,000.
   */
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  /**
   * Push an item.
   */
  push(item: StackElement): void {
    if (this.items.length >= this.maxSize) {
      throw new Error(`Stack overflow: maximum depth of ${this.maxSize} exceeded`)
    }
    this.items.push(item)
  }

  /**
   * Pop the top item.
   */
  pop(): StackElement {
    if (this.items.length === 0) {
      throw new Error('Stack underflow: stack is empty')
    }
    return this.items.pop()!
  }

  /**
   * Peek at the top item without removing it.
   */
  peek(): StackElement {
    if (this.items.length === 0) {
      throw new Error('Stack is empty')
    }
    return this.items[this.items.length - 1]
  }

  /**
   * Peek at the nth item, where 0 is the top.
   */
  peekAt(n: number): StackElement {
    if (n < 0 || n >= this.items.length) {
      throw new Error(`Stack index out of bounds: ${n}`)
    }
    return this.items[this.items.length - 1 - n]
  }

  /**
   * Get the stack depth.
   */
  size(): number {
    return this.items.length
  }

  /**
   * Check whether the stack is empty.
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Clear the stack.
   */
  clear(): void {
    this.items = []
  }

  /**
   * Duplicate the top item.
   */
  dup(): void {
    this.push(this.peek())
  }

  /**
   * Swap the top two items.
   */
  swap(): void {
    if (this.items.length < 2) {
      throw new Error('Insufficient stack items: at least 2 required')
    }
    const a = this.pop()
    const b = this.pop()
    this.push(a)
    this.push(b)
  }

  /**
   * Rotate the top three items.
   * [x1, x2, x3] -> [x2, x3, x1]
   */
  rot(): void {
    if (this.items.length < 3) {
      throw new Error('Insufficient stack items: at least 3 required')
    }
    const x3 = this.pop()
    const x2 = this.pop()
    const x1 = this.pop()
    this.push(x2)
    this.push(x3)
    this.push(x1)
  }

  /**
   * Copy the second item to the top.
   */
  over(): void {
    if (this.items.length < 2) {
      throw new Error('Insufficient stack items: at least 2 required')
    }
    this.push(this.peekAt(1))
  }

  /**
   * Remove the second item.
   */
  nip(): void {
    if (this.items.length < 2) {
      throw new Error('Insufficient stack items: at least 2 required')
    }
    const top = this.pop()
    this.pop()
    this.push(top)
  }

  /**
   * Copy the top item and insert it before the second item.
   */
  tuck(): void {
    if (this.items.length < 2) {
      throw new Error('Insufficient stack items: at least 2 required')
    }
    const top = this.pop()
    const second = this.pop()
    this.push(top)
    this.push(second)
    this.push(top)
  }

  /**
   * Copy the nth item to the top.
   */
  pick(n: number): void {
    this.push(this.peekAt(n))
  }

  /**
   * Move the nth item to the top.
   */
  roll(n: number): void {
    if (n < 0 || n >= this.items.length) {
      throw new Error(`Stack index out of bounds: ${n}`)
    }
    const index = this.items.length - 1 - n
    const item = this.items.splice(index, 1)[0]
    this.push(item)
  }

  /**
   * Remove the top two items.
   */
  drop2(): void {
    this.pop()
    this.pop()
  }

  /**
   * Duplicate the top two items.
   */
  dup2(): void {
    if (this.items.length < 2) {
      throw new Error('Insufficient stack items: at least 2 required')
    }
    const a = this.peekAt(1)
    const b = this.peekAt(0)
    this.push(a)
    this.push(b)
  }

  /**
   * Duplicate the top three items.
   */
  dup3(): void {
    if (this.items.length < 3) {
      throw new Error('Insufficient stack items: at least 3 required')
    }
    const a = this.peekAt(2)
    const b = this.peekAt(1)
    const c = this.peekAt(0)
    this.push(a)
    this.push(b)
    this.push(c)
  }

  /**
   * Copy the third and fourth items to the top.
   */
  over2(): void {
    if (this.items.length < 4) {
      throw new Error('Insufficient stack items: at least 4 required')
    }
    const a = this.peekAt(3)
    const b = this.peekAt(2)
    this.push(a)
    this.push(b)
  }

  /**
   * Swap the top two pairs of items.
   * [x1, x2, x3, x4] -> [x3, x4, x1, x2]
   */
  swap2(): void {
    if (this.items.length < 4) {
      throw new Error('Insufficient stack items: at least 4 required')
    }
    const x4 = this.pop()
    const x3 = this.pop()
    const x2 = this.pop()
    const x1 = this.pop()
    this.push(x3)
    this.push(x4)
    this.push(x1)
    this.push(x2)
  }

  /**
   * Get all items from bottom to top.
   */
  getItems(): StackElement[] {
    return [...this.items]
  }

  /**
   * Convert the stack to a debug string.
   */
  toString(): string {
    if (this.items.length === 0) {
      return '[empty]'
    }
    return this.items
      .map((item, i) => {
        const label = i === this.items.length - 1 ? '(top)' : ''
        const display = item.length > 20 ? `${item.substring(0, 20)}...` : item
        return `  ${i}: ${display} ${label}`
      })
      .join('\n')
  }
}

/**
 * Stack element utilities.
 */
export const StackUtils = {
  /**
   * Encode a number as a stack element.
   * Bitcoin uses little-endian signed integers.
   */
  encodeNumber(num: number): StackElement {
    if (num === 0) return ''

    const negative = num < 0
    let absNum = Math.abs(num)
    const bytes: number[] = []

    while (absNum > 0) {
      bytes.push(absNum & 0xff)
      absNum >>= 8
    }

    // Add a sign byte when the high bit is set
    if (bytes[bytes.length - 1] & 0x80) {
      bytes.push(negative ? 0x80 : 0x00)
    } else if (negative) {
      bytes[bytes.length - 1] |= 0x80
    }

    return Buffer.from(bytes).toString('hex')
  },

  /**
   * Decode a stack element as a number.
   */
  decodeNumber(element: StackElement): number {
    if (element === '' || element.length === 0) return 0

    const bytes = Buffer.from(element, 'hex')
    if (bytes.length === 0) return 0

    // Check the sign bit
    const negative = (bytes[bytes.length - 1] & 0x80) !== 0

    let result = 0
    for (let i = bytes.length - 1; i >= 0; i--) {
      let byte = bytes[i]
      // Clear the sign bit in the highest byte
      if (i === bytes.length - 1 && negative) {
        byte &= 0x7f
      }
      result = (result << 8) | byte
    }

    // Recalculate in little-endian order
    result = 0
    for (let i = 0; i < bytes.length; i++) {
      let byte = bytes[i]
      if (i === bytes.length - 1 && negative) {
        byte &= 0x7f
      }
      result |= byte << (8 * i)
    }

    return negative ? -result : result
  },

  /**
   * Check whether a stack element is true.
   * An empty or all-zero value is false; every other value is true.
   */
  isTrue(element: StackElement): boolean {
    if (element === '' || element.length === 0) return false

    const bytes = Buffer.from(element, 'hex')
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) {
        // A final byte containing only 0x80 represents negative zero and is false
        if (i === bytes.length - 1 && bytes[i] === 0x80) {
          return false
        }
        return true
      }
    }
    return false
  },

  /**
   * Encode a boolean as a stack element.
   */
  encodeBool(value: boolean): StackElement {
    return value ? '01' : ''
  },

  /**
   * Encode a UTF-8 string as a stack element.
   */
  encodeString(str: string): StackElement {
    return Buffer.from(str, 'utf8').toString('hex')
  },

  /**
   * Decode a stack element as a string.
   */
  decodeString(element: StackElement): string {
    return Buffer.from(element, 'hex').toString('utf8')
  },
}


