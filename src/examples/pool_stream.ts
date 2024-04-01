// stream logs from a specific pool

import 'dotenv/config';
import Monitor from '../app/monitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import Log from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';
import TxParser from '../app/parser_tx.js'
import { start } from 'repl';
import { ParsedTransaction } from '@solana/web3.js';
import { decodeRayLog } from './decode_ray'

console.log(process.env.RPC_HOST);
const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
console.log('subscribeToLogsPool');
async function subscribeToLogsPool() {

    const subscriptionId = connection.onLogs(new PublicKey('879F697iuDJGMevRkRcnW21fcXiAeLJK1ffsw2ATebce'), async (rlog) => {
        //Log.log("log " + rlog.logs)
        let lastlog: string = rlog.logs[rlog.logs.length - 1];

        if (!(lastlog.includes("failed"))) {
            let found_ray = false;
            //Log.log("last log " + lastlog)
            for (let logEntry of rlog.logs) {
                //Log.info('> ' + logEntry)
                if (logEntry.includes('ray_log')) {
                    found_ray = true;
                    //Program log: ray_log: A5XjiBgAAAAAAAAAAAAAAAABAAAAAAAAAJXjiBgAAAAA0IdARbB/oAGt00cSBwAAAMBzq/Q6jgUA
                    //Log.info(logEntry);
                    let raylog = logEntry.split('ray_log: ')[1]
                    //Log.info(raylog);
                    let swapInfo = decodeRayLog(raylog);
                    //Log.info(swapInfo);
                    Log.info('type ' + swapInfo.log_type);
                    Log.info(swapInfo.direction);
                    Log.info(rlog.signature);
                }
            }

            if (!found_ray) {
                Log.info('????');
                for (let logEntry of rlog.logs) {
                    Log.info(logEntry)
                }
            }
            // Log.log("log " + rlog.logs)
            // Log.log("log " + rlog.signature)
        }

    });

}

(async () => {
    try {
        await subscribeToLogsPool();
        // Additional code that relies on subscribeToLogsPool() can go here.
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();