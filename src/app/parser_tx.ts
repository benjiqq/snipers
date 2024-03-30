import { Connection, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
// import { rabbitMQPublisher } from "../lib/pubsub/publisher.js";
// import { rabbitMQSubscriber } from "../lib/pubsub/subscriber.js";
import Log from '../lib/logger.js';
import { ConsumeMessage } from "amqplib";
import * as Utils from "@utils";
import { Pool, DecodedSwap } from "@types";
import bs58 from "bs58";
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Decimal } from "decimal.js";

//import { LiquidityPoolKeysV4, MARKET_STATE_LAYOUT_V3, Market, TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";

const RAYDIUM_AUTHORITY_V4 = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
const RAYDIUM_LIQUIDITY_POOL_V4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");


class TxParser {

    private static instance: TxParser | null = null;
    private connection: Connection | null = null;


    private constructor() {
        this.connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
    }

    public static getInstance(): TxParser {
        if (this.instance === null) {
            this.instance = new TxParser();
        }
        return this.instance;
    }

    public isSwap(logMessages: string[]): boolean {
        if (!this.connection) return false;
        const swapIndicator = "Program log: Instruction: Transfer";
        for (const logMessage of logMessages) {
            if (logMessage.includes(swapIndicator)) {
                return true;
            }
        }
        return false;
    }

    public isRaydiumSwap(instruction: ParsedInstruction | PartiallyDecodedInstruction, pool_address: PublicKey) {
        if (!("programId" in instruction) || !("accounts" in instruction) || !("data" in instruction)) return false;
        if (instruction.programId.toString() == RAYDIUM_LIQUIDITY_POOL_V4.toString() && instruction.accounts[1].toString() == pool_address.toString()) {
            const address = instruction.data;
            const bytes = bs58.decode(address);
            const instruction_code = bytes[0];
            return (instruction_code == 9);
        }
        return false;
    }

    public async getTradeType() {
        let SOL_TOKEN_ACCOUNT;
        // if (pool.pair_details.pc_mint === 'So11111111111111111111111111111111111111112') {
        //     SOL_TOKEN_ACCOUNT = pool.pair_details.token_pc;
        // } else {
        //     SOL_TOKEN_ACCOUNT = pool.pair_details.token_coin;
        // }
    }

    public async parseSwap(tx: any): Promise<DecodedSwap | false> {
        console.log('parseSwap');

        //either check for transfer or transferChecked

        ///////////////////////////
        ///////////////////////////

        let inner_instructions: any = tx?.meta?.innerInstructions;
        let swaps = [];
        for (let inner_instruction of inner_instructions) {
            let nested_instructions = inner_instruction.instructions;
            //console.log(nested_instructions);
            for (let nested_instruction of nested_instructions) {
                if ("parsed" in nested_instruction) {
                    if (nested_instruction.parsed.type == "transfer") {
                        //console.log(nested_instruction.parsed);
                        //console.log(nested_instruction.parsed.info.amount);
                        //authority
                        //destination
                        //source
                        swaps.push(nested_instruction.parsed.info);
                    }
                }
            }
        }
        let swap1 = swaps[0];
        let swap2 = swaps[1];

        let DECIMALS_SOL = 9;
        let DECIMALS_TOKEN = 6;

        const sender1 = new PublicKey(swap1.authority);
        if (sender1 == RAYDIUM_AUTHORITY_V4) {
            [swap1, swap2] = [swap2, swap1];
        }
        let transaction: DecodedSwap = {
            blockTime: tx.blockTime,
            //pool_address: pool.pool_account,
            pool_address: 'XXX',
            tx_signature: tx.transaction.signatures[0],
            type: 'buy',
            token_amount: '',
            sol_amount: '',
            account: swap1['authority'],
        };

        //if (swap2['source'] === SOL_TOKEN_ACCOUNT) {
        //TODO
        // let SOL_TOKEN_ACCOUNT = '';
        // if (swap2['source'] === SOL_TOKEN_ACCOUNT) {
        //     transaction.type = 'sell';
        //     transaction.token_amount = swap1['amount'];
        //     transaction.sol_amount = swap2['amount'];
        // } else {
        //     transaction.type = 'buy';
        //     transaction.sol_amount = swap1['amount'] / 10 ** DECIMALS_SOL;
        //     transaction.token_amount = swap2['amount'] / 10 ** DECIMALS_TOKEN;
        // }

        return transaction;

    }

