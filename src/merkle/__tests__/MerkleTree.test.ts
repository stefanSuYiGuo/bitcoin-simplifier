import {MerkleTree} from '../MerkleTree'

describe('MerkleTree', () => {
  describe('构建 Merkle 树', () => {
    test('应该能创建单个数据的 Merkle 树', () => {
      const data = ['tx1']
      const tree = new MerkleTree(data)

      expect(tree.getRoot()).toBeDefined()
      expect(tree.getLeafCount()).toBe(1)
    })

    test('应该能创建多个数据的 Merkle 树', () => {
      const data = ['tx1', 'tx2', 'tx3', 'tx4']
      const tree = new MerkleTree(data)

      expect(tree.getRoot()).toBeDefined()
      expect(tree.getLeafCount()).toBe(4)
      expect(tree.getHeight()).toBe(3)
    })

    test('应该拒绝空数据', () => {
      expect(() => new MerkleTree([])).toThrow()
    })

    test('奇数个数据应该复制最后一个', () => {
      const data = ['tx1', 'tx2', 'tx3']
      const tree = new MerkleTree(data)

      expect(tree.getLeafCount()).toBe(3)
      expect(tree.getRoot()).toBeDefined()
    })
  })

  describe('Merkle 根', () => {
    test('相同数据应该产生相同的 Merkle 根', () => {
      const data = ['tx1', 'tx2', 'tx3']
      const tree1 = new MerkleTree(data)
      const tree2 = new MerkleTree(data)

      expect(tree1.getRoot()).toBe(tree2.getRoot())
    })

    test('不同数据应该产生不同的 Merkle 根', () => {
      const tree1 = new MerkleTree(['tx1', 'tx2'])
      const tree2 = new MerkleTree(['tx1', 'tx3'])

      expect(tree1.getRoot()).not.toBe(tree2.getRoot())
    })

    test('数据顺序不同应该产生不同的 Merkle 根', () => {
      const tree1 = new MerkleTree(['tx1', 'tx2'])
      const tree2 = new MerkleTree(['tx2', 'tx1'])

      expect(tree1.getRoot()).not.toBe(tree2.getRoot())
    })
  })

  describe('Merkle 证明', () => {
    const data = ['tx1', 'tx2', 'tx3', 'tx4']
    let tree: MerkleTree
    let root: string

    beforeEach(() => {
      tree = new MerkleTree(data)
      root = tree.getRoot()
    })

    test('应该能生成有效的 Merkle 证明', () => {
      const proof = tree.getProof('tx1')
      expect(proof).toBeDefined()
      expect(proof.length).toBeGreaterThan(0)
    })

    test('应该能验证正确的 Merkle 证明', () => {
      const proof = tree.getProof('tx1')
      const isValid = MerkleTree.verify('tx1', proof, root)
      expect(isValid).toBe(true)
    })

    test('所有数据都应该能验证', () => {
      for (const item of data) {
        const proof = tree.getProof(item)
        const isValid = MerkleTree.verify(item, proof, root)
        expect(isValid).toBe(true)
      }
    })

    test('错误的数据应该验证失败', () => {
      const proof = tree.getProof('tx1')
      const isValid = MerkleTree.verify('tx5', proof, root)
      expect(isValid).toBe(false)
    })

    test('错误的根应该验证失败', () => {
      const proof = tree.getProof('tx1')
      const fakeRoot = 'fake_root'
      const isValid = MerkleTree.verify('tx1', proof, fakeRoot)
      expect(isValid).toBe(false)
    })

    test('不存在的数据应该抛出错误', () => {
      expect(() => tree.getProof('tx999')).toThrow()
    })
  })

  describe('树的属性', () => {
    test('应该正确计算树的高度', () => {
      expect(new MerkleTree(['tx1']).getHeight()).toBe(1)
      expect(new MerkleTree(['tx1', 'tx2']).getHeight()).toBe(2)
      expect(new MerkleTree(['tx1', 'tx2', 'tx3', 'tx4']).getHeight()).toBe(3)
      expect(
        new MerkleTree(['tx1', 'tx2', 'tx3', 'tx4', 'tx5']).getHeight()
      ).toBe(4)
    })

    test('应该正确返回叶子节点数量', () => {
      const tree = new MerkleTree(['tx1', 'tx2', 'tx3'])
      expect(tree.getLeafCount()).toBe(3)
    })
  })

  describe('序列化', () => {
    test('应该能序列化为 JSON', () => {
      const tree = new MerkleTree(['tx1', 'tx2', 'tx3'])
      const json = tree.toJSON()

      expect(json).toHaveProperty('root')
      expect(json).toHaveProperty('leafCount')
      expect(json).toHaveProperty('height')
      expect(json).toHaveProperty('leaves')
    })
  })
})
