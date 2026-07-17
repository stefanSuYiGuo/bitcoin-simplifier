import { KeyPair } from './KeyPair'
import { Hash } from '../crypto/hash'
import { encodeBase58 } from '../utils/base58'

/**
 * Wallet for managing a key pair, deriving an address, and signing data.
 */
export class Wallet {
  private keyPair: KeyPair
  private _address: string

  /**
   * Creates a wallet.
   * @param privateKey Optional private key; a new wallet is generated when omitted
   */
  constructor(privateKey?: string) {
    this.keyPair = new KeyPair(privateKey)
    this._address = this.generateAddress()
  }

  /**
   * Returns the public key.
   */
  get publicKey(): string {
    return this.keyPair.publicKey
  }

  /**
   * Returns the private key.
   */
  get privateKey(): string {
    return this.keyPair.privateKey
  }

  /**
   * Returns the wallet address.
   */
  get address(): string {
    return this._address
  }

  /**
   * Generates a simplified Bitcoin-style address.
   * Algorithm: Base58(RIPEMD160(SHA256(publicKey)))
   * @returns Derived address
   */
  private generateAddress(): string {
    // 1. Hash the public key with SHA-256
    const sha256Hash = Hash.sha256(this.keyPair.publicKey)
    
    // 2. Hash the result with RIPEMD-160
    const ripemd160Hash = Hash.ripemd160(sha256Hash)
    
    // 3. Encode the result with Base58
    const address = encodeBase58(ripemd160Hash)
    
    return address
  }

  /**
   * Signs data with the wallet's private key.
   * @param data Data to sign
   * @returns Signature string
   */
  sign(data: string): string {
    return this.keyPair.sign(data)
  }

  /**
   * Verifies a signature with the wallet's public key.
   * @param data Original data
   * @param signature Signature to verify
   * @returns Whether the signature is valid
   */
  verify(data: string, signature: string): boolean {
    return this.keyPair.verify(data, signature)
  }

  /**
   * Exports wallet data, including the private key.
   * Handle the result carefully.
   */
  export(): { privateKey: string; publicKey: string; address: string } {
    return {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    }
  }

  /**
   * Imports a wallet from a private key.
   * @param privateKey Private key to import
   */
  static fromPrivateKey(privateKey: string): Wallet {
    return new Wallet(privateKey)
  }

  /**
   * Checks whether an address has a valid format.
   * @param address Address to inspect
   * @returns Whether the format is valid
   */
  static isValidAddress(address: string): boolean {
    // Perform a simplified check for Base58 characters and expected length
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/
    return base58Regex.test(address) && address.length >= 26 && address.length <= 35
  }

  /**
   * Returns a concise string representation of the wallet.
   */
  toString(): string {
    return `Wallet(address: ${this.address.substring(0, 10)}...)`
  }
}
