import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
var express = require("express");
var app = express();
var http = require("http");

// Define custom TypeScript types for log metadata
interface LogMetadata {
    [key: string]: any;
}

// Authorization callback for WebSocket connections
var authCallback = function (req: any, callback: any) {
    // Implement your authentication logic here
    // For demonstration purposes, we'll allow all connections
    callback(true); // First argument is a boolean indicating success
};

function extractStackInfo(stack: string | undefined): string {
    if (stack) {
        // Split the stack trace string into lines, and find the first line after the one containing this function's name
        const stackLines = stack.split('\n');
        const relevantLine = stackLines.find(line => line.includes('__filename'));
        if (relevantLine) {
            // Extract the file path and line number using a regular expression
            const match = /at\s+(.*):(\d+):(\d+)/.exec(relevantLine);
            if (match) {
                return ` (file: ${match[1]}, line: ${match[2]})`;
            }
        }
    }
    return '';
}

const customWinstonFormat = winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    // Append stack info if it's an error
    if (stack) {
        msg += ` ${extractStackInfo(stack)}`;
    }
    if (Object.keys(metadata).length !== 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const customFormat2 = winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    //console.log('??? ' + message);
    let msg = `${timestamp} [${level}]: ${message}`;
    //console.log('???>>>> ' + message);
    //console.log('>>' + msg);
    // if (Object.keys(metadata).length !== 0) {
    //     //console.log('??? ' + message);
    //     msg += ` ${JSON.stringify(metadata)}`;
    // } else {
    //     console.log('??? ' + message);
    // }
    //msg += ` ${JSON.stringify(metadata)}`;
    return msg;
});

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    // Format your log message
    let formattedMessage = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        formattedMessage += ` ${JSON.stringify(metadata)}`;
    }
    return formattedMessage;
});

const logFormatStack = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        // Construct the log message string
        let msg = `${timestamp} [${level}]: ${message}`;
        // Optionally, convert metadata to a string if it's not empty
        if (Object.keys(metadata).length !== 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);


const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Shorter timestamp format
    winston.format((info: any) => {
        delete info.pid;
        delete info.hostname;
        // Adjust the deletion of 'level' based on the transport requirements
        return info;
    })(),
    customFormat
);

// Ensure the logs directory exists
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create the Winston logger with TypeScript types
export const logger2: winston.Logger = winston.createLogger({
    level: 'trace',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            ),
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log')
        }),

    ],
});

export const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            ),
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log')
        }),
    ],
});

logger.info('This is an info level message', { additional: 'data' });

