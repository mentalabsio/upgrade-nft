import {
  MetadataData,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata"
import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import assert from "assert"

import { UpgradeNft } from "../target/types/upgrade_nft"

describe("upgrade-nft", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env())

  const program = anchor.workspace.UpgradeNft as Program<UpgradeNft>

  const updateAuthority = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "357SiJKDxsfms2mD39SBcvZVpFQKvMGNftXss4zRJS3Ruvcp9s6yu73BSB4hxQqVVLZx5JP7B549YHL7vSAUoQ3d"
    )
  )

  /** NFT mint */
  const mintAddress = new anchor.web3.PublicKey(
    "avbWQJoQGecPqnKdvuVjd133nE5d8seZ86b9hw37KNn"
  )

  /** User pub key */
  const owner = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "92GwZ86j6sEXxxJ1K3gGVDno2UVxKi6hAHtPcgrRUzPnZvQL28BdqdyTaxo6NEcs75ZxQDSu7U7QRfhRpxEH1Nj"
    )
  )

  /** NFt owner ATA */
  const userTokenAccount = await anchor.utils.token.associatedAddress({
    mint: mintAddress,
    owner: owner.publicKey,
  })

  it("Is initialized!", async () => {
    const newUri = "https://example.com/new"

    const [tokenMetadata, _] = await MetadataProgram.findMetadataAccount(
      mintAddress
    )

    await program.methods
      .upgrade(newUri)
      .accounts({
        mintAddress,
        tokenMetadata,
        updateAuthority: updateAuthority.publicKey,
        tokenMetadataProgram: MetadataProgram.PUBKEY,
        owner: owner.publicKey,
        userTokenAccount,
      })
      .signers([updateAuthority, owner])
      .rpc()

    const metadataData = MetadataData.deserialize(
      (await program.provider.connection.getAccountInfo(tokenMetadata)).data
    )

    console.log(metadataData)

    assert.deepStrictEqual(metadataData.data.uri, newUri)
  })
})
