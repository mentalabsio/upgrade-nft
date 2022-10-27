/** @jsxImportSource theme-ui */

import { NFT } from "@/hooks/useWalletNFTs"
import { useWallet } from "@solana/wallet-adapter-react"
import Select, { StylesConfig } from "react-select"
import { useThemeUI, Flex, Text } from "theme-ui"

const SelectorNFTOptionLabel = ({
  imgSrc,
  name,
  size,
}: {
  imgSrc: string
  name: string
  size?: string
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
          maxHeight: size || "4.8rem",
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
  size,
  placeholderImg,
}: {
  name: string
  NFTs: NFT[]
  value?: string | number
  onChange?: (newValue: { value: unknown; label: React.ReactElement }) => any
  size?: string
  placeholderImg?: string
}) => {
  const { publicKey } = useWallet()
  const { theme } = useThemeUI()

  const options =
    NFTs &&
    NFTs.map((NFT) => ({
      value: NFT.mint.toString(),
      label: (
        <SelectorNFTOptionLabel
          key={NFT.mint.toString()}
          name={NFT.onchainMetadata.data.name}
          imgSrc={NFT.externalMetadata.image}
          size={size}
        />
      ),
    }))

  const colourStyles: StylesConfig = {
    control: (styles) => ({
      ...styles,
      backgroundColor: theme?.colors.background.toString(),
      minHeight: size || "4.8rem",
      padding: ".8rem 0",
    }),

    container: (styles) => ({
      ...styles,
      minWidth: "19.2rem",
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
      defaultValue={options?.length ? options[0] : null}
      placeholder={
        <SelectorNFTOptionLabel
          name={
            publicKey
              ? NFTs
                ? "Select an NFT"
                : "Loading NFTs..."
              : "Connect your wallet."
          }
          size={size}
          imgSrc={placeholderImg || "/animation.png"}
        />
      }
    />
  )
}
export default NFTSelectInput
