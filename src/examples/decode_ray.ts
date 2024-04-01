import Long from "long";


function decodeRayLog(encodedLog: string): any {
    try {
        console.log(encodedLog);

        // Base64 decode the string to get back the original byte array
        const buffer = Buffer.from(encodedLog, 'base64');
        console.log(buffer);
        let offset = 1;
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

        const amount_in = new DataView(buf_amount_in).getBigUint64(0, true);;
        const minimum_out = new DataView(buf_minimum_out).getBigUint64(0, true);;
        const direction = new DataView(buf_direction).getBigUint64(0, true);;
        const user_source = new DataView(buf_user_source).getBigUint64(0, true);;
        const pool_coin = new DataView(buf_pool_coin).getBigUint64(0, true);;
        const pool_pc = new DataView(buf_pool_pc).getBigUint64(0, true);;
        const out_amount = new DataView(buf_out_amount).getBigUint64(0, true);;

        // 0 => LogType::Init,
        //     1 => LogType::Deposit,
        //     2 => LogType::Withdraw,
        //     3 => LogType::SwapBaseIn,
        //     4 => LogType::SwapBaseOut,

        const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        const log_type = dataView.getUint8(offset); offset += 1;

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

let s = 'A6g39QIAAAAAab8C9sqFAAABAAAAAAAAAKg39QIAAAAAl8AbU1GQiwEq7bBzBwAAALSigFBgnAAA';
console.log(decodeRayLog(s));
