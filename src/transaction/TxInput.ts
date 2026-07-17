import {Script, ScriptBuilder} from '../script'

/**
 * Transaction input.
 * References an existing UTXO.
 * Supports both legacy signature fields and scripts.
 */
export class TxInput {
  /** Unlocking script (scriptSig) */
  private _scriptSig?: Script

  /**
   * @param txId ID of the referenced transaction
   * @param outputIndex Index of the referenced output
   * @param signature Optional signature for legacy mode
   * @param publicKey Optional public key for legacy mode
   */
  constructor(
    public readonly txId: string,
    public readonly outputIndex: number,
    public signature: string = '',
    public publicKey: string = ''
  ) {
    if (!txId || txId.trim().length === 0) {
      throw new Error('Transaction ID cannot be empty')
    }
    if (outputIndex < 0) {
      throw new Error('Output index cannot be negative')
    }
  }

  /**
   * Sets the signature fields used by legacy mode.
   * @param signature Signature to store
   * @param publicKey Public key to store
   */
  setSignature(signature: string, publicKey: string): void {
    this.signature = signature
    this.publicKey = publicKey
    // Keep scriptSig in sync
    this._scriptSig = ScriptBuilder.buildP2PKHUnlockingScript(
      signature,
      publicKey
    )
  }

  /**
   * Sets the unlocking script (scriptSig).
   */
  setScriptSig(scriptSig: Script): void {
    this._scriptSig = scriptSig
    // Extract the signature and public key when possible for compatibility
    const elements = scriptSig.getElements()
    if (elements.length >= 2) {
      if (elements[0].type === 'data') {
        this.signature = elements[0].data
      }
      if (elements[1].type === 'data') {
        this.publicKey = elements[1].data
      }
    }
  }

  /**
   * Returns the unlocking script.
   */
  getScriptSig(): Script {
    if (this._scriptSig) {
      return this._scriptSig
    }
    // Build a script from the legacy fields
    if (this.signature && this.publicKey) {
      return ScriptBuilder.buildP2PKHUnlockingScript(
        this.signature,
        this.publicKey
      )
    }
    return new Script()
  }

  /**
   * Returns whether the input has signature data.
   */
  isSigned(): boolean {
    return (
      (this.signature.length > 0 && this.publicKey.length > 0) ||
      (this._scriptSig !== undefined && !this._scriptSig.isEmpty())
    )
  }

  /**
   * Converts the input to a JSON object.
   */
  toJSON(): {
    txId: string
    outputIndex: number
    signature: string
    publicKey: string
    scriptSig?: string
  } {
    const json: any = {
      txId: this.txId,
      outputIndex: this.outputIndex,
      signature: this.signature,
      publicKey: this.publicKey,
    }
    if (this._scriptSig) {
      json.scriptSig = this._scriptSig.toHex()
    }
    return json
  }

  /**
   * Creates an input from a JSON object.
   */
  static fromJSON(json: {
    txId: string
    outputIndex: number
    signature?: string
    publicKey?: string
    scriptSig?: string
  }): TxInput {
    const input = new TxInput(
      json.txId,
      json.outputIndex,
      json.signature || '',
      json.publicKey || ''
    )
    if (json.scriptSig) {
      input._scriptSig = Script.fromHex(json.scriptSig)
    }
    return input
  }

  /**
   * Serializes the unsigned input content for hashing.
   */
  toStringForSigning(): string {
    return JSON.stringify({
      txId: this.txId,
      outputIndex: this.outputIndex,
    })
  }

  /**
   * Serializes the input including its signature data.
   */
  toString(): string {
    return JSON.stringify(this.toJSON())
  }

  /**
   * Returns the unique identifier for the referenced UTXO.
   * Format: txId:outputIndex
   */
  getUTXOKey(): string {
    return `${this.txId}:${this.outputIndex}`
  }

  /**
   * Creates a copy of the input.
   */
  clone(): TxInput {
    const cloned = new TxInput(
      this.txId,
      this.outputIndex,
      this.signature,
      this.publicKey
    )
    if (this._scriptSig) {
      cloned._scriptSig = this._scriptSig.clone()
    }
    return cloned
  }
}
