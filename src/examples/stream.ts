const { Connection, PublicKey } = require('@solana/web3.js');

// Initialize connection (Replace 'mainnet-beta' with your cluster of choice)
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Raydium program ID
const raydiumProgramId = new PublicKey('RAYDIUM_PROGRAM_ID_HERE');

// Function to process blocks
// async function processBlock(blockNumber) {
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
