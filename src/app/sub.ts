import { connect, Connection, Channel, ConsumeMessage, Options } from 'amqplib';

class RabbitMQSubscriber {
    private connection: Connection | null = null;
    public channel: Channel | null = null;
    private readonly uri: string;
    private isConnecting: boolean = false;

    constructor(uri: string) {
        this.uri = uri;
    }

    async init(): Promise<void> {
        console.log('subscriber. init rmq ' + this.uri);
        if (this.connection && this.channel) {
            return;
        }
        this.isConnecting = true;
        try {
            this.connection = await connect(this.uri);
            this.connection.on('error', (err) => {
                console.error('Connection error:', err);
                this.reconnect();
            });

            this.connection.on('close', () => {
                console.log('Connection closed.');
                this.reconnect();
            });

            this.channel = await this.connection.createChannel();
            this.channel.on('error', (err) => {
                console.error('Channel error:', err);
                this.reconnect();
            });

            this.channel.on('close', () => {
                console.log('Channel closed.');
                this.reconnect();
            });
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            this.reconnect();
        } finally {
            this.isConnecting = false;
        }
    }

    async reconnect(): Promise<void> {
        this.close();
        console.log('Reconnecting...');
        setTimeout(() => this.init(), 5000); // Reconnect after 5 seconds
    }

    async bindQueueToExchange(queue: string, exchange: string): Promise<void> {
        if (!this.channel) {
            throw new Error("Subscriber not initialized. Call init() first.");
        }
        await this.channel.assertQueue(queue, { durable: false, autoDelete: true });
        await this.channel.assertExchange(exchange, 'fanout', { durable: false, autoDelete: true });
        await this.channel.bindQueue(queue, exchange, '');
    }

    async consume(queue: string, onMessage: (msg: ConsumeMessage | null) => void, options?: Options.Consume): Promise<void> {
        if (!this.channel) {
            throw new Error("Subscriber not initialized. Call init() first.");
        }
        await this.channel.assertQueue(queue, { durable: false, autoDelete: true });
        await this.channel.consume(queue, (msg) => {
            try {
                if (msg) {
                    onMessage(msg);
                    this.channel?.ack(msg);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                // Optionally, you can nack the message if there's an error
                // this.channel?.nack(msg);
            }
        }, options);
    }

    async close(): Promise<void> {
        if (this.channel) {
            await this.channel.close();
            this.channel = null;
        }
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
    }
}

console.log(`connect ${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}`);
export const rabbitMQSubscriber = new RabbitMQSubscriber(`amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}`);

// Usage
// import { rabbitMQSubscriber } from './subscriber';

// With exchange fanout
// async function setupAndConsume() {
//     await rabbitMQSubscriber.init();
//     await rabbitMQSubscriber.bindQueueToExchange('myQueue', 'myFanoutExchange');

//     await rabbitMQSubscriber.consume('myQueue', (msg) => {
//         if (msg) {
//             console.log("Received:", msg.content.toString());
//             // Process the message...
//             // Acknowledgement is handled in the consume method
//         }
//     });
// }

// Single consumer
// async function main() {
//     await rabbitMQSubscriber.init();
//     try {
//         await rabbitMQSubscriber.consume('test_queue', (msg) => {
//             if (msg) {
//                 console.log("Received message:", msg.content.toString());
//                 // Acknowledge the message
//                 rabbitMQSubscriber.channel?.ack(msg);
//             }
//         });
//         console.log('Subscribed to test_queue');
//     } catch (error) {
//         console.error('Failed to subscribe:', error);
//     }
// }
