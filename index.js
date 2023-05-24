const express = require('express');
const app = express();
const PORT = process.env.PORT || 4002;
app.use(express.json());
app.listen(PORT, () => console.log('Server running at port ' + PORT));

const amqp = require('amqplib');

const connectionURL = 'amqp://username:password@localhost:5672/%2f';
(async () => {
    const connection = await amqp.connect(connectionURL);
    await connectQueue();
    await sendMessage('start');

    async function sendMessage(message) {
      try {
        const startChannel = await connection.createChannel();
        const queue = 'command_queue';
        await startChannel.assertQueue(queue);
        const Command = {
            type: message
        }
        startChannel.sendToQueue(queue, Buffer.from(JSON.stringify(Command)));
        console.log('Message sent:', Command);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }

    async function connectQueue() {
        try {
            const statusChannel = await connection.createChannel();
            await statusChannel.assertQueue('status_queue');
            await statusChannel.consume('status_queue', data => {
                console.log(`Status: ${Buffer.from(data.content)}`);
                statusChannel.ack(data);
            });
            const epochChannel = await connection.createChannel();
            await epochChannel.assertQueue('epoch_queue');
            await epochChannel.consume('epoch_queue', data => {
                console.log(`Epoch: ${Buffer.from(data.content)}`);
                epochChannel.ack(data);
            });
            const metricsChannel = await connection.createChannel();
            await metricsChannel.assertQueue('metrics_queue');
            await metricsChannel.consume('metrics_queue', async data => {
                console.log(`Metrics: ${Buffer.from(data.content)}`);
                metricsChannel.ack(data);
                await sendMessage('stop');
            });
        } catch (error) {
            console.log(error);
        }
    }
})();
