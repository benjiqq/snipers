import { model, Schema, Document } from 'mongoose';
import { Pool } from '@types';

const schema: Schema = new Schema({
    pool_account: {
        type: String,
        unique: true,
        index: true,
    },
    block_time: Number,
    lp_amount: String,
    pool_open_time: String,
    pool_mint_signature: String,
    pair_details: {
        coin_decimals: Number,
        pc_decimals: Number,
        fees: {
            min_separate_numerator: String,
            min_separate_denominator: String,
            trade_fee_numerator: String,
            trade_fee_denominator: String,
            pnl_numerator: String,
            pnl_denominator: String,
            swap_fee_numerator: String,
            swap_fee_denominator: String,
        },
        token_coin: String,
        token_pc: String,
        coin_mint: String,
        pc_mint: String,
        coin_amount: String,
        pc_amount: String,
        SOL_TOKEN_ACCOUNT: String,
        lp_mint: String,
        open_orders: String,
        market: String,
        serum_dex: String,
        target_orders: String,
        amm_owner: String,
        swap_take_coin_fee: String,
    },
    token: {
        name: String,
        symbol: String,
        address: String,
        description: String,
        creator_name: String,
        creator_site: String,
        supply: String,
    },
    first_swap_at: Number,
    first_swap_block: Number,
    pool_creator: String,
    status: {
        type: String,
        enum: ["waiting_for_analysis", "failed_analysis", "waiting_for_strategy", "position_open", "position_closed", "failed_to_open"],
        index: true
    },
    error: String,
    analysis: Object,
}, { timestamps: true });


export default model<Pool>('Pair', schema);;


