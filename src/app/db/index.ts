import Log from "../../lib/logger.js";

const mongoose = require('mongoose');

import models from './models/index.js';

const poolSchema = new mongoose.Schema({
    pool_account: String,
    // Add other fields according to the structure of poolData
});

const PoolModel = mongoose.model('Pool', poolSchema);

const connectDb = async (): Promise<void> => {
    try {
        mongoose.set('strictQuery', true);

        Log.info('Connected to MongoDB ');

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
    try {
        const pool = new PoolModel(poolData);
        await pool.save();
        Log.info('Pool data saved to the database successfully');
    } catch (error) {
        Log.error('Error:' + error);
    }
}

export { connectDb, PoolModel, savePoolToDb };



