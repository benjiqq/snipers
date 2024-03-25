import 'dotenv/config';
import Monitor from '../app/monitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import Log from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';
import TxParser from '../app/parser_tx.js'
import { readFile } from 'fs';
import { promises as fs } from 'fs';


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

async function saveInfoToFile(txInfo: any, filePath: string): Promise<void> {
    try {
        // Convert the poolInfo object to a JSON string with indentation for readability
        const data = JSON.stringify(txInfo, null, 4);

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

async function readJsonFile(filePath: string): Promise<any> {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading file:', error);
        throw error; // or handle error as needed
    }
}

async function parseTx() {
    let txid = "rawtx_5uUoxGk7RhCvhhHBpHcKDrNDfw883eiZkmG8t63Ls8dEsn4bEV7qSJgiyNr6oUGW1yL1d1Y9CzSYBM1UWGBquV2z";
    let file = txid + ".json";
    let tx = await readJsonFile(file);
    console.log(tx.meta.innerInstructions);
    let swaps = [];
    let inner_instructions: any = tx?.meta?.innerInstructions;
    //21,258.008700523 JONK for 0.111856675
    for (let inner_instruction of inner_instructions) {
        let nested_instructions = inner_instruction.instructions;
        //console.log(nested_instructions);
        for (let nested_instruction of nested_instructions) {
            if ("parsed" in nested_instruction) {
                if (nested_instruction.parsed.type == "transfer") {
                    console.log(nested_instruction.parsed);
                    console.log(nested_instruction.parsed.info.amount);
                    swaps.push(nested_instruction.parsed.info);
                }
            }
        }
    }
    swaps.forEach((swap, index) => {
        console.log(`swap ${index}: ${swap}`);
    });
    process.exit()
}
async function fetchDataTx() {
    let txid = "5uUoxGk7RhCvhhHBpHcKDrNDfw883eiZkmG8t63Ls8dEsn4bEV7qSJgiyNr6oUGW1yL1d1Y9CzSYBM1UWGBquV2z";
    Log.info('get tx ' + txid);

    const tx = await Monitor.getTransaction(txid);
    console.log("innerInstructions " + tx?.meta?.innerInstructions?.length);

    let inner_instructions: any = tx?.meta?.innerInstructions;

    let swaps = [];

    for (let inner_instruction of inner_instructions) {
        //if (inner_instruction.index == index) transfers_remaining = 2;

        let nested_instructions = inner_instruction.instructions;
        console.log(nested_instructions);
        for (let nested_instruction of nested_instructions) {
            if ("parsed" in nested_instruction) {
                if (nested_instruction.parsed.type == "transfer") {
                    swaps.push(nested_instruction.parsed.info);
                }
            }
        }
    }

    for (let swap in swaps) {
        console.log(swap);
    }
    // Log.info('tx ' + tx);
    // //printAllInfo(tx, 'tx');

    // let parsed = TxParser.parseSwapNoPool(tx);
    // Log.info('parsed ' + parsed);

    //saveInfoToFile
    //saveInfoToFile(tx, 'rawtx_' + txid + '.json');
    //const open_pools = await axios.get(`${process.env.CORE_API_URL}/pairs/filter/?status=position_open`, { headers: axiosHeaders });

}


// fetchDataTx().then(result => {

// }).catch(error => {
//     // Handle any errors
// });

parseTx();