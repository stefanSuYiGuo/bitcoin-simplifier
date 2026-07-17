import {Transaction} from './Transaction'
import {Wallet} from '../wallet/Wallet'
import {Signature} from '../crypto/signature'
import {Hash} from '../crypto/hash'
import {encodeBase58} from '../utils/base58'

/**
 * Transaction signing utility.
 * Signs transactions and verifies their signatures.
 */
export class TransactionSigner {
  /**
   * Signs a single transaction input.
   * @param transaction Transaction to sign
   * @param inputIndex Index of the input to sign
   * @param wallet Wallet used to create the signature
   * @returns Whether the input was signed successfully
   */
  static signInput(
    transaction: Transaction,
    inputIndex: number,
    wallet: Wallet
  ): boolean {
    if (inputIndex < 0 || inputIndex >= transaction.inputs.length) {
      return false
    }

    const input = transaction.inputs[inputIndex]

    // Leave an existing signature unchanged
    if (input.isSigned()) {
      return true
    }

    const txData = transaction.getContentForSigning()
    const signature = wallet.sign(txData)

    // Store the signature and public key
    input.setSignature(signature, wallet.publicKey)

    return true
  }

  /**
   * Signs every input in a transaction with the same wallet.
   * @param transaction Transaction to sign
   * @param wallet Wallet used to create each signature
   * @returns The signed transaction with updated input signatures
   */
  static signTransaction(
    transaction: Transaction,
    wallet: Wallet
  ): Transaction {
    const txData = transaction.getContentForSigning()

    // Sign each input
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]

      // Leave existing signatures unchanged
      if (input.isSigned()) {
        continue
      }

      // Sign with the wallet's private key
      const signature = wallet.sign(txData)

      // Store the signature and public key
      input.setSignature(signature, wallet.publicKey)
    }

    // Recalculate the transaction ID because signatures may change it
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * Signs a transaction with a separate wallet for each input.
   * @param transaction Transaction to sign
   * @param wallets Wallets whose indexes correspond to input indexes
   * @returns The signed transaction
   */
  static signTransactionWithWallets(
    transaction: Transaction,
    wallets: Wallet[]
  ): Transaction {
    if (wallets.length !== transaction.inputs.length) {
      throw new Error(
        `Wallet count (${wallets.length}) does not match input count (${transaction.inputs.length})`
      )
    }

    const txData = transaction.getContentForSigning()

    // Sign each input with its corresponding wallet
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]
      const wallet = wallets[i]

      // Leave existing signatures unchanged
      if (input.isSigned()) {
        continue
      }

      // Sign with the corresponding wallet's private key
      const signature = wallet.sign(txData)

      // Store the signature and public key
      input.setSignature(signature, wallet.publicKey)
    }

    // Recalculate the transaction ID
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * Signs a transaction by matching each UTXO address to a wallet.
   * @param transaction Transaction to sign
   * @param walletMap Map of addresses to wallets
   * @param utxoSet UTXO set used to find the address for each input
   * @returns The signed transaction
   */
  static signTransactionWithWalletMap(
    transaction: Transaction,
    walletMap: Map<string, Wallet>,
    utxoSet: Map<string, {amount: number; address: string}>
  ): Transaction {
    const txData = transaction.getContentForSigning()

    // Find the corresponding wallet and sign each input
    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i]

      // Leave existing signatures unchanged
      if (input.isSigned()) {
        continue
      }

      // Find the owner address of the referenced UTXO
      const utxoKey = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(utxoKey)

      if (!utxo) {
        throw new Error(`UTXO not found: ${utxoKey}`)
      }

      // Find the wallet for the owner address
      const wallet = walletMap.get(utxo.address)

      if (!wallet) {
        throw new Error(
          `No wallet found for address ${utxo.address} to sign input ${i}`
        )
      }

      // Sign with the matching wallet
      const signature = wallet.sign(txData)
      input.setSignature(signature, wallet.publicKey)
    }

    // Recalculate the transaction ID
    transaction.id = (transaction as any).calculateId()

    return transaction
  }

  /**
   * Verifies every signature in a transaction.
   * @param transaction Transaction to verify
   * @param utxoSet UTXO set used to identify output owners
   * @returns Whether every signature is valid
   */
  static verifyTransaction(
    transaction: Transaction,
    utxoSet: Map<string, {amount: number; address: string}>
  ): boolean {
    // Coinbase transactions do not require signature verification
    if (transaction.isCoinbase()) {
      return true
    }

    const txData = transaction.getContentForSigning()

    // Verify each input signature
    for (const input of transaction.inputs) {
      // Ensure the input is signed
      if (!input.isSigned()) {
        console.error(`Unsigned input: ${input.txId}:${input.outputIndex}`)
        return false
      }

      // Verify the signature
      if (!Signature.verify(txData, input.signature, input.publicKey)) {
        console.error(`Signature verification failed: ${input.txId}:${input.outputIndex}`)
        return false
      }

      // Confirm that the public key address owns the referenced UTXO
      const utxoKey = `${input.txId}:${input.outputIndex}`
      const utxo = utxoSet.get(utxoKey)

      if (!utxo) {
        console.error(`UTXO not found: ${utxoKey}`)
        return false
      }

      // Derive the address from the public key
      const sha256Hash = Hash.sha256(input.publicKey)
      const ripemd160Hash = Hash.ripemd160(sha256Hash)
      const addressFromPublicKey = encodeBase58(ripemd160Hash)

      // Confirm that the addresses match
      if (addressFromPublicKey !== utxo.address) {
        console.error(
          `Address mismatch: public key address ${addressFromPublicKey}, UTXO owner ${utxo.address}`
        )
        return false
      }
    }

    return true
  }

  /**
   * Verifies the signature of a single input.
   * @param transaction Transaction containing the input
   * @param inputIndex Index of the input to verify
   * @param utxoSet UTXO set used to verify ownership
   * @returns Whether the signature is valid
   */
  static verifyInput(
    transaction: Transaction,
    inputIndex: number,
    utxoSet: Map<string, {amount: number; address: string}>
  ): boolean {
    if (inputIndex < 0 || inputIndex >= transaction.inputs.length) {
      return false
    }

    const input = transaction.inputs[inputIndex]
    const txData = transaction.getContentForSigning()

    // Verify the signature
    if (!Signature.verify(txData, input.signature, input.publicKey)) {
      return false
    }

    // Verify ownership of the address
    const utxoKey = `${input.txId}:${input.outputIndex}`
    const utxo = utxoSet.get(utxoKey)

    if (!utxo) {
      return false
    }

    const sha256Hash = Hash.sha256(input.publicKey)
    const ripemd160Hash = Hash.ripemd160(sha256Hash)
    const addressFromPublicKey = encodeBase58(ripemd160Hash)

    return addressFromPublicKey === utxo.address
  }

  /**
   * Checks whether every input in a transaction is signed.
   * @param transaction Transaction to inspect
   * @returns Whether every input is signed
   */
  static isFullySigned(transaction: Transaction): boolean {
    if (transaction.isCoinbase()) {
      return true
    }

    return transaction.inputs.every((input) => input.isSigned())
  }

  /**
   * Returns the indexes of all unsigned inputs.
   * @param transaction Transaction to inspect
   * @returns Array of unsigned input indexes
   */
  static getUnsignedInputIndices(transaction: Transaction): number[] {
    const indices: number[] = []
    for (let i = 0; i < transaction.inputs.length; i++) {
      if (!transaction.inputs[i].isSigned()) {
        indices.push(i)
      }
    }
    return indices
  }
}
