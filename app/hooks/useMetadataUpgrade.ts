import { web3 } from "@project-serum/anchor"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { arweaveUpload } from "utils/arweave/arweave"

import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata"
import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"

import { getNFTMetadata } from "utils/nfts"
import { useState } from "react"
import { createBurnInstruction } from "utils/burn"

const programId = new web3.PublicKey(process.env.NEXT_PUBLIC_UPGRADE_PROGRAM_ID)

const mintAuthorityPubKey = new anchor.web3.PublicKey(
  process.env.NEXT_PUBLIC_UPDATE_AUTHORITY_PUB_KEY
)

const useMetadataUpgrade = () => {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const [feedbackStatus, setFeedbackStatus] = useState("")

  const upgrade = async (
    mint: web3.PublicKey,
    mintsToBurn: web3.PublicKey[]
  ) => {
    try {
      setFeedbackStatus("Scanning the bones...")

      const metadata = await getNFTMetadata(mint.toString(), connection)

      if (!metadata.externalMetadata) {
        throw new Error("Invalid NFT Metadata.")
      }

      let essenceAttributeIndex
      /** Try to find the essence attribute */
      const essenceAttributeValue = metadata.externalMetadata?.attributes.find(
        (attribute, index) => {
          if (attribute?.trait_type?.toLowerCase() === "essence") {
            essenceAttributeIndex = index

            return true
          }

          return false
        }
      )?.value

      let toUpgrade = Object.assign({}, metadata.externalMetadata)

      /** Cancel upgrade if upgraded */
      if (essenceAttributeValue) {
        throw new Error("Dskully is already upgraded")
        /** Or push the essence attribute */
        // toUpgrade.attributes.splice(essenceAttributeIndex, 1)
      } else {
        toUpgrade.attributes.push({
          trait_type: "Essence",
          value: "Set",
        })
      }

      setFeedbackStatus("Uploading your essence... Please confirm and wait.")
      const [newUri] = await arweaveUpload(anchorWallet, toUpgrade)

      const provider = new anchor.AnchorProvider(connection, anchorWallet, {
        preflightCommitment: "recent",
      })

      const idl = await Program.fetchIdl(programId, provider)

      if (!idl)
        throw new Error(
          "No idl with address " +
            programId.toString() +
            " has been found on " +
            process.env.NEXT_PUBLIC_CONNECTION_NETWORK +
            "."
        )

      const anchorProgram = new Program(idl, programId, provider)

      const [tokenMetadata, _] = await MetadataProgram.findMetadataAccount(mint)
      const userTokenAccount = await anchor.utils.token.associatedAddress({
        mint,
        owner: anchorWallet.publicKey,
      })

      const tx = await anchorProgram.methods
        .upgrade(newUri)
        .accounts({
          mintAddress: mint,
          tokenMetadata,
          updateAuthority: mintAuthorityPubKey,

          userAccount: anchorWallet.publicKey,
          userTokenAccount,

          tokenMetadataProgram: MetadataProgram.PUBKEY,
        })
        .transaction()

      /** Add burn instructions */
      mintsToBurn.forEach(async (mint) => {
        const burnix = await createBurnInstruction({
          connection,
          nftMint: mint,
          owner: anchorWallet.publicKey,
        })

        tx.add(burnix)
      })

      tx.feePayer = anchorWallet.publicKey

      tx.recentBlockhash = await (
        await connection.getLatestBlockhash()
      ).blockhash

      setFeedbackStatus("Preparing to combine... Please confirm your choice.")
      const signedtx = await provider.wallet.signTransaction(tx)

      const body = {
        tx: signedtx.serialize({
          /** Bypass validation since we don't have the authority signature yet */
          requireAllSignatures: false,
          verifySignatures: true,
        }),
        mint: mint.toString(),
      }

      setFeedbackStatus("Setting the essence...")

      const { txid } = await (
        await fetch("/api/call_program", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).json()

      if (!txid) {
        throw "Invalid request."
      }

      await connection.confirmTransaction(txid, "confirmed")

      // const metadataData = MetadataData.deserialize(
      //   (await anchorProgram.provider.connection.getAccountInfo(tokenMetadata))
      //     .data
      // )

      setFeedbackStatus(`Success! Your essence has been set!`)

      setTimeout(async () => {
        setFeedbackStatus("")
      }, 3000)

      return txid
    } catch (e) {
      console.log(e)
      setFeedbackStatus("Oops, something went wrong. " + e + "")

      setTimeout(() => {
        setFeedbackStatus("")
      }, 6000)
    }
  }

  return {
    feedbackStatus,
    upgrade,
  }
}

export default useMetadataUpgrade
