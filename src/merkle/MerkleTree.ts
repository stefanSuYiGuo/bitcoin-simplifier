import {Hash} from '../crypto'

/**
 * Merkle tree node.
 */
export interface MerkleNode {
  hash: string
  left?: MerkleNode
  right?: MerkleNode
}

/**
 * Element in a Merkle proof.
 */
export interface MerkleProofElement {
  hash: string
  position: 'left' | 'right'
}

/**
 * Pointer-based Merkle tree implementation.
 * Efficiently verifies whether a transaction belongs to a block.
 *
 * Uses left and right object references to build an actual tree rather than
 * calculating array indices, making the code clearer and type-safe.
 */
export class MerkleTree {
  private root: MerkleNode | null = null
  private leaves: string[] = []

  constructor(data: string[]) {
    if (data.length === 0) {
      throw new Error('A Merkle tree requires at least one data element')
    }

    this.leaves = data.map((item) => Hash.sha256(item))
    this.root = this.buildTree(this.leaves)
  }

  /**
   * Build the Merkle tree.
   */
  private buildTree(hashes: string[]): MerkleNode {
    // Create leaf nodes
    const leafNodes: MerkleNode[] = hashes.map((hash) => ({hash}))

    // Build the tree recursively
    return this.buildTreeFromNodes(leafNodes)
  }

  /**
   * Build a pointer-based tree from an array of nodes.
   */
  private buildTreeFromNodes(nodes: MerkleNode[]): MerkleNode {
    // A single remaining node is the root
    if (nodes.length === 1) {
      return nodes[0]
    }

    const parentNodes: MerkleNode[] = []

    // Pair nodes to build their parents
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

    // Build the next level recursively
    return this.buildTreeFromNodes(parentNodes)
  }

  /**
   * Get the Merkle root hash.
   */
  getRoot(): string {
    if (!this.root) {
      throw new Error('Merkle tree has not been built')
    }
    return this.root.hash
  }

  /**
   * Get the complete tree node structure.
   */
  getRootNode(): MerkleNode | null {
    return this.root
  }

  /**
   * Generate a Merkle proof that data belongs to the tree.
   */
  getProof(data: string): MerkleProofElement[] {
    const targetHash = Hash.sha256(data)

    if (!this.root) {
      throw new Error('Merkle tree has not been built')
    }

    const proof = this.buildProof(targetHash, this.root)

    if (!proof) {
      throw new Error('Data is not present in the Merkle tree')
    }

    return proof
  }

  /**
   * Build a pointer-based Merkle proof path.
   * Recursively searches from the root and collects sibling nodes along the path.
   */
  private buildProof(
    targetHash: string,
    node: MerkleNode
  ): MerkleProofElement[] | null {
    // Check a leaf node
    if (!node.left && !node.right) {
      return node.hash === targetHash ? [] : null
    }

    // Search the left subtree
    if (node.left) {
      const leftProof = this.buildProof(targetHash, node.left)
      if (leftProof !== null) {
        // Add the right sibling to the proof
        if (node.right) {
          leftProof.push({
            hash: node.right.hash,
            position: 'right',
          })
        }
        return leftProof
      }
    }

    // Search the right subtree
    if (node.right) {
      const rightProof = this.buildProof(targetHash, node.right)
      if (rightProof !== null) {
        // Add the left sibling to the proof
        if (node.left) {
          rightProof.push({
            hash: node.left.hash,
            position: 'left',
          })
        }
        return rightProof
      }
    }

    // Target not found
    return null
  }

  /**
   * Verify a Merkle proof.
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
   * Get the number of leaf nodes.
   */
  getLeafCount(): number {
    return this.leaves.length
  }

  /**
   * Get the tree height.
   */
  getHeight(): number {
    return Math.ceil(Math.log2(this.leaves.length)) + 1
  }

  /**
   * Convert the tree to JSON for debugging.
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
