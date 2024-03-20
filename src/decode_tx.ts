import 'dotenv/config';
import Monitor from './app/monitor.js';
import PoolInfoGatherer from './app/parser_pool.js';
import Log from "./lib/logger.js";
import { RaydiumAmmCoder } from './raydium_idl/coder/index.js';
import { Connection } from '@solana/web3.js';
const IDL = require('./raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';


Log.log(`decode example`);

function printAllInfo(obj: any, parentKey = '') {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
            const path = parentKey ? `${parentKey}.${key}` : key;
            printAllInfo(obj[key], path);
        });
    } else {
        console.log(`${parentKey}: ${obj}`);
    }
}

async function saveInfoToFile(poolInfo: any, filePath: string): Promise<void> {
    try {
        // Convert the poolInfo object to a JSON string with indentation for readability
        const data = JSON.stringify(poolInfo, null, 4);

        // Write the JSON string to a file
        await writeFile(filePath, data, 'utf8');

        console.log('Pool information has been saved to', filePath);
    } catch (error) {
        console.error('Failed to save pool information to file:', error);
    }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
}


async function fetchDataTx() {
    let txid = "5uUoxGk7RhCvhhHBpHcKDrNDfw883eiZkmG8t63Ls8dEsn4bEV7qSJgiyNr6oUGW1yL1d1Y9CzSYBM1UWGBquV2z";

    const tx = await Monitor.getTransaction(txid);
    Log.info('tx ' + tx);
    printAllInfo(tx, 'tx');

    //saveInfoToFile
    //const open_pools = await axios.get(`${process.env.CORE_API_URL}/pairs/filter/?status=position_open`, { headers: axiosHeaders });

}


fetchDataTx().then(result => {

}).catch(error => {
    // Handle any errors
});
