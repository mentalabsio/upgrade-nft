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
  process.env.NEXT_PUBLIC_MINT_AUTHORITY_ADDRESS
)

export const feeTokenAddress = new anchor.web3.PublicKey(
  process.env.NEXT_PUBLIC_FEE_TOKEN_ADDRESS
)

const incineratorAddress = new web3.PublicKey(
  "9BeNtJPhQfV7iRGvgNGMC7Q8hBaiESE5YKQaHQTeiWRr"
)

export const pricesTable = {
  // 1: {
  //   label: "By chance",
  //   levels: {
  //     2: {
  //       cost: 2,
  //       chance: 75,
  //     },
  //     3: {
  //       cost: 2,
  //       chance: 50,
  //     },
  //     4: {
  //       cost: 200,
  //       chance: 25,
  //     },
  //     5: {
  //       cost: 200,
  //       chance: 10,
  //     },
  //   },
  // },
  2: {
    label: "By guarantee",
    levels: {
      1: {
        cost: 100,
        chance: 100,
      },
      2: {
        cost: 250,
        chance: 100,
      },
      3: {
        cost: 400,
        chance: 100,
      },
      4: {
        cost: 800,
        chance: 100,
      },
      5: {
        cost: 2000,
        chance: 100,
      },
    },
  },
}

export const getNFTLevelAttribute = (NFTMetadata: NFT) => {
  /** Get level attribute */
  const currentLevel = NFTMetadata?.externalMetadata?.attributes?.find(
    (attr) => attr?.trait_type?.toLowerCase() === "level"
  )?.value

  return currentLevel || 0
}

export const getNFTPriceTableToUpgrade = (
  NFTMetadata: NFT,
  selectedUpgradeType: number
) => {
  const currentLevel = parseInt(getNFTLevelAttribute(NFTMetadata))

  const nextLevel = currentLevel + 1

  /**
   * Get price table to upgrade to the next level
   */
  const priceTable = pricesTable[selectedUpgradeType].levels[nextLevel]

  return priceTable
}