    public async OldparseSwapNoPool(tx: any): Promise<DecodedSwap | false> {

        //??

        let swaps = [];
        let index = -1;

        const instructions = tx.transaction.message.instructions;

        let transfers_remaining = 0;
        let inner_instructions = tx.meta.innerInstructions;

        for (let inner_instruction of inner_instructions) {
            if (inner_instruction.index == index) transfers_remaining = 2;

            let nested_instructions = inner_instruction.instructions;
            for (let nested_instruction of nested_instructions) {
                console.log("nested_instruction " + nested_instruction);
                if ("parsed" in nested_instruction) {
                    if (transfers_remaining > 0 && nested_instruction.parsed.type == "transfer") {
                        transfers_remaining -= 1;
                        swaps.push(nested_instruction.parsed.info);
                    }
                } else {
                    console.log("no parsed? ");
                }

            }
        }
        if (swaps.length == 0) {
            console.log("swap length is zero")
            return false;
        }
        let swap1 = swaps[0];
        let swap2 = swaps[1];

        const sender1 = new PublicKey(swap1.authority);
        if (sender1 == RAYDIUM_AUTHORITY_V4) {
            [swap1, swap2] = [swap2, swap1];
        }

        let transaction: DecodedSwap = {
            blockTime: tx.blockTime,
            //pool_address: pool.pool_account,
            pool_address: 'XXX',
            tx_signature: tx.transaction.signatures[0],
            type: 'buy',
            token_amount: '',
            sol_amount: '',
            account: swap1['authority'],
        };

        //if (swap2['source'] === SOL_TOKEN_ACCOUNT) {
        transaction.type = 'unknown';
        transaction.token_amount = swap1['amount'];
        transaction.sol_amount = swap2['amount'];

        return transaction;
    }

    //public async parseSwap(tx: any): Promise<DecodedSwap | false> {
    public async parseSwapPool(tx: any, pool: Pool): Promise<DecodedSwap | false> {
        //??
        let SOL_TOKEN_ACCOUNT;
        if (pool.pair_details.pc_mint === 'So11111111111111111111111111111111111111112') {
            SOL_TOKEN_ACCOUNT = pool.pair_details.token_pc;
        } else {
            SOL_TOKEN_ACCOUNT = pool.pair_details.token_coin;
        }

        let swaps = [];
        let index = -1;

        const instructions = tx.transaction.message.instructions;
        for (let i = 0; i < instructions.length; i++) {
            if (this.isRaydiumSwap(instructions[i], new PublicKey(pool.pool_account))) {
                index = i;
            }
        }

        let transfers_remaining = 0;
        let inner_instructions = tx.meta.innerInstructions;

        for (let inner_instruction of inner_instructions) {
            if (inner_instruction.index == index) transfers_remaining = 2;

            let nested_instructions = inner_instruction.instructions;
            for (let nested_instruction of nested_instructions) {
                if ("parsed" in nested_instruction) {
                    if (transfers_remaining > 0 && nested_instruction.parsed.type == "transfer") {
                        transfers_remaining -= 1;
                        swaps.push(nested_instruction.parsed.info);
                    }
                }
                if (this.isRaydiumSwap(nested_instruction, new PublicKey(pool.pool_account))) {
                    transfers_remaining = 2;
                }
            }
        }

        if (swaps.length == 0) return false;
        let swap1 = swaps[0];
        let swap2 = swaps[1];

        const sender1 = new PublicKey(swap1.authority);
        if (sender1 == RAYDIUM_AUTHORITY_V4) {
            [swap1, swap2] = [swap2, swap1];
        }

        let transaction: DecodedSwap = {
            blockTime: tx.blockTime,
            pool_address: pool.pool_account,
            tx_signature: tx.transaction.signatures[0],
            type: 'buy',
            token_amount: '',
            sol_amount: '',
            account: swap1['authority'],
        };

        if (swap2['source'] === SOL_TOKEN_ACCOUNT) {
            transaction.type = 'sell';
            transaction.token_amount = swap1['amount'];
            transaction.sol_amount = swap2['amount'];
        } else {
            transaction.type = 'buy';
            transaction.sol_amount = swap1['amount'];
            transaction.token_amount = swap2['amount'];
        }
        return transaction;
    }
}


export default TxParser.getInstance();
