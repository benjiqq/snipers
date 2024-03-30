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
import { start } from 'repl';
import { ParsedTransaction } from '@solana/web3.js';


const connection = new Connection(`${process.env.RPC_HOST}`, { wsEndpoint: `${process.env.WSS_HOST}` });

async function fetchBlockTransactions(startSlot: any, endSlot: any) {
    for (let slot = startSlot; slot <= endSlot; slot++) {
        //const block = await connection.getBlock(slot, { transactionDetails: 'full', "maxSupportedTransactionVersion": 0 });
        const block = await connection.getParsedBlock(slot, { transactionDetails: 'full', "maxSupportedTransactionVersion": 0 });
        console.log('got block');
        if (block) {
            console.log('block.transactions ' + block.transactions.length);
            //let tx = block.transactions[0];
            let tx = block.transactions[0];
            //parsedTransaction?.meta?.innerInstructions

            //console.log(tx.transaction.message);
            console.log("innerInstructions " + tx?.meta?.innerInstructions?.length);

            // for (const tx of block.transactions.slice(0, 1)) {
            //     console.log(tx.transaction);

            // }

            //const instructions = tx.transaction.message.instructions;
            //console.log('tx ' + tx.transaction.accountKeys)
            //console.log('Transaction signatures:', tx.signatures);
            //console.log('Transaction accountKeys:', tx.accountKeys);

            // Filter transactions for Raydium program ID
            // const hasRaydiumTransaction = transaction.transaction.message.accountKeys.some(
            //     (pubKey) => pubKey.toString() === raydiumProgramId.toString()
            // );
            // if (hasRaydiumTransaction) {
            //     // Process Raydium transaction
            //     console.log(`Found Raydium transaction in slot ${slot}:`, transaction);
            // }
        }
    }
}

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

async function fetchTransactions() {
    try {
        const currentSlot = await connection.getSlot();
        const startSlot = currentSlot; // Adjust range based on your needs
        console.log('get tx ' + startSlot + ' ' + currentSlot);
        // Use await to wait for the fetchBlockTransactions to resolve
        const result = await fetchBlockTransactions(startSlot, currentSlot);
        console.log('result ' + result);
        // Process result here
    } catch (error) {
        console.log('error ' + error);
        // Handle any errors here
    }
}


// Function to process blocks
// async function processBlock(blockNumber: any) {
//     try {
//         const block = await connection.getBlock(blockNumber, { transactionDetails: 'full' });
//         for (let tx of block.transactions) {
//             // Filter for transactions involving Raydium's program ID
//             const isRaydiumTx = tx.transaction.message.instructions.some(instruction =>
//                 'programId' in instruction && new PublicKey(instruction.programId).equals(raydiumProgramId)
//             );

//             if (isRaydiumTx) {
//                 console.log(`Found Raydium transaction: ${tx.transaction.signatures[0]} in block ${blockNumber}`);
//                 // Add your processing logic here
//             }
//         }
//     } catch (error) {
//         console.error(`Error processing block ${blockNumber}:`, error);
//     }
// }

// // Subscribe to new block notifications
// connection.onSlotChange(async (slotInfo) => {
//     console.log(`New slot: ${slotInfo.slot}`);
//     await processBlock(slotInfo.slot);
// });

//Log.log(`fetchTransactions`);


//fetchTransactions();



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
