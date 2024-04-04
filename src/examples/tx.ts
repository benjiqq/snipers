import 'dotenv/config';
import Monitor from '../app/oldmonitor.js';
import PoolInfoGatherer from '../app/parser_pool.js';
import Log from "../lib/logger.js";
import { RaydiumAmmCoder } from '../raydium_idl/coder/index.js';
import { Connection } from '@solana/web3.js';
const IDL = require('../raydium_idl/idl.json');
import { Idl } from "@coral-xyz/anchor";
import { writeFile } from 'fs/promises';
import TxParser from '../app/parser_tx.js'

Log.log(`decode example`);


async function fetchDataTx() {
    await Monitor.init();
    let txid = "5uUoxGk7RhCvhhHBpHcKDrNDfw883eiZkmG8t63Ls8dEsn4bEV7qSJgiyNr6oUGW1yL1d1Y9CzSYBM1UWGBquV2z";
    Log.info('get tx ' + txid);

    await Monitor.getTransaction(txid).then(tx => {
        Log.info('tx ' + tx);
        Log.info('signatures ' + tx?.transaction.signatures);
        Log.info('instructions ' + tx?.transaction.message.instructions);

    });

    //Swap 21,258.008700523 JONK 0.111856675    

    // //printAllInfo(tx, 'tx');


    //saveInfoToFile
    //saveInfoToFile(tx, 'rawtx_' + txid + '.json');
    //const open_pools = await axios.get(`${process.env.CORE_API_URL}/pairs/filter/?status=position_open`, { headers: axiosHeaders });

}


fetchDataTx().then(result => {

}).catch(error => {
    // Handle any errors
});
