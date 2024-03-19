import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import PoolInfoGatherer from "./poolparser.js";
import { PoolCreationTx } from "@types";
import Log from "../lib/logger.js";
import { LiquidityPoolKeysV4 } from "@raydium-io/raydium-sdk";
import { connectDb, PoolModel, savePoolToDb } from './db/index.js';

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
 * Monitors a Solana blockchain pool, gather info about new pools created and perform initial analysis.
 */
class PoolMonitor {
    private static instance: PoolMonitor | null = null;
    private connection: Connection | null = null;
    private socketConnection: Connection | null = null;
    private raydiumPKey: PublicKey = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    private counter: number = 0;
    private poolsFound: number = 0;
    private signatures: string[] = [];
    private poolAddressHistorySet: PoolAddressHistorySet = new PoolAddressHistorySet(20);
    private isInitiated: boolean = false;
    private reportTimer: any;
    private logTimeout: any;

    /**
     * Initializes a new instance of the PoolMonitor class.
     * Private constructor to enforce singleton pattern.
     */
    private constructor() {
        this.connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
        // this.socketConnection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
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

        if (!this.isInitiated) {
            Log.info('Initiating Pool Monitor...');

            try {
                this.isInitiated = true;

            } catch (error) {
                console.log(error);
                Log.error('Failed to initiate logs subscription');
            }
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


        Log.info('Connecting to DB...');
        await connectDb();
        Log.info('DB connection successful.');
    }

    /**
     * Subscribes to logs for the Raydium pool contract and processes pool creation events.
     */
    private subscribeToLogs() {
        if (!this.connection) return;
        const ACCOUNT_TO_WATCH = this.raydiumPKey;
        Log.info('start subscribeToLogs');

        this.logTimeout = setTimeout(() => {
            if (this.counter === 0) {
                Log.info('No logs received within the expected timeframe.');
                return;
                // Take appropriate action here, such as retrying or handling the error
            }
        }, 10000); // seconds

        const subscriptionId = this.connection.onLogs(ACCOUNT_TO_WATCH, async (log) => {
            clearTimeout(this.logTimeout);

            if (this.counter === 0) {
                Log.info('first log received');
                // Start a timer to report every second after the first log is received.
                this.reportTimer = setInterval(() => {
                    Log.info('Signature count: ' + this.counter);
                    Log.info('Pools Created count: ' + this.poolsFound);
                }, 5000); // second
            }
            this.counter++;

            // Check if the transaction represents a pool creation event
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


        }, "finalized");
        Log.log('Starting web socket, subscription ID: ' + subscriptionId);
    }

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
