/** @jsxImportSource theme-ui */
import Head from "next/head"

import {
  Flex,
  Heading,
  Text,
  Button,
  Select,
  Label,
} from "@theme-ui/components"

import Header from "@/components/Header/Header"
import NFTSelectInput from "@/components/NFTSelectInput/NFTSelectInput"
import useWalletNFTs from "@/hooks/useWalletNFTs"
import { useAnchorWallet } from "@solana/wallet-adapter-react"
import useMetadataUpgrade from "@/hooks/useMetadataUpgrade"
import { web3 } from "@project-serum/anchor"
import { LoadingIcon } from "@/components/icons/LoadingIcon"

export default function Home() {
  const { walletNFTs, fetchNFTs } = useWalletNFTs([
    process.env.NEXT_PUBLIC_NFT_CREATOR_ADDR,
  ])
  const { walletNFTs: heartNFTs } = useWalletNFTs([
    "3NhvWncgSUBhvLnXeT4j2LebAHWiZiX4CXmsigibfy4M",
  ])
  const { walletNFTs: mindNFTs } = useWalletNFTs([
    "9Wuz2npnEamiV4TaesDFB1wfqpwJc1EMK78ehtkUGBaw",
  ])
  const { walletNFTs: soulNFTs } = useWalletNFTs([
    "DszDT5xPz11xoHDehhWjV5T3xk7ALM3NV5hkupJKZwjg",
  ])
  const anchorWallet = useAnchorWallet()
  const { upgrade, feedbackStatus } = useMetadataUpgrade()

  return (
    <>
      <Head>
        <title>Dskullys Essence Upgrade</title>
        <meta name="description" content="Dskullys Essence Upgrade" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div
        sx={{
          zIndex: 0,

          "&:before": {
            content: "''",
            backgroundImage: "url(essence_bg.jpeg)",
            // backgroundAttachment: "",
            minHeight: "100vh",
            opacity: 0.9,
            zIndex: 0,
            position: "fixed",
            left: 0,
            top: "8rem",
            width: "100%",
            height: "100%",
            // backgroundPosition: "",
            backgroundSize: "cover",
            pointerEvents: "none",
            backgroundRepeat: "no-repeat",
            /** Horizontally centralized */
            backgroundPosition: "50% 0",

            // "@media (min-width: 768px)": {
            //   backgroundSize: "cover",
            // },
          },
        }}
      ></div>
      <main
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "2.4rem",
          zIndex: 10,

          "*": {
            zIndex: 10,
          },
        }}
      >
        <Flex
          sx={{
            alignItems: "center",
            flexDirection: "column",
            gap: "3.2rem",

            "@media (min-width: 768px)": {
              flexDirection: "row",
            },
          }}
        >
          {/* <img
            sx={{
              zIndex: 10,
              maxWidth: "24rem",
              marginBottom: "3.2rem",
              borderRadius: ".4rem",
            }}
            src="/main.png"
          /> */}

          <Flex
            sx={{
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Heading
              sx={{
                zIndex: 1,
                position: "relative",
                color: "#FFFFFF",
                fontFamily: "Quarry Bones, Sans-serif",
                fontWeight: "500",
                textTransform: "uppercase",
                fontSize: "3.2rem",
                marginTop: "3.2rem",
              }}
              mb=".8rem"
              variant="heading1"
            >
              Set the Essence
            </Heading>
            <Text variant="heading3">
              And lock your Dskully into its original form forever
            </Text>
          </Flex>
        </Flex>

        <Flex
          my="3.2rem"
          sx={{
            flexDirection: "column",
            gap: "1.6rem",
            marginTop: "36rem",
            position: "relative",
          }}
        >
          <Flex
            sx={{
              flexDirection: "column",
              gap: ".8rem",
            }}
          >
            <Heading variant="heading3">Select the ingredients:</Heading>

            <form
              onSubmit={async (e) => {
                e.preventDefault()

                const data = new FormData(e.currentTarget)

                const mint = data.get("mint")
                const mintToBurn1 = data.get("mintToBurn1")
                const mintToBurn2 = data.get("mintToBurn2")
                const mintToBurn3 = data.get("mintToBurn3")

                if (!anchorWallet?.publicKey) return true

                if (!mint) return true

                await upgrade(new web3.PublicKey(mint), [
                  new web3.PublicKey(mintToBurn1),
                  new web3.PublicKey(mintToBurn2),
                  new web3.PublicKey(mintToBurn3),
                ])

                await fetchNFTs()

                return true
              }}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3.2rem",
                margin: "1.6rem 0",
              }}
            >
              <Flex
                sx={{
                  gap: "1.6rem",
                  flexDirection: "column",

                  "@media (min-width: 768px)": {
                    flexDirection: "row",
                  },
                }}
              >
                <NFTSelectInput
                  name="mintToBurn1"
                  NFTs={mindNFTs}
                  size="3.2rem"
                  placeholderImg="/mind.png"
                />
                <NFTSelectInput
                  name="mintToBurn2"
                  NFTs={soulNFTs}
                  size="3.2rem"
                  placeholderImg="/soul.png"
                />
                <NFTSelectInput
                  name="mintToBurn3"
                  NFTs={heartNFTs}
                  size="3.2rem"
                  placeholderImg="/heart.png"
                />
              </Flex>
              <Heading variant="heading3">Select the Dskully:</Heading>
              <Flex
                sx={{
                  gap: "1.6rem",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <NFTSelectInput
                  name="mint"
                  NFTs={walletNFTs}
                  placeholderImg="/main.png"
                />
              </Flex>

              <Flex
                sx={{
                  flexDirection: "column",
                  alignItems: "center",
                  gap: ".8rem",
                }}
              >
                {anchorWallet?.publicKey ? (
                  <Text
                    sx={{
                      textAlign: "center",
                      padding: ".8rem 1.6rem",
                      gap: ".8rem",
                      display: "flex",
                      flexDirection: "column",

                      b: {
                        padding: ".2rem .8rem",
                        border: "1px solid",
                        borderColor: "primary",
                        borderRadius: ".4rem",
                      },
                    }}
                    my="1.6rem"
                  ></Text>
                ) : (
                  <>&nbsp; </>
                )}
                <Button
                  sx={{
                    alignSelf: "center",
                  }}
                  type="submit"
                >
                  upgrade!
                </Button>
                {/* <Text my=".8rem">
                  Your Balance: <b>{userTokenBalance || `0`}</b> $SKULL
                </Text> */}
                <Flex
                  sx={{
                    alignItems: "center",
                    gap: ".8rem",
                    margin: "1.6rem 0",
                    minHeight: "2.4rem",
                  }}
                >
                  {feedbackStatus && (
                    <>
                      {feedbackStatus.toLocaleLowerCase().indexOf("success") ===
                        -1 && <LoadingIcon />}

                      <Text
                        sx={{
                          color:
                            feedbackStatus
                              .toLocaleLowerCase()
                              .indexOf("success") !== -1
                              ? "success"
                              : "text",
                        }}
                      >
                        {feedbackStatus}
                      </Text>
                    </>
                  )}{" "}
                  &nbsp;
                </Flex>
              </Flex>
            </form>
          </Flex>
        </Flex>
      </main>
    </>
  )
}
