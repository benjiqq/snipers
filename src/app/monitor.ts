import { Connection, ParsedTransactionMeta, ParsedTransactionWithMeta, PublicKey, clusterApiUrl } from '@solana/web3.js';
import PoolInfoGatherer from "./parser_pool.js";
import TxParser from "./parser_tx.js";
import { PoolCreationTx } from "@types";
import Log from "../lib/logger.js";
import { LiquidityPoolKeysV4 } from "@raydium-io/raydium-sdk";
import { connectDb, savePoolToDb } from './db/index.js';
import {
    Liquidity,
    LiquidityPoolKeys,
    Market,
    TokenAccount,
    SPL_ACCOUNT_LAYOUT,
    publicKey,
    struct,
    MAINNET_PROGRAM_ID,
    LiquidityStateV4,
} from '@raydium-io/raydium-sdk';
export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;

/**
 * Separate class to keep track of pool addresses that have already been processed.
 */
class PoolAddressHistorySet {
    public items: Set<string>;
    private maxSize: number;

    constructor(maxSize: number) {
        this.items = new Set<string>();
        this.maxSize = maxSize;
    }

    /**
     * Adds a new item to the start of the set, ensuring it doesn't exceed the maximum size.
     * @param item - The pool address to be added.
     */
    public addToStart(item: string): void {
        this.items.add(item);

        // Ensure the set doesn't exceed the maximum size
        if (this.items.size > this.maxSize) {
            const iterator = this.items.values();
            const lastItem = iterator.next().value;
            this.items.delete(lastItem);
        }
    }
}

/**
 * Monitors a Solana blockchain pool, gather info about new pools created
 */
class PoolMonitor {
    private static instance: PoolMonitor | null = null;
    private connection: Connection | null = null;
    private logcounter: number = 0;
    private logcounter_error: number = 0;
    private poolsFound: number = 0;
    private signatures: string[] = [];
    private poolAddressHistorySet: PoolAddressHistorySet = new PoolAddressHistorySet(20);
    private isInitiated: boolean = false;
    private reportTimer: any;
    private logTimeout: any;
    private startTime = Math.floor(new Date().getTime() / 1000);

    private signBatchSize: number = 200;
    private swapSigList: string[] = [];

    /**
     * Initializes a new instance of the PoolMonitor class.
     * Private constructor to enforce singleton pattern.
     */
    private constructor() {
        Log.info("init connection " + `${process.env.RPC_HOST}`);
        this.connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
    }

    /**
    * Gets the singleton instance of the PoolMonitor class.
    * @returns The singleton instance.
    */
    public static getInstance(): PoolMonitor {
        if (this.instance === null) {
            this.instance = new PoolMonitor();
        }
        return this.instance;
    }

    /**
     * Initializes the PoolMonitor by subscribing to logs.
     */
    public async init() {
        if (!this.connection) return;

        try {
            // Optionally, to get more details about the block, you can use the getBlock method
            //const blockheight = await this.connection.getBlockHeight();
            const currentSlot = await this.connection.getSlot();

            //Log.info('getBlockHeight:' + blockheight);
            Log.info('currentSlot:' + currentSlot);

        } catch (error) {
            Log.error('Failed to fetch the blockheight');
            console.log(error);
        }

        if (!this.isInitiated) {
            Log.info('Initiating Pool Monitor...');

            try {
                this.isInitiated = true;

            } catch (error) {
                console.log(error);
                Log.error('Failed to initiate logs subscription');
            }
        } else {
            Log.info('already Initiating');
        }

        Log.info('Connecting to DB...');
        await connectDb();
        Log.info('DB connection successful.');
    }

    public async start() {

        try {
            this.isInitiated = true;

            this.subscribeToLogs();
            // this.test();
        } catch (error) {
            console.log(error);
            Log.error('Failed to initiate logs subscription');
        }

    }

    private async handlePool(log: any) {
        const isPoolCreation = this.isPoolCreation(log.logs);
        if (isPoolCreation) {
            Log.info('Possible pool creation detected in signature: ' + log.signature);

            // First check if the signature is already in the list of signatures
            if (!this.signatures.includes(log.signature)) {

                const poolCreationTx = await this.getPoolTransaction(log.signature);
                if (poolCreationTx) {
                    this.poolsFound++;
                    Log.log('Pool address found: ' + poolCreationTx.poolAddress);
                    const message = {
                        poolAddress: poolCreationTx.poolAddress,
                        time: poolCreationTx.tx.blockTime,
                        signature: log.signature
                    };

                    // If the pool address is already in the history set, don't start parsing
                    if (this.poolAddressHistorySet.items.has(JSON.stringify(message))) {
                        Log.info('Pool address already in history set.');
                        return;
                    }
                    this.poolAddressHistorySet.addToStart(JSON.stringify(message));
                    this.signatures.push(log.signature);
                    if (this.signatures.length > 100) {
                        this.signatures.shift();
                    }

                    //Parse this pool
                    this.storePoolInformation(poolCreationTx);
                } else {
                    Log.error('Pool address could not be retrieved!');
                }
            } else {
                Log.info('Pool creation already exists in signatures list');
            }
        }
    }

