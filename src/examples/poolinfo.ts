import 'dotenv/config';
import PoolMonitor from '../app/monitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import Log from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';
import { PublicKey } from '@solana/web3.js';

const RAYDIUM_AUTHORITY_V4 = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1");
const RAYDIUM_LIQUIDITY_POOL_V4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

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

async function savePoolInfoToFile(poolInfo: any, filePath: string): Promise<void> {
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
    let tx = "5kACo9Fw1CErNaJNKCr8K64G7CyoP4RZzAeMNwqT81V8EGjpKyamCE13QkXqD1Ct1256kv7k31xjgtQFo5StShHF";

}

async function fetchDataInfo() {
    let poolAddress = '5EgCcjkuE42YyTZY4QG8qTioUwNh6agTvJuNRyEqcqV1';
    const poolInfo = await PoolInfoGatherer.getPoolInfo(poolAddress);
    Log.info("poolInfo " + poolInfo);
    const filePath = './poolInfo_' + poolAddress + '.json';
    savePoolInfoToFile(poolInfo, filePath);

}
async function fetchDataPool() {

    let address = "59p8WydnSZtVovamaSLfcUJRMaA7xoj93kxbddV8yi7tquqBUzKJQjkt9E";
    let sig: string = "5ntGBmc7BkTQZ9NHni81MKDckcyDp585ptFw27CAwQtqx2bt5P8LtTUXAEtZdKwK5JxzDntH4RsorttYeRT8mhs5";
    let coder: RaydiumAmmCoder = new RaydiumAmmCoder(IDL as Idl);;

    await PoolMonitor.init();

    try {
        const poolCreationTx: any = await withTimeout(PoolMonitor.getPoolTransaction(sig), 10000);
        const poolInfo = await PoolInfoGatherer.poolInfoGatherer(poolCreationTx);
        Log.info("poolInfo " + poolInfo);
        printAllInfo(poolInfo, 'poolInfo');

        const filePath = './poolInfo_' + poolInfo?.poolObj.pool_account + '.json';
        savePoolInfoToFile(poolInfo, filePath);
        return;


    } catch (error) {
        console.error('Failed to fetch data:', error);
        throw error;
    }
}

fetchDataInfo();

// fetchDataPool().then(result => {

// }).catch(error => {
//     // Handle any errors
// });
