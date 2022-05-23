import {
  MetadataData,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import assert from "assert";

import { UpgradeNft } from "../target/types/upgrade_nft";

describe("upgrade-nft", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.UpgradeNft as Program<UpgradeNft>;

  const mintOwner = anchor.web3.Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(
      "32Y9pum9ncAAhtGtadt7jMwUyYEHUzNbnKtB1rveBA1h6r2ttsnZm7XRnBs5RVQjcuwTj41mnTAkMAnJaWgsjuBA"
    )
  );
  const mintAddress = new anchor.web3.PublicKey(
    "FJfJKCPFVwa5earejuCuVgm2tVDABSzwCDDgvWEKSz4y"
  );
  const userTokenAccount = new anchor.web3.PublicKey(
    "3zMJxxX9fpcDJqWrv4zuU4689JzUpvvTvqHwJuUzGxa6"
  );

  const feeTokenAddress = new anchor.web3.PublicKey(
    "NEpinL3xGXUpDeLdiJmVAoMGHXVF6BjsPHV6HRtNZDh"
  );

  it("Is initialized!", async () => {
    const fee = new anchor.BN(1);
    const newUri = "https://example.com/new";

    const [tokenMetadata, _] = await MetadataProgram.findMetadataAccount(
      mintAddress
    );

    const userFeeTokenAccount = await getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      mintOwner,
      feeTokenAddress,
      mintOwner.publicKey,
      true
    );

    await program.methods
      .upgrade(fee, newUri)
      .accounts({
        mintAddress,
        tokenMetadata,
        updateAuthority: mintOwner.publicKey,

        userAccount: mintOwner.publicKey,
        userTokenAccount,

        feeToken: feeTokenAddress,
        feePayerAta: userFeeTokenAccount.address,

        tokenMetadataProgram: MetadataProgram.PUBKEY,
      })
      .signers([mintOwner])
      .rpc();

    const metadataData = MetadataData.deserialize(
      (await program.provider.connection.getAccountInfo(tokenMetadata)).data
    );

    console.log(metadataData);

    assert.deepStrictEqual(metadataData.data.uri, newUri);
  });
});
