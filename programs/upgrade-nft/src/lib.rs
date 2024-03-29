use anchor_lang::prelude::*;
use anchor_spl::token::Burn;
use anchor_spl::token::{Mint, Token, TokenAccount};
use solutils::wrappers::metadata::{MetadataAccount, TokenMetadata, UpdateMetadataAccountV2};

declare_id!("PDBzXXEihGKUYUuJyoV4MxdbhDcRydpXMEjXhvfNE1f");

#[program]
pub mod upgrade_nft {
    use solutils::mpl_token_metadata::state::{Data, DataV2, Metadata};
    use solutils::wrappers::metadata;

    use super::*;

    pub fn upgrade(ctx: Context<Upgrade>, fee: u64, new_uri: String) -> Result<()> {
        // Burn fee tokens;
        anchor_spl::token::burn((&*ctx.accounts).into(), fee)?;

        let Metadata {
            data:
                Data {
                    name,
                    symbol,
                    creators,
                    seller_fee_basis_points,
                    ..
                },
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

    pub user_account: Signer<'info>,

    #[account(
        mut,
        constraint = user_token_account.mint == mint_address.key(),
        constraint = user_token_account.owner == user_account.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub fee_token: Account<'info, Mint>,

    #[account(mut)]
    pub fee_payer_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, TokenMetadata>,
}

impl<'info> From<&Upgrade<'info>>
    for CpiContext<'_, '_, '_, 'info, UpdateMetadataAccountV2<'info>>
{
    fn from(ctx: &Upgrade<'info>) -> Self {
        let accounts = UpdateMetadataAccountV2 {
            metadata_account: ctx.token_metadata.to_account_info(),
            update_authority: ctx.update_authority.to_account_info(),
        };

        CpiContext::new(ctx.token_metadata_program.to_account_info(), accounts)
    }
}

impl<'info> From<&Upgrade<'info>> for CpiContext<'_, '_, '_, 'info, Burn<'info>> {
    fn from(ctx: &Upgrade<'info>) -> Self {
        CpiContext::new(
            ctx.token_metadata_program.to_account_info(),
            Burn {
                from: ctx.fee_payer_ata.to_account_info(),
                mint: ctx.fee_token.to_account_info(),
                authority: ctx.user_account.to_account_info(),
            },
        )
    }
}
