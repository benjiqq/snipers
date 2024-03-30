import 'dotenv/config';
import PoolMonitor from './app/monitor.js';
import express, { Request, Application } from 'express';
import http from 'http';
import Log from "./lib/logger.js";

// const app = express();
// app.use(express.json());
// const PORT = process.env.HEALTH_CHECK_PORT || 80;

// app.get('/health', (req, res) => {
//     res.status(200).send('OK');
// });

// const httpServer = http.createServer(app);
// httpServer.listen(Number(PORT), '0.0.0.0', undefined, () => {
//     Log.log(`Application on port ${PORT}`);
//     // Init app
//     PoolMonitor.init();
//     PoolMonitor.start();

// }).on('error', (err) => {
//     Log.error('Unable to start application.');
//     console.error(err);
//     process.exit(1);
// });;

PoolMonitor.init();
PoolMonitor.start();