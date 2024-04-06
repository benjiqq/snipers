import 'dotenv/config';
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
import { rabbitMQSubscriber } from './sub';

const app = express();
export const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


// app.get('/', (req: any, res: any) => {
//     // Specify the path to your index.html
//     const indexPath = path.join(__dirname, 'index.html');
//     res.sendFile(indexPath);
// });

const clients: WebSocket[] = [];


async function startServer() {

    try {
        await rabbitMQSubscriber.consume('pool', (msg) => {
            if (msg) {
                console.log("Received message:", msg.content.toString());
                // rabbitMQSubscriber.channel?.ack(msg);
                clients.forEach((client: WebSocket) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(msg.content.toString());
                    }
                });
            }
        });
        console.log('Subscribed to pool');
    } catch (error) {
        console.error('Failed to subscribe:', error);
    }

    // WebSocket connection handler
    wss.on('connection', (ws: any) => {
        console.log('Client connected');

        clients.push(ws);

        ws.on('recent_pools', (message: any) => {
            console.log(`Received message => ${message}`);

        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });

        // Send a message to the client
        ws.send(JSON.stringify({ 'message': 'Openbot. server started' }));
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });


}

(async () => {
    try {
        await rabbitMQSubscriber.init();
        await startServer();
        //console.log(rabbitMQSubscriber.connection)
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();