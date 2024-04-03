import 'dotenv/config';
import Monitor from '../app/monitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import Log from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection, PublicKey } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk';
export const RAYDIUM_LIQUIDITY_PROGRAM_ID_V4 = MAINNET_PROGRAM_ID.AmmV4;

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session

const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });

async function main(connection: any, programAddress: any) {
    console.log("Monitoring logs for program:", programAddress.toString());
    let logcounter = 0;
    let initialize2Counter = 0;
    let last_initialize2Counter = 0;
    let last_logcounter = 0;
    let lastreport = Date.now();

    var logTimeout = setTimeout(() => {
        if (logcounter === 0) {
            Log.info('No logs received within the expected timeframe.');
            return;
            // Take appropriate action here, such as retrying or handling the error
        }
    }, 30000); // seconds

    var endTimeout = setTimeout(() => {

    }, 60 * 1000);

    const reportTime = 5000;

    connection.onLogs(
        new PublicKey(programAddress),
        ({ logs, err, signature }: { logs: string[] | null; err: Error | null; signature: string }) => {
            if (logcounter == 0) {
                setInterval(() => {
                    Log.info('Log count: ' + logcounter);
                    Log.info('initialize2Counter count: ' + initialize2Counter);
                    let diff = logcounter - last_logcounter;
                    Log.info('diff ' + diff);
                    last_logcounter = logcounter;

                    //Log.info('Signature count with errors: ' + this.logcounter_error);

                }, reportTime);
            }

            //console.log('signature ' + signature);
            //console.log(logs);
            if (err) return;

            //const isSwap = TxParser.isSwap(log.logs);

            // if (logs && logs.some((log) => log.includes("initialize2"))) {
            //     console.log("Signature for 'initialize2':", signature);
            //     //fetchRaydiumAccounts(signature, connection);
            //     console.log("Number of 'initialize2' logs encountered:", initialize2Counter); // Log the counter
            //     initialize2Counter++;
            // }
            logcounter++;
            //console.log('counter ' + logcounter);
        },
        "finalized"
    );
}

main(connection, RAYDIUM_LIQUIDITY_PROGRAM_ID_V4).catch(console.error);