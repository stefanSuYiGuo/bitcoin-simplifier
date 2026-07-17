import {Block} from './Block'

/**
 * 挖矿结果
 */
export interface MiningResult {
  nonce: number
  hash: string
  attempts: number
  duration: number // 毫秒
  hashRate: number // 哈希/秒
}

/**
 * 工作量证明算法
 * 通过不断尝试 nonce 值，找到满足难度要求的区块哈希
 */
export class ProofOfWork {
  /**
   * 挖矿：为区块找到有效的 nonce
   */
  static mine(block: Block): MiningResult {
    const startTime = Date.now()
    let nonce = 0
    let hash: string
    const target = '0'.repeat(block.difficulty)

    while (true) {
      block.setNonce(nonce)
      hash = block.hash

      // 每 1000 次打印一次进度
      if (nonce > 0 && nonce % 1000 === 0) {
        console.log(
          `挖矿中... 已尝试 ${nonce} 次, 当前哈希: ${hash.substring(0, 16)}...`
        )
      }

      if (hash.startsWith(target)) {
        const endTime = Date.now()
        const duration = endTime - startTime
        const hashRate =
          duration > 0 ? Math.floor((nonce / duration) * 1000) : nonce

        console.log(
          `挖矿成功！总尝试次数: ${nonce}, 用时: ${duration}ms, 哈希率: ${hashRate} H/s`
        )

        return {
          nonce,
          hash,
          attempts: nonce,
          duration,
          hashRate,
        }
      }

      nonce++

      // 防止无限循环（实际上不太可能达到）
      if (nonce > Number.MAX_SAFE_INTEGER) {
        throw new Error('达到最大 nonce 值，挖矿失败')
      }
    }
  }

  /**
   * 验证区块的工作量证明
   */
  static verify(block: Block): boolean {
    const target = '0'.repeat(block.difficulty)
    return block.hash.startsWith(target)
  }

  /**
   * 计算给定难度下的预期尝试次数
   * 难度为 n 时，平均需要 16^n 次尝试
   */
  static estimateAttempts(difficulty: number): number {
    return Math.pow(16, difficulty)
  }

  /**
   * 根据哈希率估算挖矿时间（秒）
   */
  static estimateMiningTime(difficulty: number, hashRate: number): number {
    const attempts = this.estimateAttempts(difficulty)
    return attempts / hashRate
  }

  /**
   * 计算难度目标
   * 难度越高，目标越小，越难找到满足条件的哈希
   */
  static getDifficultyTarget(difficulty: number): string {
    return '0'.repeat(difficulty) + 'f'.repeat(64 - difficulty)
  }

  /**
   * 验证哈希是否满足难度要求
   */
  static meetsTarget(hash: string, difficulty: number): boolean {
    const target = '0'.repeat(difficulty)
    return hash.startsWith(target)
  }

  /**
   * 计算两个难度之间的相对难度
   * 返回 difficulty2 相对于 difficulty1 的倍数
   */
  static getRelativeDifficulty(
    difficulty1: number,
    difficulty2: number
  ): number {
    return Math.pow(16, difficulty2 - difficulty1)
  }
}
