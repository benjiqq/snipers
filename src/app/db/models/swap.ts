import { model, Schema, Document } from 'mongoose';
import { DecodedSwap } from '@types';

const schema: Schema = new Schema({
    pool_address: {
        type: String,
        index: true,
    },
    blockTime: Number,
    type: String,
    sol_amount: String,
    token_amount: String,
    account: String,
    tx_signature: String,
}, { timestamps: true });


export default model<DecodedSwap>('Swap', schema);;

