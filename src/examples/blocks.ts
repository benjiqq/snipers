
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

Log.log(`decode example`);

const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });

async function fetchSlotTimestamp(slot: number): Promise<void> {
    try {
        const timestamp = await connection.getBlockTime(slot);
        console.log(`Timestamp for slot ${slot}:`, timestamp ? new Date(timestamp * 1000).toISOString() : 'Timestamp not available');
    } catch (error) {
        console.error(`Error fetching timestamp for slot ${slot}:`, error);
    }
}

function subscribeToSlotChanges(): number {
    const subscriptionId = connection.onSlotChange(async (slotInfo) => {
        console.log('New slot change detected:', slotInfo);
        await fetchSlotTimestamp(slotInfo.slot);
    });

    return subscriptionId;
}

// Call the function to start the subscription
const slotSubscriptionId = subscribeToSlotChanges();
console.log('Slot subscription ID:', slotSubscriptionId);

// Initialize a connection to the Solana cluster
//const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// async function fetchBlockDetails(blockId) {
//     try {
//         const block = await connection.getBlock(blockId, { transactionDetails: "full" });
//         console.log('Block Details:', block);
//         // Process the block data as needed
//     } catch (error) {
//         console.error('Error fetching block details:', error);
//     }
// }

// // Example usage with a specific block ID
// const blockId = /* Your block ID here */;
// fetchBlockDetails(blockId);
