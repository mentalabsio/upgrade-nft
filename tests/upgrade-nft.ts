import {
  MetadataData,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata"
import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import assert from "assert"

import { UpgradeNft } from "../target/types/upgrade_nft"

describe("upgrade-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env())

  const program = anchor.workspace.UpgradeNft as Program<UpgradeNft>

  const updateAuthority = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "i4FDfFrETVUApv1pmsfKJoQ1kMthYk5iAyn1z9PsaBi7RrAAHAReVs6eUv1QuwVzuLBdqwZs4AdYndKaeAip5xn"
    )
  )

  /** NFT mint */
  const mintAddress = new anchor.web3.PublicKey(
    "DjJMhJiMPHLzX934RS62R4rZT7fnx7PC3CpdGPXDyWT2"
  )

  /** NFt owner ATA */
  const userTokenAccount = new anchor.web3.PublicKey(
    "DafRy7McBfFpgihRzdakP7TLbQsDLErv8yyANWk4zfDM"
  )

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

        userAccount: updateAuthority.publicKey,
        userTokenAccount,

        tokenMetadataProgram: MetadataProgram.PUBKEY,
      })
      .signers([updateAuthority])
      .rpc()

    const metadataData = MetadataData.deserialize(
      (await program.provider.connection.getAccountInfo(tokenMetadata)).data
    )

    console.log(metadataData)

    assert.deepStrictEqual(metadataData.data.uri, newUri)
  })
})
