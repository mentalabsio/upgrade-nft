/** @jsxImportSource theme-ui */

import { NFT } from "@/hooks/useWalletNFTs"
import { useWallet } from "@solana/wallet-adapter-react"
import Select, { StylesConfig } from "react-select"
import { useThemeUI, Flex, Text } from "theme-ui"

const SelectorNFTOptionLabel = ({
  imgSrc,
  name,
}: {
  imgSrc: string
  name: string
}) => {
  return (
    <Flex
      sx={{
        alignItems: "center",
        gap: "1.6rem",
      }}
    >
      <img
        src={imgSrc}
        sx={{
          maxHeight: "4.8rem",
        }}
      />
      <Text mr="1.6rem">{name}</Text>
    </Flex>
  )
}

const NFTSelectInput = ({
  name,
  NFTs = null,
  value = null,
  onChange = null,
}: {
  name: string
  NFTs: NFT[]
  value?: string | number
  onChange?: (newValue: { value: unknown; label: React.ReactElement }) => any
}) => {
  const { publicKey } = useWallet()
  const { theme } = useThemeUI()

  const options =
    NFTs &&
    NFTs.map((NFT) => ({
      value: NFT.mint.toString(),
      label: (
        <SelectorNFTOptionLabel
          imgSrc={NFT.externalMetadata.image}
          name={NFT.onchainMetadata.data.name}
        />
      ),
    }))

  const colourStyles: StylesConfig = {
    control: (styles) => ({
      ...styles,
      backgroundColor: theme?.colors.background.toString(),
      minHeight: "6.4rem",
    }),

    container: (styles) => ({
      ...styles,
      minWidth: "22.4rem",
    }),

    menu: (styles) => ({
      ...styles,
      backgroundColor: theme?.colors.background.toString(),
    }),

    option: (styles, { isDisabled, isFocused, isSelected }) => {
      return {
        ...styles,
        backgroundColor: isDisabled
          ? undefined
          : isFocused
          ? "#333"
          : isSelected
          ? theme?.colors.background.toString()
          : undefined,
        color: isDisabled
          ? "#ccc"
          : isSelected
          ? theme?.colors.primary.toString()
          : theme?.colors.text.toString(),
        cursor: isDisabled ? "not-allowed" : "pointer",

        ":active": {
          ...styles[":active"],
          backgroundColor: !isDisabled ? "#333" : undefined,
        },
      }
    },
    singleValue: (styles) => ({
      ...styles,
      color: theme?.colors.text.toString(),
    }),
  }

  return (
    <Select
      key={"nftselect-" + options?.length}
      {...(value
        ? { value: options.filter((option) => option.value === value) }
        : {})}
      {...(onChange ? { onChange } : {})}
      name={name}
      options={options || []}
      styles={colourStyles}
      placeholder={
        <SelectorNFTOptionLabel
          name={
            publicKey
              ? NFTs
                ? "Select an NFT"
                : "Loading NFTs..."
              : "Connect your wallet."
          }
          imgSrc="/animation.png"
        />
      }
    />
  )
}
export default NFTSelectInput
