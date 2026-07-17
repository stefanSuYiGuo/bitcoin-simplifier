/**
 * 脚本执行栈
 * 比特币脚本使用基于栈的执行模型
 */

/**
 * 栈元素类型
 * 可以是字节数组（十六进制字符串）或数值
 */
export type StackElement = string

/**
 * 脚本执行栈
 */
export class Stack {
  private items: StackElement[] = []
  private maxSize: number

  /**
   * @param maxSize 栈最大深度，默认 1000（比特币限制）
   */
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  /**
   * 压入元素
   */
  push(item: StackElement): void {
    if (this.items.length >= this.maxSize) {
      throw new Error(`栈溢出：超过最大深度 ${this.maxSize}`)
    }
    this.items.push(item)
  }

  /**
   * 弹出栈顶元素
   */
  pop(): StackElement {
    if (this.items.length === 0) {
      throw new Error('栈下溢：栈为空')
    }
    return this.items.pop()!
  }

  /**
   * 查看栈顶元素（不弹出）
   */
  peek(): StackElement {
    if (this.items.length === 0) {
      throw new Error('栈为空')
    }
    return this.items[this.items.length - 1]
  }

  /**
   * 查看栈中第 n 个元素（0 为栈顶）
   */
  peekAt(n: number): StackElement {
    if (n < 0 || n >= this.items.length) {
      throw new Error(`索引越界: ${n}`)
    }
    return this.items[this.items.length - 1 - n]
  }

  /**
   * 获取栈深度
   */
  size(): number {
    return this.items.length
  }

  /**
   * 栈是否为空
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * 清空栈
   */
  clear(): void {
    this.items = []
  }

  /**
   * 复制栈顶元素
   */
  dup(): void {
    this.push(this.peek())
  }

  /**
   * 交换栈顶两个元素
   */
  swap(): void {
    if (this.items.length < 2) {
      throw new Error('栈元素不足：需要至少 2 个元素')
    }
    const a = this.pop()
    const b = this.pop()
    this.push(a)
    this.push(b)
  }

  /**
   * 旋转栈顶三个元素
   * [x1, x2, x3] -> [x2, x3, x1]
   */
  rot(): void {
    if (this.items.length < 3) {
      throw new Error('栈元素不足：需要至少 3 个元素')
    }
    const x3 = this.pop()
    const x2 = this.pop()
    const x1 = this.pop()
    this.push(x2)
    this.push(x3)
    this.push(x1)
  }

  /**
   * 复制栈顶第二个元素到栈顶
   */
  over(): void {
    if (this.items.length < 2) {
      throw new Error('栈元素不足：需要至少 2 个元素')
    }
    this.push(this.peekAt(1))
  }

  /**
   * 删除栈顶第二个元素
   */
  nip(): void {
    if (this.items.length < 2) {
      throw new Error('栈元素不足：需要至少 2 个元素')
    }
    const top = this.pop()
    this.pop()
    this.push(top)
  }

  /**
   * 将栈顶元素复制并插入到第二个位置之前
   */
  tuck(): void {
    if (this.items.length < 2) {
      throw new Error('栈元素不足：需要至少 2 个元素')
    }
    const top = this.pop()
    const second = this.pop()
    this.push(top)
    this.push(second)
    this.push(top)
  }

  /**
   * 复制栈中第 n 个元素到栈顶
   */
  pick(n: number): void {
    this.push(this.peekAt(n))
  }

  /**
   * 移动栈中第 n 个元素到栈顶
   */
  roll(n: number): void {
    if (n < 0 || n >= this.items.length) {
      throw new Error(`索引越界: ${n}`)
    }
    const index = this.items.length - 1 - n
    const item = this.items.splice(index, 1)[0]
    this.push(item)
  }

  /**
   * 删除栈顶两个元素
   */
  drop2(): void {
    this.pop()
    this.pop()
  }

  /**
   * 复制栈顶两个元素
   */
  dup2(): void {
    if (this.items.length < 2) {
      throw new Error('栈元素不足：需要至少 2 个元素')
    }
    const a = this.peekAt(1)
    const b = this.peekAt(0)
    this.push(a)
    this.push(b)
  }

  /**
   * 复制栈顶三个元素
   */
  dup3(): void {
    if (this.items.length < 3) {
      throw new Error('栈元素不足：需要至少 3 个元素')
    }
    const a = this.peekAt(2)
    const b = this.peekAt(1)
    const c = this.peekAt(0)
    this.push(a)
    this.push(b)
    this.push(c)
  }

  /**
   * 复制栈顶第三、四个元素到栈顶
   */
  over2(): void {
    if (this.items.length < 4) {
      throw new Error('栈元素不足：需要至少 4 个元素')
    }
    const a = this.peekAt(3)
    const b = this.peekAt(2)
    this.push(a)
    this.push(b)
  }

  /**
   * 交换栈顶两对元素
   * [x1, x2, x3, x4] -> [x3, x4, x1, x2]
   */
  swap2(): void {
    if (this.items.length < 4) {
      throw new Error('栈元素不足：需要至少 4 个元素')
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
   * 获取所有元素（从栈底到栈顶）
   */
  getItems(): StackElement[] {
    return [...this.items]
  }

  /**
   * 转换为字符串（用于调试）
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
 * 栈元素工具函数
 */
export const StackUtils = {
  /**
   * 将数值编码为栈元素
   * 比特币使用小端序有符号整数
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

    // 如果最高位已设置，需要添加符号字节
    if (bytes[bytes.length - 1] & 0x80) {
      bytes.push(negative ? 0x80 : 0x00)
    } else if (negative) {
      bytes[bytes.length - 1] |= 0x80
    }

    return Buffer.from(bytes).toString('hex')
  },

  /**
   * 将栈元素解码为数值
   */
  decodeNumber(element: StackElement): number {
    if (element === '' || element.length === 0) return 0

    const bytes = Buffer.from(element, 'hex')
    if (bytes.length === 0) return 0

    // 检查符号位
    const negative = (bytes[bytes.length - 1] & 0x80) !== 0

    let result = 0
    for (let i = bytes.length - 1; i >= 0; i--) {
      let byte = bytes[i]
      // 最高字节需要清除符号位
      if (i === bytes.length - 1 && negative) {
        byte &= 0x7f
      }
      result = (result << 8) | byte
    }

    // 小端序重新计算
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
   * 判断栈元素是否为"真"
   * 空字符串或全零为假，其他为真
   */
  isTrue(element: StackElement): boolean {
    if (element === '' || element.length === 0) return false

    const bytes = Buffer.from(element, 'hex')
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) {
        // 最后一个字节如果只有 0x80（负零）也是假
        if (i === bytes.length - 1 && bytes[i] === 0x80) {
          return false
        }
        return true
      }
    }
    return false
  },

  /**
   * 布尔值转栈元素
   */
  encodeBool(value: boolean): StackElement {
    return value ? '01' : ''
  },

  /**
   * 字符串转栈元素（UTF-8 编码）
   */
  encodeString(str: string): StackElement {
    return Buffer.from(str, 'utf8').toString('hex')
  },

  /**
   * 栈元素转字符串
   */
  decodeString(element: StackElement): string {
    return Buffer.from(element, 'hex').toString('utf8')
  },
}


