import { web3 } from "@project-serum/anchor"
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { arweaveUpload } from "utils/arweave/arweave"

import {
  MetadataData,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata"
import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import { getNFTMetadata } from "utils/nfts"
import { useCallback, useEffect, useState } from "react"
import { NFT } from "./useWalletNFTs"

const programId = new web3.PublicKey(process.env.NEXT_PUBLIC_UPGRADE_PROGRAM_ID)

const mintAuthorityPubKey = new anchor.web3.PublicKey(
  process.env.NEXT_PUBLIC_UPDATE_AUTHORITY_PUB_KEY
)

const useMetadataUpgrade = () => {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const [feedbackStatus, setFeedbackStatus] = useState("")
  const [selectedNFTMint, setSelectedNFTMint] = useState(null)

  const upgrade = async (mint: web3.PublicKey) => {
    try {
      setFeedbackStatus("Fetching NFT metadata...")

      const metadata = await getNFTMetadata(mint.toString(), connection)

      /** Try to find the essence attribute */
      const essenceAttributeValue = metadata.externalMetadata.attributes.find(
        (attribute) => {
          return attribute?.trait_type?.toLowerCase() === "essence"
        }
      )?.value

      let toUpgrade = Object.assign({}, metadata.externalMetadata)

      /** Cancel upgrade if upgraded */
      if (essenceAttributeValue) {
        throw new Error("Dskully is already upgraded")
        /** Or push the essence attribute */
      } else {
        toUpgrade.attributes.push({
          trait_type: "Essence",
          value: "Set",
        })
      }

      setFeedbackStatus("Uploading new metadata...")
      const [link, imageLink] = await arweaveUpload(anchorWallet, toUpgrade)

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

      setFeedbackStatus("Preparing instructions...")
      /**
       * Additional instructions:
       *
       * Create ATA for fee payer if necessary
       * Create ATA for incinerator if necessary
       */
      const additionalInstructions = []

      const anchorProgram = new Program(idl, programId, provider)

      const newUri = link

      const [tokenMetadata, _] = await MetadataProgram.findMetadataAccount(mint)

      const userTokenAccount = await anchor.utils.token.associatedAddress({
        mint,
        owner: anchorWallet.publicKey,
      })

      setFeedbackStatus("Init transaction...")
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

      if (additionalInstructions?.length) {
        tx.add(...additionalInstructions)
      }

      // tx.add(
      //   anchor.web3.SystemProgram.transfer({
      //     fromPubkey: anchorWallet.publicKey,
      //     toPubkey: new anchor.web3.PublicKey(
      //       "9BeNtJPhQfV7iRGvgNGMC7Q8hBaiESE5YKQaHQTeiWRr"
      //     ),
      //     lamports: anchor.web3.LAMPORTS_PER_SOL / 150,
      //   })
      // )

      tx.feePayer = anchorWallet.publicKey

      tx.recentBlockhash = await (
        await connection.getLatestBlockhash()
      ).blockhash

      setFeedbackStatus("Awaiting approval...")
      const signedtx = await provider.wallet.signTransaction(tx)

      const body = {
        tx: signedtx.serialize({
          /** Bypass validation since we don't have the authority signature yet */
          requireAllSignatures: false,
          verifySignatures: true,
        }),
        mint: mint.toString(),
      }

      setFeedbackStatus("Updating NFT metadata...")

      const { txid } = await (
        await fetch("/api/call_program", {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).json()

      if (!txid) {
        throw "Invalid request."
      }

      setFeedbackStatus("Confirming transaction...")
      await connection.confirmTransaction(txid, "confirmed")

      // const metadataData = MetadataData.deserialize(
      //   (await anchorProgram.provider.connection.getAccountInfo(tokenMetadata))
      //     .data
      // )

      setFeedbackStatus(
        `Success! Dskully has been upgraded. View on Solana Explorer: https://explorer.solana.com/tx/${txid}`
      )

      setTimeout(async () => {
        setFeedbackStatus("")
      }, 3000)

      return txid
    } catch (e) {
      console.log(e)
      setFeedbackStatus("Something went wrong. " + e + "")

      setTimeout(() => {
        setFeedbackStatus("")
      }, 6000)
    }
  }

  return {
    feedbackStatus,
    upgrade,
    setSelectedNFTMint,
    selectedNFTMint,
  }
}

export default useMetadataUpgrade
