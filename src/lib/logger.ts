import * as Utils from "@utils";

const reset = "\x1b[0m";
const bright = "\x1b[1m";
const dim = "\x1b[2m";
const underscore = "\x1b[4m";
const blink = "\x1b[5m";
const reverse = "\x1b[7m";
const hidden = "\x1b[8m";

const fgBlack = "\x1b[30m";
const fgRed = "\x1b[31m";
const fgGreen = "\x1b[32m";
const fgYellow = "\x1b[33m";
const fgBlue = "\x1b[34m";
const fgMagenta = "\x1b[35m";
const fgCyan = "\x1b[36m";
const fgWhite = "\x1b[37m";
const fgGray = "\x1b[90m";

const bgBlack = "\x1b[40m";
const bgRed = "\x1b[41m";
const bgGreen = "\x1b[42m";
const bgYellow = "\x1b[43m";
const bgBlue = "\x1b[44m";
const bgMagenta = "\x1b[45m";
const bgCyan = "\x1b[46m";
const bgWhite = "\x1b[47m";

class Log {
    private static instance: Log;
    private constructor() { }

    public static getInstance(): Log {
        if (!Log.instance) {
            Log.instance = new Log();
        }
        return Log.instance;
    }

    public debug(str: string, account?: string): void {
        console.log(this.time(account) + fgYellow + str + reset);
    }
    public log(str: string, account?: string): void {
        console.log(this.time(account) + fgCyan + str + reset);
    }
    public success(str: string, account?: string): void {
        console.log(this.time(account) + fgGreen + str + reset);
    }
    public error(str: string | undefined, account?: string): void {
        if (!str) console.log(this.time(account) + fgRed + 'Undefined error' + reset);
        console.log(this.time(account) + fgRed + str + reset);
    }
    public info(str: string, account?: string): void {
        console.log(this.time(account) + fgGray + str + reset);
    }

    private time(account: string | undefined): string {
        if (account) {
            return fgGray + Utils.utcdate(Date.now()) + ' (' + account + ')' + reset + ':  ';
        }
        return fgGray + Utils.utcdate(Date.now()) + reset + ':  ';
    }
}

export default Log.getInstance();
