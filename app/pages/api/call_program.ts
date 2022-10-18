import { NextApiRequest, NextApiResponse } from "next"

import * as anchor from "@project-serum/anchor"
import { getNFTMetadata } from "utils/nfts"

import { hostname } from "os"

const updateAuthority = anchor.web3.Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(process.env.UPDATE_AUTHORITY_PK_BS58)
)

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const endpoint =
      process.env.NEXT_PUBLIC_CONNECTION_NETWORK === "devnet"
        ? process.env.NEXT_PUBLIC_SOLANA_RPC_HOST_DEVNET
        : process.env.NEXT_PUBLIC_SOLANA_RPC_HOST_MAINNET_BETA

    if (!endpoint) throw new Error("No RPC endpoint configured.")

    const hostnamee = hostname()
    console.log(req.headers.host)
    console.log("hostname ", hostnamee)
    console.log(res.getHeaders())
    const connection = new anchor.web3.Connection(endpoint, {
      httpHeaders: {
        "Content-Type": "application/json",
        Referer: "dskullys-essence.vercel.app",
      },
      commitment: "confirmed",
    })

    const parsedBody = JSON.parse(req.body)
    const serializedTx = parsedBody.tx
    const mint = parsedBody.mint

    /** Basic security */
    /** Check if the price table is correct for the current mint. */

    if (!mint) {
      console.log(mint)
      console.log(parsedBody)
      res.send({
        txid: null,
        error: "Invalid request.",
      })

      return true
    }

    const NFTMetadata = await getNFTMetadata(mint, connection)

    if (!NFTMetadata) {
      res.send({
        txid: null,
        error: "Couldn't fetch NFT metadata.",
      })

      return true
    }

    /** End Basic security */

    const tx = anchor.web3.Transaction.from(serializedTx.data)

    tx.partialSign(updateAuthority)

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