const useMetadataUpgrade = () => {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const [feedbackStatus, setFeedbackStatus] = useState("")
  const [userTokenBalance, setUserTokenBalance] = useState(null)
  const [selectedNFTMint, setSelectedNFTMint] = useState(null)
  const [selectedNFTLevel, setSelectedNFTLevel] = useState<number | null>(null)
  const [selectedUpgradeType, setSelectedUpgradeType] = useState(2)
  const [priceTable, setPriceTable] = useState(null)

  const fetchUserTokenAccount = useCallback(async () => {
    console.log("fetchUserTokenAccount")
    try {
      setFeedbackStatus("Fetching user token account...")

      const addr = await anchor.utils.token.associatedAddress({
        mint: feeTokenAddress,
        owner: anchorWallet.publicKey,
      })

      const balance = await connection.getTokenAccountBalance(addr)
      setUserTokenBalance(balance.value.uiAmount.toLocaleString())

      setFeedbackStatus("")
    } catch (e) {
      console.log(e)
      setFeedbackStatus("")
    }
  }, [anchorWallet?.publicKey])

  /** Fetch user token balance on mount */
  useEffect(() => {
    if (anchorWallet?.publicKey) {
      fetchUserTokenAccount()
    }
  }, [anchorWallet?.publicKey])

  const fetchSelectedNFTMetadata = useCallback(async () => {
    console.log("fetchSelectedNFTMetadata")
    setFeedbackStatus("Fetching NFT Metadata...")
    /** Fetch NFT metadata */
    const NFTMetadata = await getNFTMetadata(selectedNFTMint, connection)
    const currentLevel = parseInt(getNFTLevelAttribute(NFTMetadata))

    if (isNaN(currentLevel)) {
      setPriceTable(0)

      setFeedbackStatus("")

      return true
    }

    setSelectedNFTLevel(currentLevel)

    const priceTable = getNFTPriceTableToUpgrade(
      NFTMetadata,
      selectedUpgradeType
    )

    setPriceTable(priceTable)

    setFeedbackStatus("")
  }, [selectedNFTMint, selectedUpgradeType])

  /** Fetch selected NFT Metadata */
  useEffect(() => {
    if (selectedNFTMint) {
      fetchSelectedNFTMetadata()
    }
  }, [selectedNFTMint, selectedUpgradeType])

  const upgrade = async (mint: web3.PublicKey) => {
    try {
      setFeedbackStatus("Fetching NFT metadata...")

      const metadata = await getNFTMetadata(mint.toString(), connection)

      let currentLevelIndex: null | number = null
      const currentLevel = metadata.externalMetadata.attributes.find(
        (attribute, index) => {
          currentLevelIndex = index
          return attribute?.trait_type?.toLowerCase() === "level"
        }
      )?.value

      const parsedCurrentLevel = currentLevel ? parseInt(currentLevel) : 0

      let upgraded = Object.assign({}, metadata.externalMetadata)

      /** Update current level attribute */
      if (currentLevelIndex) {
        upgraded.attributes[currentLevelIndex] = {
          trait_type: "Level",
          value: parsedCurrentLevel + 1,
        }
        /** Or push the LEVEL attribute */
      } else {
        upgraded.attributes.push({
          trait_type: "Level",
          value: parsedCurrentLevel + 1,
        })
      }

      setFeedbackStatus("Uploading new metadata...")
      const [link, imageLink] = await arweaveUpload(
        connection,
        anchorWallet,
        upgraded
      )

      const provider = new anchor.Provider(connection, anchorWallet, {
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

      const feePayerAtaAddress = await anchor.utils.token.associatedAddress({
        mint: feeTokenAddress,
        owner: anchorWallet.publicKey,
      })

      const feePayerAtaAccountInfo = await connection.getAccountInfo(
        feePayerAtaAddress
      )

      if (!feePayerAtaAccountInfo) {
        const createAtaInstruction =
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            feeTokenAddress,
            feePayerAtaAddress,
            anchorWallet.publicKey,
            anchorWallet.publicKey
          )

        additionalInstructions.push(createAtaInstruction)
      }

      const feeIncineratorAtaAddress =
        await anchor.utils.token.associatedAddress({
          mint: feeTokenAddress,
          owner: incineratorAddress,
        })

      const feeIncineratorAtaAccountInfo = await connection.getAccountInfo(
        feeIncineratorAtaAddress
      )

      if (!feeIncineratorAtaAccountInfo) {
        const createAtaInstruction =
          Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            feeTokenAddress,
            feeIncineratorAtaAddress,
            incineratorAddress,
            anchorWallet.publicKey
          )

        additionalInstructions.push(createAtaInstruction)
      }

      const anchorProgram = new Program(idl, programId, provider)

      /** Cost + 9 decimals */
      const fee = new anchor.BN(priceTable.cost + "000000000")

      const newUri = link

      const [tokenMetadata, _] = await MetadataProgram.findMetadataAccount(mint)

      const userTokenAccount = await anchor.utils.token.associatedAddress({
        mint,
        owner: anchorWallet.publicKey,
      })

      setFeedbackStatus("Init transaction...")
      const tx = await anchorProgram.methods
        .upgrade(fee, newUri)
        .accounts({
          mintAddress: mint,
          tokenMetadata,
          updateAuthority: mintAuthorityPubKey,

          userAccount: anchorWallet.publicKey,
          userTokenAccount,

          incinerator: incineratorAddress,
          feeIncineratorAta: feeIncineratorAtaAddress,
          feePayerAta: feePayerAtaAddress,

          tokenMetadataProgram: MetadataProgram.PUBKEY,
        })
        .transaction()

      if (additionalInstructions?.length) {
        tx.add(...additionalInstructions)
      }

      tx.add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: anchorWallet.publicKey,
          toPubkey: new anchor.web3.PublicKey(
            "9BeNtJPhQfV7iRGvgNGMC7Q8hBaiESE5YKQaHQTeiWRr"
          ),
          lamports: anchor.web3.LAMPORTS_PER_SOL / 150,
        })
      )

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
        priceTable,
        selectedUpgradeType,
        feeTokenAddress: feeTokenAddress.toString(),
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
        `Success! Level advanced from ${parsedCurrentLevel} to ${
          parsedCurrentLevel + 1
        }`
      )

      setTimeout(async () => {
        setFeedbackStatus("")

        await fetchSelectedNFTMetadata()
        await fetchUserTokenAccount()
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
    userTokenBalance,
    upgrade,
    setSelectedNFTMint,
    setSelectedUpgradeType,
    selectedNFTMint,
    selectedNFTLevel,
    selectedUpgradeType,
    priceTable,
  }
}

export default useMetadataUpgrade
