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


console.log(process.env.RPC_HOST);
const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });
console.log('subscribeToLogsPool');
async function subscribeToLogsPool() {
    //const subscriptionId = connection.onLogs(new PublicKey('Gk59kudJAps3tdPbSqPz5Udb9w7KGo4NeXrdBtEnhguG'), async (rlog) => {
    const subscriptionId = connection.onLogs(new PublicKey('2sfWUk554RrtLJA5mHhWFuNEwVVDW9eMEffNf7L8znRm'), async (rlog) => {
        //Log.log("log " + rlog.logs)
        let lastlog: string = rlog.logs[rlog.logs.length - 1];
        if (!(lastlog.includes("failed"))) {
            //Log.log("last log " + lastlog)
            for (let logEntry of rlog.logs) {
                if (logEntry.includes('ray_log')) {
                    Log.info(logEntry);
                    Log.info(rlog.signature);
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