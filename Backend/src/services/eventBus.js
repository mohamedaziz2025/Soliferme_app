const { Kafka, logLevel } = require('kafkajs');

const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || 'fruitytrack-backend';
const topicPrefix = process.env.KAFKA_TOPIC_PREFIX || 'fruitytrack';

let producer = null;
let initialized = false;

function topic(name) {
  return `${topicPrefix}.${name}`;
}

async function initProducer() {
  if (!kafkaEnabled || initialized) return;

  try {
    const kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.NOTHING,
    });

    producer = kafka.producer({
      allowAutoTopicCreation: true,
    });

    await producer.connect();
    initialized = true;
    console.log('Kafka producer connected');
  } catch (error) {
    console.error('Kafka initialization failed, continuing without Kafka:', error.message);
    producer = null;
    initialized = false;
  }
}

async function publish(eventType, payload) {
  if (!kafkaEnabled) return false;

  if (!initialized) {
    await initProducer();
  }

  if (!producer) return false;

  try {
    await producer.send({
      topic: topic(eventType),
      messages: [
        {
          key: eventType,
          value: JSON.stringify({
            eventType,
            timestamp: new Date().toISOString(),
            payload,
          }),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error(`Kafka publish failed for ${eventType}:`, error.message);
    return false;
  }
}

async function disconnectProducer() {
  if (!producer) return;
  try {
    await producer.disconnect();
  } catch (error) {
    console.error('Kafka producer disconnect error:', error.message);
  }
}

module.exports = {
  initProducer,
  publish,
  disconnectProducer,
};
