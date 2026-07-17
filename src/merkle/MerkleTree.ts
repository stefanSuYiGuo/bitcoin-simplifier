import {Hash} from '../crypto'

/**
 * Merkle 树节点
 */
export interface MerkleNode {
  hash: string
  left?: MerkleNode
  right?: MerkleNode
}

/**
 * Merkle 证明的一个元素
 */
export interface MerkleProofElement {
  hash: string
  position: 'left' | 'right'
}

/**
 * Merkle 树实现（纯指针式）
 * 用于高效验证交易是否在区块中
 *
 * 实现方式：使用对象引用（left/right）构建真正的树形结构，
 * 而不是数组索引计算。这使得代码更直观、类型更安全。
 */
export class MerkleTree {
  private root: MerkleNode | null = null
  private leaves: string[] = []

  constructor(data: string[]) {
    if (data.length === 0) {
      throw new Error('Merkle 树至少需要一个数据元素')
    }

    this.leaves = data.map((item) => Hash.sha256(item))
    this.root = this.buildTree(this.leaves)
  }

  /**
   * 构建 Merkle 树
   */
  private buildTree(hashes: string[]): MerkleNode {
    // 创建叶子节点
    const leafNodes: MerkleNode[] = hashes.map((hash) => ({hash}))

    // 递归构建树
    return this.buildTreeFromNodes(leafNodes)
  }

  /**
   * 从节点数组构建树（纯指针式）
   */
  private buildTreeFromNodes(nodes: MerkleNode[]): MerkleNode {
    // 如果只有一个节点，它就是根节点
    if (nodes.length === 1) {
      return nodes[0]
    }

    const parentNodes: MerkleNode[] = []

    // 两两配对构建父节点
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i]
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i]

      const parent: MerkleNode = {
        hash: Hash.sha256(left.hash + right.hash),
        left,
        right,
      }

      parentNodes.push(parent)
    }

    // 递归构建上层
    return this.buildTreeFromNodes(parentNodes)
  }

  /**
   * 获取 Merkle 根哈希
   */
  getRoot(): string {
    if (!this.root) {
      throw new Error('Merkle 树未构建')
    }
    return this.root.hash
  }

  /**
   * 获取完整的树节点结构
   */
  getRootNode(): MerkleNode | null {
    return this.root
  }

  /**
   * 生成 Merkle 证明
   * 用于证明某个数据在树中
   */
  getProof(data: string): MerkleProofElement[] {
    const targetHash = Hash.sha256(data)

    if (!this.root) {
      throw new Error('Merkle 树未构建')
    }

    const proof = this.buildProof(targetHash, this.root)

    if (!proof) {
      throw new Error('数据不在 Merkle 树中')
    }

    return proof
  }

  /**
   * 构建 Merkle 证明路径（纯指针式）
   * 从根节点开始递归查找目标哈希，并收集路径上的兄弟节点
   */
  private buildProof(
    targetHash: string,
    node: MerkleNode
  ): MerkleProofElement[] | null {
    // 如果是叶子节点
    if (!node.left && !node.right) {
      return node.hash === targetHash ? [] : null
    }

    // 在左子树中查找
    if (node.left) {
      const leftProof = this.buildProof(targetHash, node.left)
      if (leftProof !== null) {
        // 找到了，添加右兄弟节点到证明中
        if (node.right) {
          leftProof.push({
            hash: node.right.hash,
            position: 'right',
          })
        }
        return leftProof
      }
    }

    // 在右子树中查找
    if (node.right) {
      const rightProof = this.buildProof(targetHash, node.right)
      if (rightProof !== null) {
        // 找到了，添加左兄弟节点到证明中
        if (node.left) {
          rightProof.push({
            hash: node.left.hash,
            position: 'left',
          })
        }
        return rightProof
      }
    }

    // 未找到
    return null
  }

  /**
   * 验证 Merkle 证明
   */
  static verify(
    data: string,
    proof: MerkleProofElement[],
    root: string
  ): boolean {
    let hash = Hash.sha256(data)

    for (const element of proof) {
      if (element.position === 'left') {
        hash = Hash.sha256(element.hash + hash)
      } else {
        hash = Hash.sha256(hash + element.hash)
      }
    }

    return hash === root
  }

  /**
   * 获取叶子节点数量
   */
  getLeafCount(): number {
    return this.leaves.length
  }

  /**
   * 获取树的高度
   */
  getHeight(): number {
    return Math.ceil(Math.log2(this.leaves.length)) + 1
  }

  /**
   * 将树转换为 JSON 格式（用于调试）
   */
  toJSON(): object {
    return {
      root: this.root?.hash,
      leafCount: this.leaves.length,
      height: this.getHeight(),
      leaves: this.leaves,
    }
  }
}
