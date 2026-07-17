import { Signature } from '../crypto/signature'

/**
 * Key pair manager.
 * Encapsulates public and private key generation and access.
 */
export class KeyPair {
  private _privateKey: string
  private _publicKey: string

  /**
   * Creates a key pair.
   * @param privateKey Optional private key; a new pair is generated when omitted
   */
  constructor(privateKey?: string) {
    if (privateKey) {
      this._privateKey = privateKey
      this._publicKey = Signature.getPublicKeyFromPrivate(privateKey)
    } else {
      const { privateKey: privKey, publicKey: pubKey } = Signature.generateKeyPair()
      this._privateKey = privKey
      this._publicKey = pubKey
    }
  }

  /**
   * Returns the private key.
   */
  get privateKey(): string {
    return this._privateKey
  }

  /**
   * Returns the public key.
   */
  get publicKey(): string {
    return this._publicKey
  }

  /**
   * Signs data with the private key.
   * @param data Data to sign
   * @returns Signature string
   */
  sign(data: string): string {
    return Signature.sign(data, this._privateKey)
  }

  /**
   * Verifies a signature with the public key.
   * @param data Original data
   * @param signature Signature to verify
   * @returns Whether the signature is valid
   */
  verify(data: string, signature: string): boolean {
    return Signature.verify(data, signature, this._publicKey)
  }

  /**
   * Checks whether the key pair is valid.
   */
  isValid(): boolean {
    return Signature.verifyKeyPair(this._privateKey, this._publicKey)
  }

  /**
   * Exports the key pair as JSON-compatible data.
   * The result contains the private key and must be handled carefully.
   */
  toJSON(): { privateKey: string; publicKey: string } {
    return {
      privateKey: this._privateKey,
      publicKey: this._publicKey
    }
  }

  /**
   * Creates a key pair from JSON-compatible data.
   */
  static fromJSON(json: { privateKey: string; publicKey: string }): KeyPair {
    return new KeyPair(json.privateKey)
  }
}
