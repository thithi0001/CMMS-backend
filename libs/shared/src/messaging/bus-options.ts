import { RmqOptions, Transport } from '@nestjs/microservices';
import { BUS_EXCHANGE } from '../constants/messaging.constants';

/** Dùng cho ClientProxy: vừa send() vừa emit() qua exchange topic. */
export const busClientOptions = (url: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [url],
    exchange: BUS_EXCHANGE,
    exchangeType: 'topic',
    wildcards: true,
    persistent: true,
  },
});

/** Dùng cho app.connectMicroservice(): lắng nghe queue của service, bind theo các pattern có handler. */
export const busServerOptions = (url: string, queue: string): RmqOptions => ({
  transport: Transport.RMQ,
  options: {
    urls: [url],
    queue,
    queueOptions: { durable: true },
    exchange: BUS_EXCHANGE,
    exchangeType: 'topic',
    wildcards: true,
    persistent: true,
    noAck: true,
    prefetchCount: 10,
  },
});
