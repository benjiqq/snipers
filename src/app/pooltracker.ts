
// stream from ray fee to get pools

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


const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
let coder: RaydiumAmmCoder | null = null;
coder = new RaydiumAmmCoder(IDL as Idl);

function parseBnValues(obj: any): any {
    const parsedObj: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            let value = obj[key];

            if (value instanceof PublicKey) {
                // PublicKey -> base58 string
                parsedObj[key] = value.toBase58();
            } else if (value instanceof BN) {
                // BN -> string
                parsedObj[key] = value.toString();
            } else if (typeof value === 'object' && value !== null) {
                // Recursively parse object properties
                parsedObj[key] = parseBnValues(value);
            } else {
                parsedObj[key] = value;
            }
        }
    }
    return parsedObj;
}

async function getPoolInfo(address: string): Promise<PoolModel | null> {
    logger.info('getPoolInfo ' + address);
    try {
        const acc = await connection!.getAccountInfo(new PublicKey(address));
        if (acc) {
            //logger.error('acc ' + acc);
            //logger.error('acc data: ' + acc.data);
            const result = coder!.accounts.decode('ammInfo', acc.data);
            if (result.lpAmount.toNumber() === 0) return null;
            const parsed = parseBnValues(result);
            parsed.poolAccount = address;
            return parsed;
        } else {
            logger.error('Failed to get pool info. no acc');
            return null;
        }
    } catch (error) {
        logger.error('error getPoolInfo ' + error);
        return null;
    }
}

async function getPoolTransaction(signature: string): Promise<PoolCreationTx | null> {
    try {
        if (!connection) return null;
        const tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
        const accounts = tx?.transaction?.message?.accountKeys;
        if (accounts) {
            // logger.info('pool create tx accounts > ');
            // logger.info(accounts[0].pubkey.toBase58());
            // logger.info(accounts[1].pubkey.toBase58());
            // logger.info(accounts[2].pubkey.toBase58());
            return { poolAddress: accounts[2].pubkey.toBase58(), tx: tx };
        } else {
            return null;
        }
    } catch (error) {
        logger.error('Failed to get pool transaction');
        return null;
    }
}

async function subscribeToLPools() {
    logger.info('track pools');

    try {
        await rabbitMQPublisher.init();

        logger.info('RabbitMQ connection established');
    } catch (error) {
        console.log(error);
        logger.error('Could not initialize RabbitMQ');
    }

    const reportTime = 10000;
    const currentDate = new Date();
    const runTimestamp = currentDate.getTime() / 1000;
    let count_open = 0;

    setInterval(() => {

        const currentDate = new Date();
        const t = currentDate.getTime() / 1000;
        const delta = (t - runTimestamp);

        logger.info('Seconds since start: ' + delta.toFixed(0));
        logger.info('count_open ' + count_open);

    }, reportTime); // seconds

    const subscriptionId = connection.onLogs(new PublicKey(RAY_FEE), async (rlog) => {

        //let lastlog: string = rlog.logs[rlog.logs.length - 1];
        logger.info('sig found ' + rlog.signature);
        count_open++;

        //getTokenInfo
        logger.info('get info');
        let tx = await getPoolTransaction(rlog.signature);

        if (tx != null) {
            logger.info('tx ' + tx);
            let bt = tx.tx.blockTime;
            logger.info('tx blocktime: ' + bt);
            if (bt != null) {
                const date = new Date(bt * 1000);
                const utcDateTimeString = date.toUTCString();
                console.log(utcDateTimeString);

                const currentDate = new Date();
                const t = currentDate.getTime() / 1000;
                const delta_seconds = (t - bt);
                logger.info('delta_seconds ' + delta_seconds);
            }

            logger.info('tx poolAddress ' + tx.poolAddress);

            //const key = updatedAccountInfo.accountId.toString();
            //const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);

            // const tx = txData.tx;
            // const poolInfo = await this.getPoolInfo(txData.poolAddress);

            const poolInfo = await getPoolInfo(tx.poolAddress);
            logger.info('pool info ' + poolInfo);
        } else {
            logger.info('tx is null');
        }

        await rabbitMQPublisher.publish('pool', JSON.stringify({
            blockTime: Date.now(),
            pool_address: tx?.poolAddress,
            tx_signature: rlog.signature
        }));

    });

    logger.info('subscribed to new pools ' + subscriptionId);

}

(async () => {
    logger.info('start');
    try {
        await subscribeToLPools();
        //await testinfo();
        // Additional code that relies on subscribeToLogsPool() can go here.
    } catch (error) {
        logger.error('An error occurred:', error);
    }
})();
logger.info('end');