    /**
     * Subscribes to logs for the Raydium pool contract and processes pool creation events.
     */
    private subscribeToLogs() {
        if (!this.connection) return;
        Log.info('start subscribeToLogs');

        this.logTimeout = setTimeout(() => {
            if (this.logcounter === 0) {
                Log.info('No logs received within the expected timeframe.');
                return;
                // Take appropriate action here, such as retrying or handling the error
            }
        }, 30000); // seconds

        const reportTime = 1000;

        //subscribe to all logs from raydium
        const ACCOUNT_TO_WATCH = new PublicKey(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4);
        const subscriptionId = this.connection.onLogs(ACCOUNT_TO_WATCH, async (rlog) => {
            clearTimeout(this.logTimeout);

            if (this.logcounter === 0) {
                Log.info('first log received');
                // Start a timer to report every second after the first log is received.
                this.reportTimer = setInterval(() => {
                    Log.info('Signature count: ' + this.logcounter);
                    Log.info('Signature count with errors: ' + this.logcounter_error);
                    Log.info('Pools Created count: ' + this.poolsFound);
                    // let p = this.logcounter_error / this.logcounter;
                    // Log.info('% errors: ' + p);

                    const currentDate = new Date();
                    const t = currentDate.getTime() / 1000;
                    const delta = (t - this.startTime);

                    Log.info('Seconds since start: ' + delta.toFixed(0));
                    Log.info('Total event count: ' + this.logcounter);
                    Log.info('Events per sec: ' + (this.logcounter / delta).toFixed(0));

                    Log.info('Swaps per sec: ' + (this.swapSigList.length / delta).toFixed(0));
                    Log.info('Swaps error per sec: ' + (this.logcounter_error / delta).toFixed(0));

                }, reportTime); // seconds
            }
            this.logcounter++;

            // ignore logs from this special type
            if (rlog.signature != '1111111111111111111111111111111111111111111111111111111111111111') {
                // first find if tx was successful or not since most are failed
                let lastlog: string = rlog.logs[rlog.logs.length - 1];
                if (!(lastlog.includes("failed"))) {
                    const isSwap = this.isSwap(rlog.logs);
                    if (isSwap) {
                        this.swapSigList.push(rlog.signature);

                        // Log.info('--------------------------------------------')
                        // Log.info(rlog.signature);
                        // Log.info('#logs ' + rlog.logs.length);
                        // Log.info('--------------------------------------------')

                        // for (let logEntry of rlog.logs) {
                        //     Log.info(logEntry);
                        // }
                    }


                } else {
                    this.logcounter_error++;
                }
            }


            // if (log.err == null) {

            //     //handle swap
            //     const isSwap = TxParser.isSwap(log.logs);
            //     if (isSwap) {
            //         //Log.log('Swap detected', poolData.pool_account);
            //         Log.log('Swap detected ' + log.signature);
            //         //need throttling here
            //         if (this.connection) {
            //             try {
            //                 const tx = await this.connection.getParsedTransaction(log.signature, {
            //                     maxSupportedTransactionVersion: 0,
            //                 });
            //                 Log.log('Swap detected ' + tx);
            //             } catch (error) {

            //             }
            //         }

            //         //     //this.analyzeSwap(log.)
            //         //     // const tx = await this.connection.getParsedTransaction(log.logs, {
            //         //     //     maxSupportedTransactionVersion: 0,
            //         //     // });
            //         //     //const swap = await TxParser.parseSwap(tx, poolData);
            //         // }
            //         //Log.info('log without error ' + log);

            //         // Check if the transaction represents a pool creation event
            //         this.handlePool(log);

            //     } else {
            //         //Log.info('log with error ' + log.signature.toString());
            //         this.logcounter_error++;
            //     }




        }, "finalized");
        Log.log('Starting web socket, subscription ID: ' + subscriptionId);
    }

    public async analyzeSwap(signature: string) {

    }

    private isSwap(logMessages: string[]): boolean {
        if (!this.connection) return false;
        const swapIndicator = "Program log: Instruction: Transfer";
        for (const logMessage of logMessages) {
            if (logMessage.includes(swapIndicator)) {
                return true;
            }
        }
        return false;
    }

    // private async analyzeSwap(signature: string, poolData: Pool) {
    //     if (!this.connection) return;

    //     try {
    //         const tx = await this.connection.getParsedTransaction(signature, {
    //             maxSupportedTransactionVersion: 0,
    //         });

