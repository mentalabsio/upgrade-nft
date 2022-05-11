import { NextApiRequest, NextApiResponse } from "next"

import * as anchor from "@project-serum/anchor"
import { getNFTMetadata } from "utils/nfts"
import {
  feeTokenAddress,
  getNFTPriceTableToUpgrade,
} from "@/hooks/useMetadataUpgrade"

const mintOwner = anchor.web3.Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(process.env.MINT_AUTHORITY_PK)
)

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const endpoint =
      process.env.NEXT_PUBLIC_CONNECTION_NETWORK === "devnet"
        ? process.env.NEXT_PUBLIC_SOLANA_RPC_HOST_DEVNET
        : process.env.NEXT_PUBLIC_SOLANA_RPC_HOST_MAINNET_BETA

    if (!endpoint) throw new Error("No RPC endpoint configured.")

    const connection = new anchor.web3.Connection(endpoint, "confirmed")

    const parsedBody = JSON.parse(req.body)
    const serializedTx = parsedBody.tx
    const mint = parsedBody.mint

    /** Basic security */
    /** Check if the price table is correct for the current mint. */

    if (!mint || !parsedBody.selectedUpgradeType || !parsedBody.priceTable) {
      res.send({
        txid: null,
        error: "Invalid request.",
      })

      return true
    }

    const NFTMetadata = await getNFTMetadata(mint, connection)
    const priceTable = await getNFTPriceTableToUpgrade(
      NFTMetadata,
      parsedBody.selectedUpgradeType
    )

    const isCostCorrect = parsedBody.priceTable.cost === priceTable.cost
    const isChanceCorrect = parsedBody.priceTable.chance === priceTable.chance

    if (!isCostCorrect || !isChanceCorrect) {
      console.log(
        "Expected cost: %s, got: %s",
        priceTable.cost,
        parsedBody.priceTable.cost
      )
      console.log(
        "Expected chance: %s, got: %s",
        priceTable.chance,
        parsedBody.priceTable.chance
      )
      res.send({
        txid: null,
        error: "Invalid request.",
      })

      return true
    }

    if (parsedBody.feeTokenAddress !== feeTokenAddress.toString()) {
      res.send({
        txid: null,
        error: "Invalid request.",
      })

      return true
    }

    /** End Basic security */

    const tx = anchor.web3.Transaction.from(serializedTx.data)

    tx.partialSign(mintOwner)

    const txid = await connection.sendRawTransaction(
      tx.serialize({
        requireAllSignatures: false,
      })
    )

    res.send({
      txid,
    })

    return true
  } catch (e) {
    console.log(e)

    res.send({
      txid: null,
      error: e + "",
    })
  }
}
