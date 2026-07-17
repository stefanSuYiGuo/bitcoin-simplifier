import {MerkleTree} from '../MerkleTree'

describe('MerkleTree', () => {
  describe('tree construction', () => {
    test('creates a Merkle tree from a single data element', () => {
      const data = ['tx1']
      const tree = new MerkleTree(data)

      expect(tree.getRoot()).toBeDefined()
      expect(tree.getLeafCount()).toBe(1)
    })

    test('creates a Merkle tree from multiple data elements', () => {
      const data = ['tx1', 'tx2', 'tx3', 'tx4']
      const tree = new MerkleTree(data)

      expect(tree.getRoot()).toBeDefined()
      expect(tree.getLeafCount()).toBe(4)
      expect(tree.getHeight()).toBe(3)
    })

    test('rejects empty data', () => {
      expect(() => new MerkleTree([])).toThrow()
    })

    test('duplicates the final element when the count is odd', () => {
      const data = ['tx1', 'tx2', 'tx3']
      const tree = new MerkleTree(data)

      expect(tree.getLeafCount()).toBe(3)
      expect(tree.getRoot()).toBeDefined()
    })
  })

  describe('Merkle root', () => {
    test('produces the same Merkle root for identical data', () => {
      const data = ['tx1', 'tx2', 'tx3']
      const tree1 = new MerkleTree(data)
      const tree2 = new MerkleTree(data)

      expect(tree1.getRoot()).toBe(tree2.getRoot())
    })

    test('produces different Merkle roots for different data', () => {
      const tree1 = new MerkleTree(['tx1', 'tx2'])
      const tree2 = new MerkleTree(['tx1', 'tx3'])

      expect(tree1.getRoot()).not.toBe(tree2.getRoot())
    })

    test('produces different Merkle roots when data order changes', () => {
      const tree1 = new MerkleTree(['tx1', 'tx2'])
      const tree2 = new MerkleTree(['tx2', 'tx1'])

      expect(tree1.getRoot()).not.toBe(tree2.getRoot())
    })
  })

  describe('Merkle proofs', () => {
    const data = ['tx1', 'tx2', 'tx3', 'tx4']
    let tree: MerkleTree
    let root: string

    beforeEach(() => {
      tree = new MerkleTree(data)
      root = tree.getRoot()
    })

    test('generates a valid Merkle proof', () => {
      const proof = tree.getProof('tx1')
      expect(proof).toBeDefined()
      expect(proof.length).toBeGreaterThan(0)
    })

    test('verifies a correct Merkle proof', () => {
      const proof = tree.getProof('tx1')
      const isValid = MerkleTree.verify('tx1', proof, root)
      expect(isValid).toBe(true)
    })

    test('verifies every data element', () => {
      for (const item of data) {
        const proof = tree.getProof(item)
        const isValid = MerkleTree.verify(item, proof, root)
        expect(isValid).toBe(true)
      }
    })

    test('rejects incorrect data', () => {
      const proof = tree.getProof('tx1')
      const isValid = MerkleTree.verify('tx5', proof, root)
      expect(isValid).toBe(false)
    })

    test('rejects an incorrect root', () => {
      const proof = tree.getProof('tx1')
      const fakeRoot = 'fake_root'
      const isValid = MerkleTree.verify('tx1', proof, fakeRoot)
      expect(isValid).toBe(false)
    })

    test('throws for data that is not in the tree', () => {
      expect(() => tree.getProof('tx999')).toThrow()
    })
  })

  describe('tree properties', () => {
    test('calculates the tree height correctly', () => {
      expect(new MerkleTree(['tx1']).getHeight()).toBe(1)
      expect(new MerkleTree(['tx1', 'tx2']).getHeight()).toBe(2)
      expect(new MerkleTree(['tx1', 'tx2', 'tx3', 'tx4']).getHeight()).toBe(3)
      expect(
        new MerkleTree(['tx1', 'tx2', 'tx3', 'tx4', 'tx5']).getHeight()
      ).toBe(4)
    })

    test('returns the correct leaf count', () => {
      const tree = new MerkleTree(['tx1', 'tx2', 'tx3'])
      expect(tree.getLeafCount()).toBe(3)
    })
  })

  describe('serialization', () => {
    test('serializes to JSON', () => {
      const tree = new MerkleTree(['tx1', 'tx2', 'tx3'])
      const json = tree.toJSON()

      expect(json).toHaveProperty('root')
      expect(json).toHaveProperty('leafCount')
      expect(json).toHaveProperty('height')
      expect(json).toHaveProperty('leaves')
    })
  })
})
