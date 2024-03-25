import Log from "../../lib/logger.js";

const mongoose = require('mongoose');

import { getModels } from '../db/models/index.js'

// Declare Pair here to ensure it's available in the module scope
let Pair: any;
let Swap: any;


const connectDb = async (): Promise<void> => {
    try {
        mongoose.set('strictQuery', true);

        Log.info('Connecting to MongoDB ');

        await mongoose.connect(`${process.env.DATABASE_URL}`, {
            // useNewUrlParser: true,
            // useCreateIndex: true,
            // useUnifiedTopology: true,
        });
        Log.info('Connected to the database successfully ');
        //Log.info('DB ' + process.env.DATABASE_URL);
    } catch (error) {
        Log.error('Failed to connect to the database:' + error);
        throw error; // Ensure to throw the error to be caught by the caller
    }
}

/**
    * Adds pool information to DB
    * @param {any} poolData - The pool information.
    */
const savePoolToDb = async (poolData: any): Promise<void> => {
    if (!Pair) {
        throw new Error('Pair model is not loaded yet');
    }
    try {
        const pool = new Pair(poolData);
        await pool.save();
        Log.info('Pool data saved to the database successfully');
    } catch (error) {
        Log.error('Error:' + error);
    }
}

// const saveTxToDb = async (poolData: any): Promise<void> => {
//     if (!Swap) {
//         throw new Error('Pair model is not loaded yet');
//     }
//     try {
//         const pool = new Pair(poolData);
//         await pool.save();
//         Log.info('Pool data saved to the database successfully');
//     } catch (error) {
//         Log.error('Error:' + error);
//     }
// }


// Define an async function to load models and perform initial setup
async function init() {
    const models: any = await getModels(); // Ensure all models are loaded
    Pair = models['Pair']; // Access the Pair model

    await connectDb(); // Ensure DB is connected before proceeding
    // Any other initialization steps can go here
}

// Call the init function and handle any errors
init().catch(error => {
    Log.error('Initialization error:', error);
});

export { connectDb, Pair, savePoolToDb };



// const poolSchema = new mongoose.Schema({
//     pool_account: String,
//     // Add other fields according to the structure of poolData
// });

// const PoolModel = mongoose.model('Pool', poolSchema);