    //         if (!tx) {
    //             Log.error('Could not get transaction details for ' + signature);
    //             return;
    //         }

    //         try {
    //             const swap = await TxParser.parseSwap(tx, poolData);
    //             if (swap) {
    //                 // await rabbitMQPublisher.publish('swap-feed', JSON.stringify(swap));
    //                 // if (!this.addressesWithSwaps.includes(swap.pool_address)) {
    //                 //     this.addressesWithSwaps.push(swap.pool_address);
    //                 //     await this.saveSwapToDb(swap);
    //                 //     Log.log('Swap saved to DB', poolData.pool_account);
    //                 //     if (this.addressesWithSwaps.length > 1000) {
    //                 //         this.addressesWithSwaps.shift();
    //                 //     }
    //                 // }
    //             } else {
    //                 Log.info('Not a Raydium swap');
    //             }
    //             return swap;
    //         } catch (error) {
    //             Log.error('Could not get parse the swap for ' + signature);
    //             return;
    //         }
    //     } catch (error) {
    //         console.log(error);
    //         Log.error('Could not get transaction details for ' + signature);
    //         return;
    //     }
    // }



    /**
     * Checks if a transaction represents a pool creation event based on log messages.
     * @param logMessages - The array of log messages from the transaction.
     * @returns True if the transaction represents a pool creation, false otherwise.
     */
    private isPoolCreation(logMessages: string[]): boolean {
        if (!this.connection) return false;
        const poolCreationIndicators = [
            "Program log: initialize2: InitializeInstruction2",
            "Program log: Instruction: InitializeMint",
            "Program log: Initialize the associated token account",
            "Program log: Instruction: MintTo"
        ];

        // Create a map to track the presence of each indicator
        const indicatorsPresence = new Map(poolCreationIndicators.map(indicator => [indicator, false]));

        // Check log messages and mark indicators as found
        for (const logMessage of logMessages) {
            indicatorsPresence.forEach((found, indicator) => {
                if (logMessage.includes(indicator)) {
                    indicatorsPresence.set(indicator, true);
                }
            });
        }
        // Check if every indicators were found
        return Array.from(indicatorsPresence.values()).every(found => found);
    }

    public async getTransaction(signature: string): Promise<ParsedTransactionWithMeta | null> {
        if (!this.connection) return null;
        const tx = await this.connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        return tx;
    }

    /**
     * Retrieves the address of the pool by parsing a transaction.
     * @param signature - The signature of the transaction.
     * @returns An object containing the pool account and timestamp, or null if not found.
     */
    public async getPoolTransaction(signature: string): Promise<PoolCreationTx | null> {
        try {
            if (!this.connection) return null;
            const tx = await this.connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0,
            });
            const accounts = tx?.transaction?.message?.accountKeys;
            if (accounts) {
                return { poolAddress: accounts[2].pubkey.toBase58(), tx: tx };
            } else {
                return null;
            }
        } catch (error) {
            Log.error('Failed to get pool transaction');
            return null;
        }
    }

    public getFirstSwap = async (pool_account: String) => {
        if (!this.connection) return;
        try {
            const signatures = await this.connection.getSignaturesForAddress(new PublicKey(pool_account), { limit: 1000 });
            const succeeded: any = signatures?.filter((tx: any) => !tx.err);
            succeeded.sort((a: any, b: any) => a.blockTime - b.blockTime);
            console.log('succeeded.length ' + succeeded.length);
            for (let i = 0; i < succeeded.length; i++) {
                const tx = await this.connection!.getParsedTransaction(succeeded[i].signature, {
                    maxSupportedTransactionVersion: 0,
                });
                if (tx) {
                    return tx;
                    //const swap = await this.parseSwap(tx, poolData);
                    // if (swap) {
                    //     return swap;
                    // }
                }
            }
            return false;
        } catch (error) {
            //Log.error('Could not get first swap for ' + poolData.pool_account);
        }
    };

    /**
     * Parse the pool's information and perform initial analysis.
     * @param msg - info containing the pool address, timestamp and signature.
     */
    public async storePoolInformation(tx: PoolCreationTx) {

        // First get pool information
        const poolInfo = await PoolInfoGatherer.poolInfoGatherer(tx);

        if (!poolInfo) {
            Log.error('Pool info could not be parsed!');
            return;
        } else {
            Log.info('PoolInfo. Token ' + poolInfo.poolObj.token.address)
        }

        Log.log('Pool info parsed successfully');

        let poolData = { ...poolInfo.poolObj };
        //let poolAccount = poolData.pool_account;

        savePoolToDb(poolData);
        return;
    }

}

/**
 * Exports the singleton instance
 */
export default PoolMonitor.getInstance();
