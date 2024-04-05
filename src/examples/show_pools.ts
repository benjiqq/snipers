
import 'dotenv/config';
import PoolMonitor from '../app/oldmonitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import { logger } from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';
import { getModels } from '../app/db/models/index';

logger.info(`DB example`);

async function showPools() {

    await PoolMonitor.init();

    const models: any = await getModels(); // Ensure all models are loaded
    const Pair = models['Pair']; // Access the Pair model

    try {
        const allPairs = await Pair.find({}); // Query all documents
        console.log(allPairs);
        return allPairs;
    } catch (error) {
        console.error("Failed to fetch pairs:", error);
    }
}


showPools().then(result => {

}).catch(error => {
    // Handle any errors
});