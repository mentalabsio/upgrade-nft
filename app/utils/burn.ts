import { Transaction, TransactionInstruction } from "@solana/web3.js"
import * as BufferLayout from "buffer-layout"
import BN from "bn.js"
import { utils, web3 } from "@project-serum/anchor"
import { Connection } from "@metaplex/js"

const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property)
}

const programIds = {
  token: new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
}

/**
 * Construct a Burn instruction
 *
 * @param programId SPL Token program account
 * @param mint Mint for the account
 * @param account Account to burn tokens from
 * @param owner Owner of the account
 * @param amount amount to burn
 */
export const createBurnInstruction = async ({
  nftMint,
  owner,
  amount = 1,
}: {
  nftMint: web3.PublicKey
  connection: Connection
  owner: web3.PublicKey
  amount?: number
}) => {
  const ownerNftAta = await utils.token.associatedAddress({
    mint: nftMint,
    owner,
  })
  const dataLayout = BufferLayout.struct([
    BufferLayout.u8("instruction"),
    uint64("amount"),
  ])
  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      instruction: 8,
      // Burn instruction
      amount: new u64(amount).toBuffer(),
    },
    data
  )
  let keys = [
    {
      pubkey: ownerNftAta,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: nftMint,
      isSigner: false,
      isWritable: true,
    },
  ]

  keys.push({
    pubkey: owner,
    isSigner: true,
    isWritable: false,
  })

  //  multiSigners Signing accounts if `authority` is a multiSig
  //   if (multiSigners.length === 0) {
  //     keys.push({
  //       pubkey: owner,
  //       isSigner: true,
  //       isWritable: false,
  //     })
  //   } else {
  //     keys.push({
  //       pubkey: owner,
  //       isSigner: false,
  //       isWritable: false,
  //     })
  //     multiSigners.forEach((signer) =>
  //       keys.push({
  //         pubkey: signer.publicKey,
  //         isSigner: true,
  //         isWritable: false,
  //       })
  //     )
  //   }

  return new TransactionInstruction({
    keys,
    programId: programIds.token,
    data,
  })
}

class u64 extends BN {
  /**
   * Convert to Buffer representation
   */
  toBuffer() {
    const a = super.toArray().reverse()
    const b = Buffer.from(a)

    if (b.length === 8) {
      return b
    }

    const zeroPad = Buffer.alloc(8)
    b.copy(zeroPad)
    return zeroPad
  }
  /**
   * Construct a u64 from Buffer representation
   */

  static fromBuffer(buffer) {
    return new u64(
      [...buffer]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(""),
      16
    )
  }
}
