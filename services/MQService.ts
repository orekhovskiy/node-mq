import amqp, { Connection, Channel } from 'amqplib';
import { ConsumeMessage } from 'amqplib/properties';
import CommandMessage from '@/types/CommandMessage';
import LoggerService from '@/services/LoggerService';
type CallbackType = (msg: ConsumeMessage | null) => void;

export default class MQService {
  private static readonly _logger = new LoggerService(this.constructor.name);
  private static readonly connectionUrl = 'amqp://username:password@localhost:5672/';
  private static _connection: Connection | undefined;
  private static _commandChannel: Channel | undefined;
  private static _statusChannel: Channel | undefined;
  private static _metricsChannel: Channel | undefined;
  private static _epochChannel: Channel | undefined;

  static async init(
    statusChannelCallback: CallbackType,
    epochChannelCallback: CallbackType,
    metricsChannelCallback: CallbackType,
  ) {
    if (MQService._connection) return;
    MQService._logger.info('Initializing RabbitMQ connection and channels');
    MQService._connection = await amqp.connect(MQService.connectionUrl);
    MQService._statusChannel = await MQService.initConsumeChannel('status_queue', statusChannelCallback);
    MQService._epochChannel = await MQService.initConsumeChannel('epoch_queue', epochChannelCallback);
    MQService._metricsChannel = await MQService.initConsumeChannel('metrics_queue', metricsChannelCallback);


    MQService._commandChannel = await MQService._connection.createChannel();
    await MQService._commandChannel.assertQueue('command_queue');
  }

  static async sendCommand(command: CommandMessage) {
    if (MQService._commandChannel) {
      MQService._commandChannel.sendToQueue(
        'command_queue',
        Buffer.from(JSON.stringify(command))
      );
      MQService._logger.info(`Command "${command.type}" sent`);
    } else {
      MQService._logger.error('Command channel has not been initialized');
      throw Error('Command channel has not been initialized');
    }
  }

  private static async initConsumeChannel(queueName: string, callback: CallbackType): Promise<Channel | undefined> {
    if (!MQService._connection) return undefined;
    const channel = await MQService._connection.createChannel();
    await channel.assertQueue(queueName);
    const wrappedCallback = MQService.callbackWrapper(callback, channel, queueName);
    await channel.consume(queueName, wrappedCallback);
    return channel;
  }

  private static callbackWrapper(callback: CallbackType, channel: Channel, queueName: string) {
    return (msg: ConsumeMessage | null) => {
      callback(msg);
      if (msg) {
        MQService._logger.info(`Received message from ${queueName}`);
        channel.ack(msg);
      }
    }
  }
}
