import {Transaction} from '../Transaction'
import {TxInput} from '../TxInput'
import {TxOutput} from '../TxOutput'
import {TransactionSigner} from '../TransactionSigner'
import {Wallet} from '../../wallet/Wallet'

describe('Transaction', () => {
  describe('构造函数', () => {
    it('应该创建有效的交易', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.inputs).toHaveLength(1)
      expect(tx.outputs).toHaveLength(1)
      expect(tx.id).toBeDefined()
      expect(tx.timestamp).toBeDefined()
    })

    it('应该拒绝没有输入的交易', () => {
      const output = new TxOutput(50, 'receiver_address')
      expect(() => new Transaction([], [output])).toThrow(
        '交易必须至少有一个输入'
      )
    })

    it('应该拒绝没有输出的交易', () => {
      const input = new TxInput('prev_tx_id', 0)
      expect(() => new Transaction([input], [])).toThrow(
        '交易必须至少有一个输出'
      )
    })

    it('应该为每个交易生成唯一的 ID', () => {
      const input1 = new TxInput('prev_tx_id_1', 0)
      const output1 = new TxOutput(50, 'receiver_address')
      const tx1 = new Transaction([input1], [output1])

      const input2 = new TxInput('prev_tx_id_2', 0)
      const output2 = new TxOutput(50, 'receiver_address')
      const tx2 = new Transaction([input2], [output2])

      expect(tx1.id).not.toBe(tx2.id)
    })
  })

  describe('金额计算', () => {
    it('应该正确计算输出总额', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output1 = new TxOutput(30, 'address1')
      const output2 = new TxOutput(20, 'address2')
      const tx = new Transaction([input], [output1, output2])

      expect(tx.getOutputAmount()).toBe(50)
    })

    it('应该正确计算输入总额', () => {
      const input1 = new TxInput('prev_tx_id_1', 0)
      const input2 = new TxInput('prev_tx_id_2', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input1, input2], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id_1:0', new TxOutput(30, 'sender_address'))
      utxoSet.set('prev_tx_id_2:0', new TxOutput(25, 'sender_address'))

      expect(tx.getInputAmount(utxoSet)).toBe(55)
    })

    it('应该正确计算矿工费', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.calculateFee(utxoSet)).toBe(5)
    })
  })

  describe('交易验证', () => {
    it('应该验证有效交易', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.isValid(utxoSet)).toBe(true)
    })

    it('应该拒绝输入金额小于输出金额的交易', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(55, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()
      utxoSet.set('prev_tx_id:0', new TxOutput(50, 'sender_address'))

      expect(tx.isValid(utxoSet)).toBe(false)
    })

    it('应该拒绝输出金额为负数的交易', () => {
      const input = new TxInput('prev_tx_id', 0)
      expect(() => new TxOutput(-10, 'receiver_address')).toThrow(
        '输出金额必须大于 0'
      )
    })

    it('应该拒绝引用不存在的 UTXO', () => {
      const input = new TxInput('non_existent_tx', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, TxOutput>()

      expect(tx.isValid(utxoSet)).toBe(false)
    })
  })

  describe('Coinbase 交易', () => {
    it('应该创建 Coinbase 交易', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50, 1)

      expect(coinbase.isCoinbase()).toBe(true)
      expect(coinbase.inputs).toHaveLength(1)
      expect(coinbase.outputs).toHaveLength(1)
      expect(coinbase.outputs[0].amount).toBe(50)
      expect(coinbase.outputs[0].address).toBe('miner_address')
    })

    it('Coinbase 交易应该有特殊的输入 txId', () => {
      const coinbase = Transaction.createCoinbase('miner_address', 50)

      expect(coinbase.inputs[0].txId).toBe(
        '0000000000000000000000000000000000000000000000000000000000000000'
      )
    })

    it('普通交易不应该被识别为 Coinbase', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.isCoinbase()).toBe(false)
    })
  })

  describe('序列化和反序列化', () => {
    it('应该正确序列化为 JSON', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output], 1234567890)

      const json = tx.toJSON()

      expect(json.id).toBe(tx.id)
      expect(json.inputs).toHaveLength(1)
      expect(json.outputs).toHaveLength(1)
      expect(json.timestamp).toBe(1234567890)
    })

    it('应该正确从 JSON 反序列化', () => {
      const json = {
        inputs: [
          {
            txId: 'prev_tx_id',
            outputIndex: 0,
            signature: 'signature',
            publicKey: 'publicKey',
          },
        ],
        outputs: [
          {
            amount: 50,
            address: 'receiver_address',
          },
        ],
        timestamp: 1234567890,
      }

      const tx = Transaction.fromJSON(json)

      expect(tx.inputs).toHaveLength(1)
      expect(tx.inputs[0].txId).toBe('prev_tx_id')
      expect(tx.outputs).toHaveLength(1)
      expect(tx.outputs[0].amount).toBe(50)
      expect(tx.timestamp).toBe(1234567890)
    })

    it('序列化和反序列化应该保持一致', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const originalTx = new Transaction([input], [output])

      const json = originalTx.toJSON()
      const restoredTx = Transaction.fromJSON(json)

      expect(restoredTx.inputs[0].txId).toBe(originalTx.inputs[0].txId)
      expect(restoredTx.outputs[0].amount).toBe(originalTx.outputs[0].amount)
      expect(restoredTx.timestamp).toBe(originalTx.timestamp)
    })
  })

  describe('交易签名和验证', () => {
    it('应该能够签名交易', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      expect(tx.inputs[0].isSigned()).toBe(false)

      TransactionSigner.signTransaction(tx, wallet)

      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[0].signature).toBeDefined()
      expect(tx.inputs[0].publicKey).toBe(wallet.publicKey)
    })

    it('应该能够验证已签名的交易', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      // 准备 UTXO 集合
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // 签名交易
      TransactionSigner.signTransaction(tx, wallet)

      // 验证交易
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(true)
    })

    it('应该拒绝未签名的交易', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // 不签名，直接验证
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })

    it('应该拒绝签名无效的交易', () => {
      const wallet = new Wallet()
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, 'receiver_address')
      const tx = new Transaction([input], [output])

      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: wallet.address,
      })

      // 签名交易
      TransactionSigner.signTransaction(tx, wallet)

      // 篡改交易内容
      tx.outputs[0] = new TxOutput(100, 'attacker_address')

      // 验证应该失败
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })

    it('应该拒绝使用错误公钥的交易', () => {
      const aliceWallet = new Wallet()
      const bobWallet = new Wallet()

      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(45, bobWallet.address)
      const tx = new Transaction([input], [output])

      // Alice 拥有这个 UTXO
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('prev_tx_id:0', {
        amount: 50,
        address: aliceWallet.address,
      })

      // Bob 尝试签名（使用他自己的私钥）
      TransactionSigner.signTransaction(tx, bobWallet)

      // 验证应该失败，因为公钥不匹配 UTXO 所有者
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)

      expect(isValid).toBe(false)
    })
  })

  describe('交易克隆', () => {
    it('应该能够克隆交易', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const originalTx = new Transaction([input], [output])

      const clonedTx = originalTx.clone()

      expect(clonedTx.id).toBe(originalTx.id)
      expect(clonedTx.inputs[0].txId).toBe(originalTx.inputs[0].txId)
      expect(clonedTx.outputs[0].amount).toBe(originalTx.outputs[0].amount)

      // 修改克隆不应该影响原交易
      clonedTx.inputs[0].signature = 'new_signature'
      expect(originalTx.inputs[0].signature).toBe('signature')
    })
  })

  describe('获取用于签名的内容', () => {
    it('应该返回不包含签名的交易内容', () => {
      const input = new TxInput('prev_tx_id', 0, 'signature', 'publicKey')
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const content = tx.getContentForSigning()
      const parsed = JSON.parse(content)

      // 签名内容不应该包含签名和公钥
      expect(parsed.inputs[0].signature).toBeUndefined()
      expect(parsed.inputs[0].publicKey).toBeUndefined()

      // 应该包含基本信息
      expect(parsed.inputs[0].txId).toBe('prev_tx_id')
      expect(parsed.outputs[0].amount).toBe(50)
    })
  })

  describe('toString', () => {
    it('应该返回可读的字符串表示', () => {
      const input = new TxInput('prev_tx_id', 0)
      const output = new TxOutput(50, 'receiver_address')
      const tx = new Transaction([input], [output])

      const str = tx.toString()

      expect(str).toContain('Transaction')
      expect(str).toContain('inputs: 1')
      expect(str).toContain('outputs: 1')
      expect(str).toContain('amount: 50')
    })
  })

  describe('多方交易签名', () => {
    it('应该支持不同输入由不同钱包签名', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      // 创建一个有多个输入的交易
      // Alice 有一个 UTXO：50 BTC
      // Bob 有一个 UTXO：30 BTC
      // 他们合作向 Charlie 转账 75 BTC
      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output1 = new TxOutput(75, charlie.address)
      const output2 = new TxOutput(5, alice.address) // 找零给 Alice

      const tx = new Transaction([input1, input2], [output1, output2])

      // 准备 UTXO 集合
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // 使用不同钱包签名不同输入
      TransactionSigner.signTransactionWithWallets(tx, [alice, bob])

      // 验证每个输入的签名都不同
      expect(tx.inputs[0].signature).toBeDefined()
      expect(tx.inputs[1].signature).toBeDefined()
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // 验证每个输入的公钥不同
      expect(tx.inputs[0].publicKey).toBe(alice.publicKey)
      expect(tx.inputs[1].publicKey).toBe(bob.publicKey)

      // 验证交易
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)
    })

    it('应该支持使用钱包映射签名', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, charlie.address)

      const tx = new Transaction([input1, input2], [output])

      // 准备 UTXO 集合
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // 创建钱包映射
      const walletMap = new Map<string, Wallet>()
      walletMap.set(alice.address, alice)
      walletMap.set(bob.address, bob)

      // 使用钱包映射签名
      TransactionSigner.signTransactionWithWalletMap(tx, walletMap, utxoSet)

      // 验证签名不同
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // 验证交易
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)
    })

    it('应该支持单个输入签名', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const charlie = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, charlie.address)

      const tx = new Transaction([input1, input2], [output])

      // Alice 先签名她的输入
      const success1 = TransactionSigner.signInput(tx, 0, alice)
      expect(success1).toBe(true)
      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[1].isSigned()).toBe(false)

      // Bob 再签名他的输入
      const success2 = TransactionSigner.signInput(tx, 1, bob)
      expect(success2).toBe(true)
      expect(tx.inputs[1].isSigned()).toBe(true)

      // 两个签名应该不同
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)
      expect(tx.inputs[0].publicKey).toBe(alice.publicKey)
      expect(tx.inputs[1].publicKey).toBe(bob.publicKey)
    })

    it('signTransactionWithWallets 应该拒绝钱包数量不匹配', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, 'charlie_address')

      const tx = new Transaction([input1, input2], [output])

      // 只提供一个钱包，但有两个输入
      expect(() => {
        TransactionSigner.signTransactionWithWallets(tx, [alice])
      }).toThrow('钱包数量')
    })

    it('signTransactionWithWalletMap 应该拒绝找不到钱包', () => {
      const alice = new Wallet()
      const bob = new Wallet()

      const input1 = new TxInput('tx_alice', 0)
      const input2 = new TxInput('tx_bob', 0)
      const output = new TxOutput(75, 'charlie_address')

      const tx = new Transaction([input1, input2], [output])

      // 准备 UTXO 集合
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice:0', {amount: 50, address: alice.address})
      utxoSet.set('tx_bob:0', {amount: 30, address: bob.address})

      // 只提供 Alice 的钱包，缺少 Bob 的
      const walletMap = new Map<string, Wallet>()
      walletMap.set(alice.address, alice)

      expect(() => {
        TransactionSigner.signTransactionWithWalletMap(tx, walletMap, utxoSet)
      }).toThrow('没有找到地址')
    })

    it('多方交易实际场景：Alice 和 Bob 合买一件商品', () => {
      const alice = new Wallet()
      const bob = new Wallet()
      const merchant = new Wallet()

      // Alice 有 40 BTC，Bob 有 35 BTC
      // 商品价格 70 BTC，他们合作购买
      const input1 = new TxInput('tx_alice_prev', 0)
      const input2 = new TxInput('tx_bob_prev', 0)
      const output1 = new TxOutput(70, merchant.address) // 支付给商家
      const output2 = new TxOutput(5, alice.address) // 找零给 Alice

      const tx = new Transaction([input1, input2], [output1, output2])

      // 准备 UTXO 集合
      const utxoSet = new Map<string, {amount: number; address: string}>()
      utxoSet.set('tx_alice_prev:0', {amount: 40, address: alice.address})
      utxoSet.set('tx_bob_prev:0', {amount: 35, address: bob.address})

      // Alice 和 Bob 分别签名各自的输入
      TransactionSigner.signInput(tx, 0, alice)
      TransactionSigner.signInput(tx, 1, bob)

      // 检查签名确实不同
      expect(tx.inputs[0].signature).not.toBe(tx.inputs[1].signature)

      // 验证整个交易
      const isValid = TransactionSigner.verifyTransaction(tx, utxoSet)
      expect(isValid).toBe(true)

      // 验证金额
      expect(
        tx.getInputAmount(
          new Map([
            ['tx_alice_prev:0', new TxOutput(40, alice.address)],
            ['tx_bob_prev:0', new TxOutput(35, bob.address)],
          ] as any)
        )
      ).toBe(75)
      expect(tx.getOutputAmount()).toBe(75)
      expect(
        tx.calculateFee(
          new Map([
            ['tx_alice_prev:0', new TxOutput(40, alice.address)],
            ['tx_bob_prev:0', new TxOutput(35, bob.address)],
          ] as any)
        )
      ).toBe(0)
    })
  })
})
