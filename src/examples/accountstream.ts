// stream logs

import 'dotenv/config';
import { logger } from "../lib/logger.js";
import { Connection, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { decodeRayLogSwap } from './decode_ray.js'
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk';
export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;

//testing
// const realtimeUser = io.metric({
//     name: 'Realtime user',
// })

// realtimeUser.set(42)

// const eventssec = io.meter({
//     name: 'req/sec',
//     id: 'app/requests/volume'
// })


function measureBytes(data: any) {
    const encoder = new TextEncoder();
    let totalBytes = 0;

    if (Array.isArray(data)) {
        data.forEach((element) => {
            // Convert non-string elements to strings
            const stringElement = typeof element === 'string' ? element : JSON.stringify(element);
            const bytes = encoder.encode(stringElement).length;
            totalBytes += bytes;
        });
    } else {
        console.error("Input is not an array");
    }

    return totalBytes;
}

const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });

async function subscribeToLogs() {
    logger.info('subscribeToLogs');

    // event types, 5 types
    // 4 - this is not a sell
    // 0 => LogType::Init,
    // 1 => LogType::Deposit,
    // 2 => LogType::Withdraw,
    // 3 => LogType::SwapBaseIn,
    // 4 => LogType::SwapBaseOut,
    const TYPE_INIT = 0;
    const TYPE_DEPOSIT = 1;
    const TYPE_WITHDRAW = 2;
    const TYPE_SWAPIN = 3;
    const TYPE_SWAPOUT = 4;

    let count_init = 0;
    let count_deposit = 0;
    let count_withdraw = 0;
    let count_swapin = 0;
    let count_swapout = 0;

    const reportTime = 10000;
    const waitTime = 30000;
    const currentDate = new Date();
    const runTimestamp = currentDate.getTime() / 1000;
    let events = 0;
    let events_success = 0;
    let events_failed = 0;
    //number of tx that succeeds
    let count_tx = 0;


    setInterval(() => {

        const currentDate = new Date();
        const t = currentDate.getTime() / 1000;
        const delta = (t - runTimestamp);

        let totalMB = totalDownloadedBytes / (1024 * 1024);

        logger.info('Seconds since start: ' + delta.toFixed(0));
        logger.info('count_init: ' + count_init);
        logger.info('count_deposit: ' + count_deposit);
        logger.info('count_withdraw: ' + count_withdraw);
        logger.info('swapInCount: ' + count_swapin);
        logger.info('swapOutCount: ' + count_swapout);
        logger.info('Events: ' + events);
        logger.info('Events per sec: ' + (events / delta).toFixed(0));
        logger.info('events_failed ' + events_failed);
        logger.info('events_success ' + events_success);
        let ratio = events_success / (events_success + events_failed);
        logger.info('success ratio ' + (100 * ratio).toFixed(1) + '%');
        logger.info('count_tx ' + count_tx);
        //logger.info('totalDownloadedBytes ' + totalDownloadedBytes);
        //logger.info('totalMB downloaded ' + totalMB.toFixed(0));
        //logger.info('download MB/sec ' + (totalMB / delta).toFixed(1));

    }, reportTime); // seconds


    //let poolid = '879F697iuDJGMevRkRcnW21fcXiAeLJK1ffsw2ATebce';
    //const subscriptionId = connection.onLogs(new PublicKey(poolid), async (rlog) => {
    let totalDownloadedBytes = 0;
    let bytes = 0;
    const subscriptionId = connection.onProgramAccountChange(new PublicKey(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4), async (rlog) => {
        events++;
        //eventssec.mark();


    });

}

(async () => {
    try {
        await subscribeToLogs();
        // Additional code that relies on subscribeToLogsPool() can go here.
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();