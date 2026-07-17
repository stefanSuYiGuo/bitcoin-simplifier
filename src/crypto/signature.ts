import * as elliptic from 'elliptic'
import {Hash} from './hash'

const ec = new elliptic.ec('secp256k1')

/**
 * ECDSA signing and verification utilities.
 * Uses the secp256k1 elliptic curve used by Bitcoin.
 */
export class Signature {
  /**
   * Generate a new key pair.
   * @returns An object containing the private and public keys.
   */
  static generateKeyPair(): {privateKey: string; publicKey: string} {
    const keyPair = ec.genKeyPair()
    const privateKey = keyPair.getPrivate('hex')
    const publicKey = keyPair.getPublic('hex')

    return {privateKey, publicKey}
  }

  /**
   * Derive a public key from a private key.
   * @param privateKey Private key as a hexadecimal string.
   * @returns Public key as a hexadecimal string.
   */
  static getPublicKeyFromPrivate(privateKey: string): string {
    const keyPair = ec.keyFromPrivate(privateKey, 'hex')
    return keyPair.getPublic('hex')
  }

  /**
   * Sign data.
   * @param data Data to sign.
   * @param privateKey Private key.
   * @returns Signature as a hexadecimal string.
   */
  static sign(data: string, privateKey: string): string {
    const hash = Hash.sha256(data)
    const keyPair = ec.keyFromPrivate(privateKey, 'hex')
    const signature = keyPair.sign(hash)

    return signature.toDER('hex')
  }

  /**
   * Verify a signature.
   * @param data Original data.
   * @param signature Signature to verify.
   * @param publicKey Public key.
   * @returns Whether the signature is valid.
   */
  static verify(data: string, signature: string, publicKey: string): boolean {
    try {
      const hash = Hash.sha256(data)
      const key = ec.keyFromPublic(publicKey, 'hex')
      return key.verify(hash, signature)
    } catch (error) {
      return false
    }
  }

  /**
   * Verify that a private and public key belong to the same key pair.
   * @param privateKey Private key.
   * @param publicKey Public key.
   * @returns Whether the keys match.
   */
  static verifyKeyPair(privateKey: string, publicKey: string): boolean {
    const derivedPublicKey = this.getPublicKeyFromPrivate(privateKey)
    return derivedPublicKey === publicKey
  }
}
