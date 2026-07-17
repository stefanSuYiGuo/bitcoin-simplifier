import {Wallet} from '../Wallet'

describe('Wallet', () => {
  describe('构造函数', () => {
    it('应该创建新钱包', () => {
      const wallet = new Wallet()

      expect(wallet.privateKey).toBeTruthy()
      expect(wallet.publicKey).toBeTruthy()
      expect(wallet.address).toBeTruthy()
    })

    it('应该从私钥创建钱包', () => {
      const wallet1 = new Wallet()
      const privateKey = wallet1.privateKey

      const wallet2 = Wallet.fromPrivateKey(privateKey)

      expect(wallet2.privateKey).toBe(wallet1.privateKey)
      expect(wallet2.publicKey).toBe(wallet1.publicKey)
      expect(wallet2.address).toBe(wallet1.address)
    })

    it('不同钱包应该有不同地址', () => {
      const wallet1 = new Wallet()
      const wallet2 = new Wallet()

      expect(wallet1.address).not.toBe(wallet2.address)
    })
  })

  describe('地址生成', () => {
    it('地址应该是 Base58 格式', () => {
      const wallet = new Wallet()

      // Base58 字符集（不包含 0, O, I, l）
      const base58Regex =
        /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
      expect(wallet.address).toMatch(base58Regex)
    })

    it('地址长度应该在合理范围内', () => {
      const wallet = new Wallet()

      expect(wallet.address.length).toBeGreaterThanOrEqual(20)
      expect(wallet.address.length).toBeLessThanOrEqual(40)
    })

    it('相同私钥应该生成相同地址', () => {
      const wallet1 = new Wallet()
      const wallet2 = new Wallet(wallet1.privateKey)

      expect(wallet2.address).toBe(wallet1.address)
    })
  })

  describe('签名和验证', () => {
    it('应该能够签名和验证数据', () => {
      const wallet = new Wallet()
      const data = 'transaction data'

      const signature = wallet.sign(data)
      const isValid = wallet.verify(data, signature)

      expect(signature).toBeTruthy()
      expect(isValid).toBe(true)
    })

    it('修改数据后签名应该无效', () => {
      const wallet = new Wallet()
      const data = 'original data'

      const signature = wallet.sign(data)
      const isValid = wallet.verify('modified data', signature)

      expect(isValid).toBe(false)
    })

    it('应该能够签名交易对象', () => {
      const wallet = new Wallet()
      const transaction = {
        from: wallet.address,
        to: 'recipient address',
        amount: 50,
      }

      const txData = JSON.stringify(transaction)
      const signature = wallet.sign(txData)
      const isValid = wallet.verify(txData, signature)

      expect(isValid).toBe(true)
    })

    it('应该支持跨钱包验证签名（真实比特币场景）', () => {
      // Alice 创建钱包并签名交易
      const alice = new Wallet()
      const bob = new Wallet()

      // 构建交易，包含公钥字段
      const transaction = {
        from: alice.address,
        to: bob.address,
        amount: 50,
        publicKey: alice.publicKey, // 交易中包含发送者的公钥
      }
      const txData = JSON.stringify(transaction)

      // Alice 签名交易
      const signature = alice.sign(txData)

      // Bob（或矿工）从交易中获取公钥并验证签名
      // 这是比特币交易验证的真实场景
      const {Signature} = require('../../crypto/signature')
      const publicKeyFromTx = transaction.publicKey // 从交易中获取公钥
      const isValid = Signature.verify(txData, signature, publicKeyFromTx)

      expect(isValid).toBe(true)
    })

    it('使用错误的公钥验证应该失败', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      // Alice 创建交易
      const transaction = {
        data: 'transaction data',
        publicKey: alice.publicKey,
      }
      const txData = JSON.stringify(transaction)
      const signature = alice.sign(txData)

      // 如果有人篡改交易中的公钥为 Bob 的公钥
      const tamperedTransaction = {
        ...transaction,
        publicKey: bob.publicKey, // 篡改为 Bob 的公钥
      }

      // 尝试用篡改后的公钥验证 Alice 的签名应该失败
      const {Signature} = require('../../crypto/signature')
      const isValid = Signature.verify(
        txData,
        signature,
        tamperedTransaction.publicKey
      )

      expect(isValid).toBe(false)
    })

    it('交易场景：完整的签名和验证流程', () => {
      // 创建三个用户
      const alice = new Wallet()
      const bob = new Wallet()
      const miner = new Wallet()

      // Alice 想给 Bob 转账，创建交易
      const transaction = {
        inputs: [
          {
            txId: 'prev_tx_id',
            outputIndex: 0,
            publicKey: alice.publicKey, // 交易中包含公钥
            signature: '', // 签名字段初始为空
          },
        ],
        outputs: [
          {
            amount: 50,
            address: bob.address,
          },
        ],
        timestamp: Date.now(),
      }

      const txData = JSON.stringify(transaction)
      const signature = alice.sign(txData)

      // 将签名添加到交易中
      transaction.inputs[0].signature = signature

      // 矿工从交易输入中获取公钥并验证签名
      const {Signature} = require('../../crypto/signature')
      const publicKeyFromInput = transaction.inputs[0].publicKey // 从交易中获取
      const isValidForMiner = Signature.verify(
        txData,
        signature,
        publicKeyFromInput
      )

      // Bob 也可以从交易中获取公钥来验证
      const publicKeyForBob = transaction.inputs[0].publicKey // 从交易中获取
      const isValidForBob = Signature.verify(txData, signature, publicKeyForBob)

      expect(isValidForMiner).toBe(true)
      expect(isValidForBob).toBe(true)

      // 验证公钥对应的地址（额外的安全检查）
      // 在真实场景中，还需要验证公钥对应的地址是否拥有被引用的 UTXO
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')
      const sha256Hash = Hash.sha256(publicKeyFromInput)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // 这个地址应该匹配 Alice 的地址
      expect(addressFromPublicKey).toBe(alice.address)
    })

    it('无法伪造他人的交易（安全性测试）', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')

      // 场景：Bob 想伪造 Alice 的交易，盗取 Alice 的比特币

      // 尝试 1：Bob 创建交易，使用 Alice 的公钥，但用自己的私钥签名
      const transaction1 = {
        from: alice.address,
        to: bob.address,
        amount: 100,
        publicKey: alice.publicKey, // 使用 Alice 的公钥
      }
      const txData1 = JSON.stringify(transaction1)
      const bobSignature = bob.sign(txData1) // Bob 用自己的私钥签名

      // 验证失败：签名与公钥不匹配
      const isValid1 = Signature.verify(
        txData1,
        bobSignature,
        transaction1.publicKey
      )
      expect(isValid1).toBe(false) // Bob 的签名无法通过 Alice 公钥的验证

      // 尝试 2：Bob 使用自己的公钥，但试图从 Alice 的地址转账
      const transaction2 = {
        from: alice.address, // 声称从 Alice 转账
        to: bob.address,
        amount: 100,
        publicKey: bob.publicKey, // 使用 Bob 自己的公钥
      }
      const txData2 = JSON.stringify(transaction2)
      const bobSignature2 = bob.sign(txData2) // Bob 用自己的私钥签名

      // 签名验证通过，但地址验证失败
      const isSignatureValid = Signature.verify(
        txData2,
        bobSignature2,
        transaction2.publicKey
      )
      expect(isSignatureValid).toBe(true) // 签名本身是有效的

      // 但是！公钥对应的地址不是 Alice 的地址
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')
      const sha256Hash = Hash.sha256(transaction2.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      expect(addressFromPublicKey).not.toBe(alice.address) // 地址不匹配！
      expect(addressFromPublicKey).toBe(bob.address) // 实际是 Bob 的地址

      // 结论：系统会拒绝这笔交易，因为：
      // 1. 交易声称从 Alice 的地址转账
      // 2. 但公钥对应的是 Bob 的地址
      // 3. 这意味着 Bob 没有权限花费 Alice 的 UTXO
    })

    it('只有拥有私钥的人才能创建有效交易', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // Alice 创建正确的交易
      const validTransaction = {
        from: alice.address,
        to: bob.address,
        amount: 50,
        publicKey: alice.publicKey,
      }
      const txData = JSON.stringify(validTransaction)
      const aliceSignature = alice.sign(txData)

      // 验证签名
      const isSignatureValid = Signature.verify(
        txData,
        aliceSignature,
        validTransaction.publicKey
      )
      expect(isSignatureValid).toBe(true)

      // 验证公钥对应的地址
      const sha256Hash = Hash.sha256(validTransaction.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)
      expect(addressFromPublicKey).toBe(alice.address)

      // 只有两个验证都通过，交易才有效：
      // ✓ 签名有效（证明签名者拥有私钥）
      // ✓ 地址匹配（证明签名者有权花费这个地址的 UTXO）
      const isTransactionValid =
        isSignatureValid && addressFromPublicKey === validTransaction.from

      expect(isTransactionValid).toBe(true)
    })

    it('详细解释：Bob 放入自己的公钥也无法偷取 Alice 的 UTXO', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // 假设 Alice 有一个 UTXO
      const aliceUTXO = {
        txId: 'utxo_123',
        outputIndex: 0,
        amount: 100,
        ownerAddress: alice.address, // 这个 UTXO 属于 Alice
      }

      // Bob 想偷这个 UTXO，他创建一个交易
      const bobFakeTransaction = {
        inputs: [
          {
            txId: aliceUTXO.txId, // 引用 Alice 的 UTXO
            outputIndex: aliceUTXO.outputIndex,
            publicKey: bob.publicKey, // Bob 放入自己的公钥
          },
        ],
        outputs: [
          {
            amount: 100,
            address: bob.address, // 转给自己
          },
        ],
      }

      const txData = JSON.stringify(bobFakeTransaction)
      const bobSignature = bob.sign(txData) // Bob 用自己的私钥签名

      // === 验证过程 ===

      // 第一步：验证签名（会通过）
      const publicKeyFromTx = bobFakeTransaction.inputs[0].publicKey
      const isSignatureValid = Signature.verify(
        txData,
        bobSignature,
        publicKeyFromTx
      )
      expect(isSignatureValid).toBe(true) // ✓ 签名是有效的

      // 第二步：验证权限（会失败！）
      // 从交易中的公钥计算地址
      const sha256Hash = Hash.sha256(publicKeyFromTx)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // 比较：计算出的地址 vs UTXO 的所有者地址
      console.log('从公钥计算的地址:', addressFromPublicKey)
      console.log('UTXO 所有者地址:', aliceUTXO.ownerAddress)

      expect(addressFromPublicKey).toBe(bob.address) // 计算出的是 Bob 的地址
      expect(addressFromPublicKey).not.toBe(aliceUTXO.ownerAddress) // 不是 Alice 的地址

      // 权限检查失败
      const hasPermission = addressFromPublicKey === aliceUTXO.ownerAddress
      expect(hasPermission).toBe(false) // ✗ Bob 没有权限

      // 结论：
      // 虽然 Bob 可以：
      // ✓ 在交易中放入自己的公钥
      // ✓ 用自己的私钥生成有效的签名
      //
      // 但是他不能：
      // ✗ 花费 Alice 的 UTXO
      //
      // 因为：
      // Bob 的公钥 → 计算出 Bob 的地址
      // Bob 的地址 ≠ Alice 的地址（UTXO 所有者）
      // → 系统拒绝交易
    })

    it('对比：Alice 可以花费自己的 UTXO', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const {Signature} = require('../../crypto/signature')
      const {Hash} = require('../../crypto/hash')
      const {encodeBase58} = require('../../utils/base58')

      // Alice 有一个 UTXO
      const aliceUTXO = {
        txId: 'utxo_123',
        outputIndex: 0,
        amount: 100,
        ownerAddress: alice.address, // 属于 Alice
      }

      // Alice 创建交易
      const aliceTransaction = {
        inputs: [
          {
            txId: aliceUTXO.txId,
            outputIndex: aliceUTXO.outputIndex,
            publicKey: alice.publicKey, // Alice 放入自己的公钥
          },
        ],
        outputs: [
          {
            amount: 50,
            address: bob.address,
          },
          {
            amount: 50,
            address: alice.address, // 找零
          },
        ],
      }

      const txData = JSON.stringify(aliceTransaction)
      const aliceSignature = alice.sign(txData)

      // === 验证过程 ===

      // 第一步：验证签名
      const publicKeyFromTx = aliceTransaction.inputs[0].publicKey
      const isSignatureValid = Signature.verify(
        txData,
        aliceSignature,
        publicKeyFromTx
      )
      expect(isSignatureValid).toBe(true) // ✓

      // 第二步：验证权限
      const sha256Hash = Hash.sha256(publicKeyFromTx)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      expect(addressFromPublicKey).toBe(alice.address) // 是 Alice 的地址
      expect(addressFromPublicKey).toBe(aliceUTXO.ownerAddress) // 匹配 UTXO 所有者

      // 权限检查通过
      const hasPermission = addressFromPublicKey === aliceUTXO.ownerAddress
      expect(hasPermission).toBe(true) // ✓ Alice 有权限

      // 交易有效！
      const isTransactionValid = isSignatureValid && hasPermission
      expect(isTransactionValid).toBe(true)
    })
  })

  describe('导出功能', () => {
    it('应该能够导出钱包信息', () => {
      const wallet = new Wallet()
      const exported = wallet.export()

      expect(exported).toHaveProperty('privateKey')
      expect(exported).toHaveProperty('publicKey')
      expect(exported).toHaveProperty('address')
      expect(exported.privateKey).toBe(wallet.privateKey)
      expect(exported.publicKey).toBe(wallet.publicKey)
      expect(exported.address).toBe(wallet.address)
    })

    it('导出的私钥可以用于恢复钱包', () => {
      const wallet1 = new Wallet()
      const exported = wallet1.export()

      const wallet2 = Wallet.fromPrivateKey(exported.privateKey)

      expect(wallet2.address).toBe(wallet1.address)
      expect(wallet2.publicKey).toBe(wallet1.publicKey)
    })
  })

  describe('isValidAddress', () => {
    it('应该验证有效的地址', () => {
      const wallet = new Wallet()

      const isValid = Wallet.isValidAddress(wallet.address)

      expect(isValid).toBe(true)
    })

    it('应该拒绝空字符串', () => {
      expect(Wallet.isValidAddress('')).toBe(false)
    })

    it('应该拒绝太短的地址', () => {
      expect(Wallet.isValidAddress('1234')).toBe(false)
    })

    it('应该拒绝包含无效字符的地址', () => {
      // 包含 0, O, I, l 等无效 Base58 字符
      expect(Wallet.isValidAddress('0OIl' + 'a'.repeat(30))).toBe(false)
    })

    it('应该拒绝太长的地址', () => {
      const longAddress = '1' + 'a'.repeat(50)
      expect(Wallet.isValidAddress(longAddress)).toBe(false)
    })
  })

  describe('toString', () => {
    it('应该返回可读的字符串表示', () => {
      const wallet = new Wallet()
      const str = wallet.toString()

      expect(str).toContain('Wallet')
      expect(str).toContain(wallet.address.substring(0, 10))
    })
  })

  describe('边界情况', () => {
    it('应该能够签名空字符串', () => {
      const wallet = new Wallet()

      const signature = wallet.sign('')
      const isValid = wallet.verify('', signature)

      expect(isValid).toBe(true)
    })

    it('应该能够处理长数据', () => {
      const wallet = new Wallet()
      const longData = 'x'.repeat(10000)

      const signature = wallet.sign(longData)
      const isValid = wallet.verify(longData, signature)

      expect(isValid).toBe(true)
    })
  })
})
