import * as anchor from "@project-serum/anchor"
import FormData from "form-data"
import path from "path"
import fetch from "node-fetch"
import { calculate } from "@metaplex/arweave-cost"
import { Connection } from "@metaplex/js"
import { Transaction } from "@solana/web3.js"
import { AnchorWallet } from "@solana/wallet-adapter-react"

export const ARWEAVE_PAYMENT_WALLET = new anchor.web3.PublicKey(
  "6FKvsq4ydWFci6nGq9ckbjYMtnmaqAoatz5c9XWjiDuS"
)

const ARWEAVE_UPLOAD_ENDPOINT =
  "https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile"

async function fetchAssetCostToStore(fileSizes: number[]) {
  const result = await calculate(fileSizes)

  const cost = result.solana * anchor.web3.LAMPORTS_PER_SOL
  // add additional lamport to prevent error.
  return cost + 10000
}

async function upload(data: FormData, manifest) {
  return await (
    await fetch(ARWEAVE_UPLOAD_ENDPOINT, {
      method: "POST",
      // @ts-ignore
      body: data,
    })
  ).json()
}

function estimateManifestSize(filenames: string[]) {
  const paths = {}

  for (const name of filenames) {
    paths[name] = {
      id: "artestaC_testsEaEmAGFtestEGtestmMGmgMGAV438",
      ext: path.extname(name).replace(".", ""),
    }
  }

  const manifest = {
    manifest: "arweave/paths",
    version: "0.1.0",
    paths,
    index: {
      path: "metadata.json",
    },
  }

  const data = Buffer.from(JSON.stringify(manifest), "utf8")
  console.log("Estimated manifest size:", data.length)
  return data.length
}

export async function arweaveUpload(
  wallet: AnchorWallet,
  metadata,
  env = "mainnet-beta",
  image = "https://bafybeiasgp3dwwcuu63pvrjirwonk6by5nne6aiznyz3h75vf3cynxv4gy.ipfs.dweb.link/3109.png"
) {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_HOST_MAINNET_BETA,
    "confirmed"
  )
  const metadataBuffer = Buffer.from(JSON.stringify(metadata)) // TODO rename metadataBuffer

  const imageExt = ".png"
  const imageFilename = `${0}${imageExt}`

  const rawFetch = await fetch(image)
  const imgBlob: Blob = await rawFetch.blob()

  const estimatedManifestSize = estimateManifestSize([
    `${imageFilename}`,
    "metadata.json",
  ])

  const storageCost = await fetchAssetCostToStore([
    imgBlob.size,
    metadataBuffer.length,
    estimatedManifestSize,
  ])

  /** Mount transaction */
  const instructions = [
    anchor.web3.SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: ARWEAVE_PAYMENT_WALLET,
      lamports: Math.ceil(storageCost),
    }),
  ]

  const latest = await connection.getLatestBlockhash()

  const tx = new Transaction({
    feePayer: wallet.publicKey,
    recentBlockhash: latest.blockhash,
  })

  tx.add(...instructions)

  await wallet.signTransaction(tx)

  const raw = tx.serialize()

  const txid = await connection.sendRawTransaction(raw)

  /** Start form data */
  const data = new FormData()
  data.append("transaction", txid)
  data.append("env", env)

  data.append("file[]", imgBlob, "0.png")

  data.append("file[]", new Blob([metadataBuffer]), "metadata.json")

  const result = await upload(data, metadata)

  const metadataFile = result.messages?.find(
    (m) => m.filename === "manifest.json"
  )

  const imageFile = result.messages?.find(
    (m) => m.filename === `${imageFilename}`
  )

  if (metadataFile?.transactionId) {
    const link = `https://arweave.net/${metadataFile.transactionId}`
    const imageLink = `https://arweave.net/${
      imageFile.transactionId
    }?ext=${imageExt.replace(".", "")}`
    console.log(`File uploaded: ${link}`)
    return [link, imageLink]
  } else {
    // @todo improve
    throw new Error(`No transaction ID for upload`)
  }
}
