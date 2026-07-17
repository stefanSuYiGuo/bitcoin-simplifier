/**
 * 比特币脚本操作码定义
 * 基于比特币脚本语言的子集实现
 */

/**
 * 操作码枚举
 */
export enum OpCode {
  // ============ 常量操作码 ============
  OP_0 = 0x00, // 将空字节数组压入栈
  OP_FALSE = 0x00, // OP_0 的别名
  OP_PUSHDATA1 = 0x4c, // 下一个字节是数据长度
  OP_PUSHDATA2 = 0x4d, // 下两个字节是数据长度
  OP_PUSHDATA4 = 0x4e, // 下四个字节是数据长度
  OP_1NEGATE = 0x4f, // 将 -1 压入栈
  OP_1 = 0x51, // 将 1 压入栈
  OP_TRUE = 0x51, // OP_1 的别名
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

  // ============ 流程控制 ============
  OP_NOP = 0x61, // 无操作
  OP_IF = 0x63, // 条件执行
  OP_NOTIF = 0x64, // 条件执行（取反）
  OP_ELSE = 0x67, // else 分支
  OP_ENDIF = 0x68, // 结束条件
  OP_VERIFY = 0x69, // 栈顶为 false 则失败
  OP_RETURN = 0x6a, // 标记交易无效（用于存储数据）

  // ============ 栈操作 ============
  OP_TOALTSTACK = 0x6b, // 移动到备用栈
  OP_FROMALTSTACK = 0x6c, // 从备用栈移回
  OP_IFDUP = 0x73, // 如果栈顶非零则复制
  OP_DEPTH = 0x74, // 栈深度
  OP_DROP = 0x75, // 删除栈顶元素
  OP_DUP = 0x76, // 复制栈顶元素
  OP_NIP = 0x77, // 删除栈顶第二个元素
  OP_OVER = 0x78, // 复制栈顶第二个元素到栈顶
  OP_PICK = 0x79, // 复制栈中第 n 个元素到栈顶
  OP_ROLL = 0x7a, // 移动栈中第 n 个元素到栈顶
  OP_ROT = 0x7b, // 旋转栈顶三个元素
  OP_SWAP = 0x7c, // 交换栈顶两个元素
  OP_TUCK = 0x7d, // 将栈顶元素插入到第二个位置之前
  OP_2DROP = 0x6d, // 删除栈顶两个元素
  OP_2DUP = 0x6e, // 复制栈顶两个元素
  OP_3DUP = 0x6f, // 复制栈顶三个元素
  OP_2OVER = 0x70, // 复制栈顶第三、四个元素到栈顶
  OP_2ROT = 0x71, // 旋转栈顶六个元素
  OP_2SWAP = 0x72, // 交换栈顶两对元素

  // ============ 字符串操作 ============
  OP_SIZE = 0x82, // 获取栈顶元素的字节长度

  // ============ 位运算 ============
  OP_EQUAL = 0x87, // 检查两个元素是否相等
  OP_EQUALVERIFY = 0x88, // OP_EQUAL + OP_VERIFY

  // ============ 算术运算 ============
  OP_1ADD = 0x8b, // 加 1
  OP_1SUB = 0x8c, // 减 1
  OP_NEGATE = 0x8f, // 取负
  OP_ABS = 0x90, // 取绝对值
  OP_NOT = 0x91, // 逻辑非
  OP_0NOTEQUAL = 0x92, // 非零返回 1
  OP_ADD = 0x93, // 加法
  OP_SUB = 0x94, // 减法
  OP_BOOLAND = 0x9a, // 逻辑与
  OP_BOOLOR = 0x9b, // 逻辑或
  OP_NUMEQUAL = 0x9c, // 数值相等
  OP_NUMEQUALVERIFY = 0x9d, // 数值相等 + 验证
  OP_NUMNOTEQUAL = 0x9e, // 数值不等
  OP_LESSTHAN = 0x9f, // 小于
  OP_GREATERTHAN = 0xa0, // 大于
  OP_LESSTHANOREQUAL = 0xa1, // 小于等于
  OP_GREATERTHANOREQUAL = 0xa2, // 大于等于
  OP_MIN = 0xa3, // 取最小值
  OP_MAX = 0xa4, // 取最大值
  OP_WITHIN = 0xa5, // 范围检查

  // ============ 加密操作 ============
  OP_RIPEMD160 = 0xa6, // RIPEMD-160 哈希
  OP_SHA1 = 0xa7, // SHA-1 哈希
  OP_SHA256 = 0xa8, // SHA-256 哈希
  OP_HASH160 = 0xa9, // SHA-256 + RIPEMD-160
  OP_HASH256 = 0xaa, // 双重 SHA-256
  OP_CODESEPARATOR = 0xab, // 签名分隔符
  OP_CHECKSIG = 0xac, // 验证签名
  OP_CHECKSIGVERIFY = 0xad, // 验证签名 + OP_VERIFY
  OP_CHECKMULTISIG = 0xae, // 多重签名验证
  OP_CHECKMULTISIGVERIFY = 0xaf, // 多重签名验证 + OP_VERIFY

  // ============ 锁定时间 ============
  OP_CHECKLOCKTIMEVERIFY = 0xb1, // CLTV
  OP_CHECKSEQUENCEVERIFY = 0xb2, // CSV
}

/**
 * 操作码名称映射
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
 * 从名称获取操作码
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
 * 获取操作码名称
 */
export function getOpCodeName(code: OpCode): string {
  return OpCodeNames[code] || `UNKNOWN(0x${code.toString(16)})`
}

/**
 * 判断是否是数据推送操作码 (0x01-0x4b)
 * 这些操作码直接表示后续数据的字节数
 */
export function isDataPushOpCode(code: number): boolean {
  return code >= 0x01 && code <= 0x4b
}

/**
 * 判断是否是数字常量操作码 (OP_1 到 OP_16)
 */
export function isNumberOpCode(code: number): boolean {
  return code >= OpCode.OP_1 && code <= OpCode.OP_16
}

/**
 * 从数字操作码获取数值
 */
export function getNumberFromOpCode(code: OpCode): number {
  if (code === OpCode.OP_0) return 0
  if (code === OpCode.OP_1NEGATE) return -1
  if (code >= OpCode.OP_1 && code <= OpCode.OP_16) {
    return code - OpCode.OP_1 + 1
  }
  throw new Error(`不是数字操作码: ${getOpCodeName(code)}`)
}

/**
 * 从数值获取数字操作码
 */
export function getOpCodeFromNumber(num: number): OpCode {
  if (num === 0) return OpCode.OP_0
  if (num === -1) return OpCode.OP_1NEGATE
  if (num >= 1 && num <= 16) {
    return (OpCode.OP_1 + num - 1) as OpCode
  }
  throw new Error(`数值超出操作码范围: ${num}，需要使用 PUSHDATA`)
}


