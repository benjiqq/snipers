// stream logs

import 'dotenv/config';
import Log from "../lib/logger.js";
import { Connection, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { decodeRayLog } from './decode_ray.js'
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk';
export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;

const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
async function subscribeToLogs() {
    Log.info('subscribeToLogs');

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


    setInterval(() => {

        const currentDate = new Date();
        const t = currentDate.getTime() / 1000;
        const delta = (t - runTimestamp);

        Log.info('Seconds since start: ' + delta.toFixed(0));
        Log.info('count_init: ' + count_init);
        Log.info('count_deposit: ' + count_deposit);
        Log.info('count_withdraw: ' + count_withdraw);
        Log.info('swapInCount: ' + count_swapin);
        Log.info('swapOutCount: ' + count_swapout);
        Log.info('Events per sec: ' + (events / delta).toFixed(0));
        Log.info('events_failed ' + events_failed);
        Log.info('events_success ' + events_success);

    }, reportTime); // seconds


    //let poolid = '879F697iuDJGMevRkRcnW21fcXiAeLJK1ffsw2ATebce';
    //const subscriptionId = connection.onLogs(new PublicKey(poolid), async (rlog) => {
    const subscriptionId = connection.onLogs(new PublicKey(RAYDIUM_LIQUIDITY_PROGRAM_ID_V4), async (rlog) => {
        //Log.log("log " + rlog.logs)
        let lastlog: string = rlog.logs[rlog.logs.length - 1];
        events++;

        if ((lastlog.includes("events_failed"))) {
            events_failed++
        }
        else {
            events_success++;
            let found_ray = false;
            //Log.log("last log " + lastlog)
            //Log.info('>>> ' + rlog.signature);
            let infolog;
            for (let logEntry of rlog.logs) {
                //Log.info('> ' + logEntry)
                if (logEntry.includes('ray_log')) {
                    found_ray = true;
                    //Program log: ray_log: A5XjiBgAAAAAAAAAAAAAAAABAAAAAAAAAJXjiBgAAAAA0IdARbB/oAGt00cSBwAAAMBzq/Q6jgUA
                    //Log.info(logEntry);
                    let raylog = logEntry.split('ray_log: ')[1]
                    //Log.info(raylog);
                    infolog = decodeRayLog(raylog);
                    //Log.info(infolog);
                    //Log.info('type ' + infolog.log_type);
                    if (infolog.log_type == TYPE_INIT) {
                        count_init++;
                    }
                    if (infolog.log_type == TYPE_DEPOSIT) {
                        count_deposit++;
                    }
                    if (infolog.log_type == TYPE_WITHDRAW) {
                        count_withdraw++;
                    }
                    if (infolog.log_type == TYPE_SWAPIN) {
                        count_swapin++;
                    }
                    if (infolog.log_type == TYPE_SWAPOUT) {
                        count_swapout++;
                    }


                }
            }

            if (!found_ray) {
                // Log.info('????');
                // for (let logEntry of rlog.logs) {
                //     Log.info(logEntry)
                // }
            } else {
                //Log.info(rlog.signature);
                if (infolog.log_type == 0) {
                    Log.info('type ' + infolog.log_type);
                    Log.info(rlog.signature);
                }
                //Log.info('direction ' + infolog.direction);

                // if ((infolog.log_type != 4) && (infolog.log_type != 3)) {
                //     Log.info('...');
                //     Log.info(rlog.signature);
                //     Log.info(infolog.log_type);
                //     Log.info(infolog);
                //     Log.info(infolog.direction);
                //     Log.info('' + swapInCount);
                //     Log.info('' + swapOutCount);

                // }
            }
            //Log.info('-------------------------------- ');
            // Log.log("log " + rlog.logs)
            // Log.log("log " + rlog.signature)
        }

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