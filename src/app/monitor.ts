
import 'dotenv/config';

import { logger } from "../lib/logger";
import { Connection, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk';
import { rabbitMQPublisher } from './pub.js';
//import { rabbitMQSubscriber } from '../lib/pubsub/subscriber.js';
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { BN } from 'bn.js';
import { Idl } from "@coral-xyz/anchor";

export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;

export const RAY_FEE = new PublicKey(
    '7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5'
);

logger.info(`connect ${process.env.RPC_HOST} ${process.env.WSS_HOST}`)

import { PoolModel, PoolCreationTx } from '../examples/types.js'


/**
 * monitor pools
 */
class PoolMonitor {

    private static instance: PoolMonitor | null = null;
    private connection: Connection | null = null;
    private isInitiated: boolean = false;


    /**
     * Initializes a new instance of the PoolMonitor class.
     * Private constructor to enforce singleton pattern.
     */
    private constructor() {
        logger.info("init connection " + `${process.env.RPC_HOST}`);
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

            //logger.info('getBlockHeight:' + blockheight);
            logger.info('currentSlot:' + currentSlot);

        } catch (error) {
            logger.error('Failed to fetch the blockheight');
            console.log(error);
        }

        if (!this.isInitiated) {
            logger.info('Initiating Pool Monitor...');

            try {
                this.isInitiated = true;

            } catch (error) {
                console.log(error);
                logger.error('Failed to initiate logs subscription');
            }
        } else {
            logger.info('already Initiating');
        }

        // logger.info('Connecting to DB...');
        // await connectDb();
        // logger.info('DB connection successful.');
    }

    public async start() {

        try {
            this.isInitiated = true;

            this.subscribeToEvents();
            // this.test();
        } catch (error) {
            console.log(error);
            logger.error('Failed to initiate logs subscription');
        }

    }

    private subscribeToEvents() {
        if (!this.connection) return;
        logger.info('start subscribeToLogs');
    }

}

export default PoolMonitor.getInstance();