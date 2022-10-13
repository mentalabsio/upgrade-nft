use anchor_lang::prelude::*;
use anchor_spl::token::{ Mint, TokenAccount };
use solutils::wrappers::metadata::{ MetadataAccount, TokenMetadata, UpdateMetadataAccountV2 };

declare_id!("PDBzXXEihGKUYUuJyoV4MxdbhDcRydpXMEjXhvfNE1f");

#[program]
pub mod upgrade_nft {
    use solutils::mpl_token_metadata::state::{ Data, DataV2, Metadata };
    use solutils::wrappers::metadata;

    use super::*;

    pub fn upgrade(ctx: Context<Upgrade>, new_uri: String) -> Result<()> {
        let Metadata {
            data: Data { name, symbol, creators, seller_fee_basis_points, .. },
            uses,
            collection,
            ..
        } = (&**ctx.accounts.token_metadata).clone();

        let data = DataV2 {
            uri: new_uri,
            name,
            symbol,
            seller_fee_basis_points,
            creators,
            uses,
            collection,
        };

        metadata::update_metadata_accounts_v2((&*ctx.accounts).into(), data)
    }
}

#[derive(Accounts)]
pub struct Upgrade<'info> {
    pub mint_address: Account<'info, Mint>,

    #[account(
        mut,
        constraint = token_metadata.is_mutable,
        constraint = token_metadata.mint == mint_address.key(),
        constraint = token_metadata.update_authority == update_authority.key()
    )]
    pub token_metadata: Account<'info, MetadataAccount>,

    #[account(mut)]
    pub update_authority: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == mint_address.key(),
        constraint = user_token_account.owner == owner.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,

    pub token_metadata_program: Program<'info, TokenMetadata>,
}

impl<'info> From<&Upgrade<'info>>
for CpiContext<'_, '_, '_, 'info, UpdateMetadataAccountV2<'info>> {
    fn from(ctx: &Upgrade<'info>) -> Self {
        let accounts = UpdateMetadataAccountV2 {
            metadata_account: ctx.token_metadata.to_account_info(),
            update_authority: ctx.update_authority.to_account_info(),
        };

        CpiContext::new(ctx.token_metadata_program.to_account_info(), accounts)
    }
}