import {Block} from './Block'

/**
 * Mining result.
 */
export interface MiningResult {
  nonce: number
  hash: string
  attempts: number
  duration: number // Milliseconds
  hashRate: number // Hashes per second
}

/**
 * Proof-of-work algorithm.
 * Tries nonce values until the block hash meets the difficulty target.
 */
export class ProofOfWork {
  /**
   * Find a valid nonce for a block.
   */
  static mine(block: Block): MiningResult {
    const startTime = Date.now()
    let nonce = 0
    let hash: string
    const target = '0'.repeat(block.difficulty)

    while (true) {
      block.setNonce(nonce)
      hash = block.hash

      // Report progress every 1,000 attempts
      if (nonce > 0 && nonce % 1000 === 0) {
        console.log(
          `Mining... ${nonce} attempts, current hash: ${hash.substring(0, 16)}...`
        )
      }

      if (hash.startsWith(target)) {
        const endTime = Date.now()
        const duration = endTime - startTime
        const hashRate =
          duration > 0 ? Math.floor((nonce / duration) * 1000) : nonce

        console.log(
          `Block mined! Total attempts: ${nonce}, duration: ${duration}ms, hash rate: ${hashRate} H/s`
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

      // Prevent an infinite loop, although this limit is unlikely to be reached
      if (nonce > Number.MAX_SAFE_INTEGER) {
        throw new Error('Maximum nonce reached; mining failed')
      }
    }
  }

  /**
   * Verify a block's proof of work.
   */
  static verify(block: Block): boolean {
    const target = '0'.repeat(block.difficulty)
    return block.hash.startsWith(target)
  }

  /**
   * Estimate the attempts required for a given difficulty.
   * At difficulty n, mining requires 16^n attempts on average.
   */
  static estimateAttempts(difficulty: number): number {
    return Math.pow(16, difficulty)
  }

  /**
   * Estimate mining time in seconds from the hash rate.
   */
  static estimateMiningTime(difficulty: number, hashRate: number): number {
    const attempts = this.estimateAttempts(difficulty)
    return attempts / hashRate
  }

  /**
   * Calculate the difficulty target.
   * A higher difficulty produces a smaller target and a harder search.
   */
  static getDifficultyTarget(difficulty: number): string {
    return '0'.repeat(difficulty) + 'f'.repeat(64 - difficulty)
  }

  /**
   * Check whether a hash meets the difficulty target.
   */
  static meetsTarget(hash: string, difficulty: number): boolean {
    const target = '0'.repeat(difficulty)
    return hash.startsWith(target)
  }

  /**
   * Calculate the relative difference between two difficulty levels.
   * Returns the multiplier of difficulty2 relative to difficulty1.
   */
  static getRelativeDifficulty(
    difficulty1: number,
    difficulty2: number
  ): number {
    return Math.pow(16, difficulty2 - difficulty1)
  }
}
