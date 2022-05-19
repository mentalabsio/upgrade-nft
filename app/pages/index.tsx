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
  const anchorWallet = useAnchorWallet()
  const {
    upgrade,
    setSelectedNFTMint,
    setSelectedUpgradeType,
    feedbackStatus,
    userTokenBalance,
    selectedNFTMint,
    selectedNFTLevel,
    priceTable,
  } = useMetadataUpgrade()

  const isAtMaxLevel =
    selectedNFTLevel + 1 > 1 && !priceTable && priceTable !== 0

  return (
    <>
      <Head>
        <title>Draygon Upgrade</title>
        <meta name="description" content="Upgrade your Draygon" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "8rem",
        }}
      >
        <Heading
          sx={{
            zIndex: 1,
            fontSize: "4rem",
            position: "relative",

            ":before": {
              content: "''",
              width: "270px",
              height: "270px",
              borderRadius: "50%",
              backgroundColor: "#281b69",
              filter: "blur(40px)",
              margin: "auto",
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: -1,
            },
          }}
          mb=".8rem"
          variant="heading1"
        >
          Upgrade your Draygon
        </Heading>
        {/* <Text>Quickstart template to build Solana web3 applications</Text> */}

        <Flex
          my="3.2rem"
          sx={{
            flexDirection: "column",
            gap: "1.6rem",
            marginTop: "12rem",
          }}
        >
          <Flex
            sx={{
              flexDirection: "column",
              gap: ".8rem",
            }}
          >
            <Heading variant="heading3">
              Select a Baby Draygon to upgrade:
            </Heading>

            <form
              onSubmit={async (e) => {
                e.preventDefault()

                const data = new FormData(e.currentTarget)

                const mint = data.get("mint")

                if (!anchorWallet?.publicKey) return true

                if (!mint) return true

                await upgrade(new web3.PublicKey(mint))

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
                  alignItems: "center",
                }}
              >
                <NFTSelectInput
                  value={selectedNFTMint}
                  onChange={(newValue) => {
                    setSelectedNFTMint(newValue.value)
                  }}
                  name="mint"
                  NFTs={walletNFTs}
                />

                {priceTable === 0 ? (
                  <Text
                    sx={{
                      color: "error",
                    }}
                  >
                    This NFT has no 'Level' attribute.
                  </Text>
                ) : null}

                {isAtMaxLevel ? (
                  <Text
                    sx={{
                      color: "warning",
                    }}
                  >
                    This NFT is already at the max level! 🚀
                  </Text>
                ) : null}
              </Flex>

              {/* {selectedNFTMint && priceTable && priceTable !== 0 ? (
                <Flex
                  sx={{
                    gap: "1.6rem",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Label>Select an upgrade type:</Label>
                  <Select
                    sx={{
                      minWidth: "16rem",
                    }}
                    onChange={(e) =>
                      setSelectedUpgradeType(parseInt(e.target.value))
                    }
                  >
                    <option value={1}>By chance</option>
                    <option value={2}>By guarantee</option>
                  </Select>
                </Flex>
              ) : null} */}

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
                  >
                    {priceTable && selectedNFTLevel ? (
                      <>
                        <Text>
                          Current Level: <b>{selectedNFTLevel}</b> | Next Level:{" "}
                          <b>{selectedNFTLevel + 1}</b>
                        </Text>
                        <Text>
                          Cost: <b>{priceTable.cost}</b> $DRAY |&nbsp; Chance to
                          upgrade: <b>{priceTable.chance}%</b>
                        </Text>
                      </>
                    ) : null}
                  </Text>
                ) : (
                  <>&nbsp; </>
                )}
                <Button
                  sx={{
                    alignSelf: "center",
                  }}
                  type="submit"
                  disabled={!userTokenBalance || !priceTable}
                >
                  upgrade!
                </Button>
                <Text my=".8rem">
                  Your Balance: <b>{userTokenBalance || `0`}</b> $DRAY
                </Text>
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

      <footer
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "4rem 0",
        }}
      >
        Powered by{" "}
        <a
          href="https://twitter.com/magicshards"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <Text
            variant="small"
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              sx={{
                height: "32px",
              }}
              src="/magicshards320px.gif"
              alt="Magic Shards"
              height={32}
            />
            MagicShards
          </Text>
        </a>
      </footer>
    </>
  )
}
