const amqp = require("amqplib");
require("dotenv").config();

let channel = null;

async function getRabbitChannel() {
  if (channel) return channel;

  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // Khởi tạo Queue bền vững (sống sót cả khi server reboot)
  await channel.assertQueue(process.env.QUEUE_NAME, { durable: true });

  console.log(
    `🐇 Connected to RabbitMQ. Queue '${process.env.QUEUE_NAME}' is ready.`,
  );
  return channel;
}

module.exports = { getRabbitChannel };
