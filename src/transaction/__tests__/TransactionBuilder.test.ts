import {TransactionBuilder} from '../TransactionBuilder'
import {UTXOSet} from '../UTXO'
import {TxOutput} from '../TxOutput'
import {Wallet} from '../../wallet/Wallet'
import {TransactionSigner} from '../TransactionSigner'
import {Transaction} from '../Transaction'

describe('TransactionBuilder', () => {
  let utxoSet: UTXOSet
  let aliceWallet: Wallet
  let bobWallet: Wallet

  beforeEach(() => {
    utxoSet = new UTXOSet()
    aliceWallet = new Wallet()
    bobWallet = new Wallet()

    // 为 Alice 添加一些 UTXO
    utxoSet.add('tx1', 0, new TxOutput(100, aliceWallet.address))
    utxoSet.add('tx2', 0, new TxOutput(50, aliceWallet.address))
    utxoSet.add('tx3', 0, new TxOutput(25, aliceWallet.address))

    // 为 Bob 添加一些 UTXO
    utxoSet.add('tx4', 0, new TxOutput(30, bobWallet.address))
  })

  describe('基本交易构建', () => {
    it('应该构建简单的转账交易', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      expect(tx.inputs.length).toBeGreaterThan(0)
      expect(tx.outputs.length).toBeGreaterThanOrEqual(1)

      // 检查接收者输出
      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput).toBeDefined()
      expect(bobOutput!.amount).toBe(40)
    })

    it('应该自动计算找零', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // Alice 有 100 + 50 + 25 = 175 的余额
      // 支付 40 给 Bob，应该有找零
      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )
      expect(changeOutput).toBeDefined()
    })

    it('应该选择足够的 UTXO', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 120).build()

      // 需要 120，应该选择 100 + 50 = 150 的 UTXO
      expect(tx.inputs.length).toBeGreaterThanOrEqual(2)
    })

    it('应该支持多个接收者', () => {
      const charlie = new Wallet()

      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(charlie.address, 20)
        .build()

      expect(tx.outputs.length).toBeGreaterThanOrEqual(2)

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(30)

      const charlieOutput = tx.outputs.find(
        (o) => o.address === charlie.address
      )
      expect(charlieOutput!.amount).toBe(20)
    })
  })

  describe('交易签名', () => {
    it('应该构建并签名交易', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .buildAndSign()

      expect(tx.inputs[0].isSigned()).toBe(true)
      expect(tx.inputs[0].publicKey).toBe(aliceWallet.publicKey)
    })

    it('签名后的交易应该可以验证', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .buildAndSign()

      const utxoMap = new Map<string, {amount: number; address: string}>()
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          utxoMap.set(`${input.txId}:${input.outputIndex}`, {
            amount: utxo.amount,
            address: utxo.address,
          })
        }
      }

      const isValid = TransactionSigner.verifyTransaction(tx, utxoMap)
      expect(isValid).toBe(true)
    })
  })

  describe('UTXO 选择策略', () => {
    it('应该优先选择大额 UTXO（贪心算法）', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // 应该选择 100 的 UTXO（最大的一个）
      const hasLargestUTXO = tx.inputs.some((input) => {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        return utxo && utxo.amount === 100
      })

      expect(hasLargestUTXO).toBe(true)
    })

    it('应该选择最少数量的 UTXO', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // 40 可以用一个 100 或 50 的 UTXO 满足，所以应该只选择 1 个
      expect(tx.inputs.length).toBe(1)
    })
  })

  describe('找零处理', () => {
    it('没有找零时不应该创建找零输出', () => {
      // 创建一个精确金额的场景
      const exactUtxoSet = new UTXOSet()
      exactUtxoSet.add('tx1', 0, new TxOutput(50, aliceWallet.address))

      const builder = new TransactionBuilder(exactUtxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 50).build()

      // 应该只有一个输出（给 Bob），没有找零
      expect(tx.outputs.length).toBe(1)
      expect(tx.outputs[0].address).toBe(bobWallet.address)
    })

    it('应该支持自定义找零地址', () => {
      const changeAddress = new Wallet().address

      const builder = new TransactionBuilder(utxoSet)
      const tx = builder
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .withChangeAddress(changeAddress)
        .build()

      const changeOutput = tx.outputs.find((o) => o.address === changeAddress)
      expect(changeOutput).toBeDefined()
    })

    it('默认找零地址应该是发送者地址', () => {
      const builder = new TransactionBuilder(utxoSet)
      const tx = builder.from(aliceWallet).to(bobWallet.address, 40).build()

      // 应该有找零输出到 Alice 的地址
      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )
      expect(changeOutput).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('应该拒绝没有发送者的交易', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.to(bobWallet.address, 40).build()
      }).toThrow('必须指定发送者钱包')
    })

    it('应该拒绝没有接收者的交易', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).build()
      }).toThrow('必须至少有一个接收者')
    })

    it('应该拒绝余额不足的交易', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, 1000).build()
      }).toThrow(/余额不足/)
    })

    it('应该拒绝金额为 0 或负数的转账', () => {
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, 0)
      }).toThrow('转账金额必须大于 0')

      expect(() => {
        builder.from(aliceWallet).to(bobWallet.address, -10)
      }).toThrow('转账金额必须大于 0')
    })

    it('应该拒绝没有 UTXO 的发送者', () => {
      const emptyWallet = new Wallet()
      const builder = new TransactionBuilder(utxoSet)

      expect(() => {
        builder.from(emptyWallet).to(bobWallet.address, 10).build()
      }).toThrow(/没有可用的 UTXO/)
    })
  })

  describe('静态方法', () => {
    it('应该通过静态方法创建简单转账', () => {
      const tx = TransactionBuilder.createSimpleTransfer(
        aliceWallet,
        bobWallet.address,
        40,
        utxoSet
      )

      expect(tx.inputs.length).toBeGreaterThan(0)
      expect(tx.outputs.length).toBeGreaterThanOrEqual(1)

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput).toBeDefined()
      expect(bobOutput!.amount).toBe(40)

      // 应该已经签名
      expect(tx.inputs[0].isSigned()).toBe(true)
    })
  })

  describe('链式调用', () => {
    it('应该支持链式调用构建交易', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(bobWallet.address, 20)
        .withChangeAddress(aliceWallet.address)
        .buildAndSign()

      expect(tx).toBeInstanceOf(Transaction)
      expect(tx.inputs[0].isSigned()).toBe(true)
    })
  })

  describe('实际场景', () => {
    it('场景1：Alice 向 Bob 转账 50 BTC', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 50)
        .buildAndSign()

      // 验证交易
      const utxoMap = new Map<string, {amount: number; address: string}>()
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          utxoMap.set(`${input.txId}:${input.outputIndex}`, {
            amount: utxo.amount,
            address: utxo.address,
          })
        }
      }

      expect(TransactionSigner.verifyTransaction(tx, utxoMap)).toBe(true)

      // 检查金额
      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(50)
    })

    it('场景2：Alice 向多人转账', () => {
      const charlie = new Wallet()
      const david = new Wallet()

      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 30)
        .to(charlie.address, 40)
        .to(david.address, 20)
        .buildAndSign()

      expect(tx.outputs.length).toBeGreaterThanOrEqual(3)

      const totalSent = [bobWallet.address, charlie.address, david.address]
        .map((addr) => tx.outputs.find((o) => o.address === addr)?.amount || 0)
        .reduce((sum, amount) => sum + amount, 0)

      expect(totalSent).toBe(90)
    })

    it('场景3：检查找零金额正确', () => {
      // Alice 有 100 + 50 + 25 = 175
      // 转账 100 给 Bob
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 100)
        .build()

      const bobOutput = tx.outputs.find((o) => o.address === bobWallet.address)
      expect(bobOutput!.amount).toBe(100)

      const changeOutput = tx.outputs.find(
        (o) => o.address === aliceWallet.address
      )

      // 计算实际输入金额
      let inputAmount = 0
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          inputAmount += utxo.amount
        }
      }

      // 找零应该 = 输入 - 输出（100）
      if (changeOutput) {
        expect(changeOutput.amount).toBe(inputAmount - 100)
      }
    })
  })

  describe('金额计算', () => {
    it('输入金额应该等于输出金额', () => {
      const tx = new TransactionBuilder(utxoSet)
        .from(aliceWallet)
        .to(bobWallet.address, 40)
        .build()

      // 计算输入总额
      let inputAmount = 0
      for (const input of tx.inputs) {
        const utxo = utxoSet.get(input.txId, input.outputIndex)
        if (utxo) {
          inputAmount += utxo.amount
        }
      }

      // 计算输出总额
      const outputAmount = tx.outputs.reduce((sum, o) => sum + o.amount, 0)

      expect(inputAmount).toBe(outputAmount)
    })
  })
})
