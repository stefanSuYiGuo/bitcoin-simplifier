import {Script, ScriptBuilder} from '../script'

/**
 * Transaction output.
 * Contains an amount and a locking script.
 * Supports both legacy address fields and scripts.
 */
export class TxOutput {
  /** Locking script (scriptPubKey) */
  private _scriptPubKey?: Script

  /**
   * @param amount Output amount in BTC
   * @param address Recipient address used by legacy mode
   */
  constructor(public readonly amount: number, public readonly address: string) {
    if (amount <= 0) {
      throw new Error('Output amount must be greater than 0')
    }
    if (!address || address.trim().length === 0) {
      throw new Error('Recipient address cannot be empty')
    }
  }

  /**
   * Creates an output with a locking script.
   */
  static createWithScript(amount: number, scriptPubKey: Script): TxOutput {
    // Derive address information from the script for compatibility
    let address = 'script:' + scriptPubKey.toHex().substring(0, 16)

    // Use the public key hash from a P2PKH script as the address
    const pubKeyHash = ScriptBuilder.extractP2PKHPubKeyHash(scriptPubKey)
    if (pubKeyHash) {
      address = pubKeyHash
    }

    // Extract the script hash from a P2SH script
    const scriptHash = ScriptBuilder.extractP2SHScriptHash(scriptPubKey)
    if (scriptHash) {
      address = '3' + scriptHash.substring(0, 20) // P2SH addresses begin with 3
    }

    const output = new TxOutput(amount, address)
    output._scriptPubKey = scriptPubKey
    return output
  }

  /**
   * Sets the locking script (scriptPubKey).
   */
  setScriptPubKey(scriptPubKey: Script): void {
    this._scriptPubKey = scriptPubKey
  }

  /**
   * Returns the locking script.
   * Derives a P2PKH script from the address when none is set.
   */
  getScriptPubKey(): Script {
    if (this._scriptPubKey) {
      return this._scriptPubKey
    }
    // Build a P2PKH locking script from the address
    // This simplified model treats the address as a public key hash instead of decoding Base58
    return ScriptBuilder.buildP2PKHLockingScript(this.address)
  }

  /**
   * Returns the script type.
   */
  getScriptType(): string {
    return ScriptBuilder.getScriptType(this.getScriptPubKey())
  }

  /**
   * Returns whether this is a P2PKH output.
   */
  isP2PKH(): boolean {
    return ScriptBuilder.isP2PKH(this.getScriptPubKey())
  }

  /**
   * Returns whether this is a P2SH output.
   */
  isP2SH(): boolean {
    return ScriptBuilder.isP2SH(this.getScriptPubKey())
  }

  /**
   * Returns whether this is an unspendable OP_RETURN output.
   */
  isOpReturn(): boolean {
    return ScriptBuilder.isOpReturn(this.getScriptPubKey())
  }

  /**
   * Converts the output to a JSON object.
   */
  toJSON(): {amount: number; address: string; scriptPubKey?: string} {
    const json: any = {
      amount: this.amount,
      address: this.address,
    }
    if (this._scriptPubKey) {
      json.scriptPubKey = this._scriptPubKey.toHex()
    }
    return json
  }

  /**
   * Creates an output from a JSON object.
   */
  static fromJSON(json: {
    amount: number
    address: string
    scriptPubKey?: string
  }): TxOutput {
    const output = new TxOutput(json.amount, json.address)
    if (json.scriptPubKey) {
      output._scriptPubKey = Script.fromHex(json.scriptPubKey)
    }
    return output
  }

  /**
   * Serializes the output for hashing.
   */
  toString(): string {
    return JSON.stringify(this.toJSON())
  }

  /**
   * Creates a copy of the output.
   */
  clone(): TxOutput {
    const cloned = new TxOutput(this.amount, this.address)
    if (this._scriptPubKey) {
      cloned._scriptPubKey = this._scriptPubKey.clone()
    }
    return cloned
  }
}
