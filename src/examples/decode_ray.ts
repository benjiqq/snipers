import Long from "long";


export function decodeRayLog(encodedLog: string): any {
    //console.log(">> " + encodedLog);
    try {
        //console.log(encodedLog);

        // Base64 decode the string to get back the original byte array
        const buffer = Buffer.from(encodedLog, 'base64');
        //console.log(buffer);
        const log_type = buffer[0];
        //console.log("?? " + log_type);
        let offset = 0;
        let buf_logtype = (buffer.buffer.slice(offset, offset + 1));
        offset += 1;
        let buf_amount_in = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_minimum_out = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_direction = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_user_source = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_pool_coin = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_pool_pc = (buffer.buffer.slice(offset, offset + 8));
        offset += 8;
        let buf_out_amount = (buffer.buffer.slice(offset, offset + 8));

        //console.log(new Uint8Array(buf_logtype));
        //console.log();

        const amount_in = new DataView(buf_amount_in).getBigUint64(0, true);;
        const minimum_out = new DataView(buf_minimum_out).getBigUint64(0, true);;
        const direction = new DataView(buf_direction).getBigUint64(0, true);;
        const user_source = new DataView(buf_user_source).getBigUint64(0, true);;
        const pool_coin = new DataView(buf_pool_coin).getBigUint64(0, true);;
        const pool_pc = new DataView(buf_pool_pc).getBigUint64(0, true);;
        const out_amount = new DataView(buf_out_amount).getBigUint64(0, true);;

        // 0 => LogType::Init,
        // 1 => LogType::Deposit,
        // 2 => LogType::Withdraw,
        // 3 => LogType::SwapBaseIn,
        // 4 => LogType::SwapBaseOut,

        //const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        //const log_type = dataView.getUint8(offset); offset += 1;

        return {
            log_type,
            amount_in: amount_in.toString(),
            minimum_out: minimum_out.toString(),
            direction: direction.toString(),
            user_source: user_source.toString(),
            pool_coin: pool_coin.toString(),
            pool_pc: pool_pc.toString(),
            out_amount: out_amount.toString(),
        };


    } catch (error) {
        console.error('Failed to decode and parse the log:', error);
        return null;
    }
}

// let s = 'A6g39QIAAAAAab8C9sqFAAABAAAAAAAAAKg39QIAAAAAl8AbU1GQiwEq7bBzBwAAALSigFBgnAAA';

//buy
//2wSWUVh142CE9GWNbP4ppnNJDAw5nv5adcEcsdniJDtbQ7sJ4CzgA6T25roAoHVmgB9Tbg8iYd21BmTM25MSq6FQ
//Swap 1.2 SOL for 40,771.36114 MEW
let s = 'BP//////////AOQLVAIAAAABAAAAAAAAANIQja4AAAAAykVxTXAcAQDq7gAfFlMAAJkQja4AAAAA';
console.log(decodeRayLog(s));

//sell
//28fnV4wg4L7rZ45F1xxh2hbnUAqHEw1SFLb8PpGeuRxyXAxqgB8uTgj3RPGQ7zEjqNjMcQEuvpP7sTnphTPNqsE4
//Swap
//40,000 MEW for 1.170626487 SOL


// {
//     log_type: 4,
//     amount_in: "18446744073709551615",
//     minimum_out: "10000000000",
//     direction: "1",
//     user_source: "2928480466",
//     pool_coin: "312743637894602",
//     pool_pc: "91354474540778",
//     out_amount: "2928480409",
//   }