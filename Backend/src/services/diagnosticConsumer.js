const { Kafka, logLevel } = require('kafkajs');
const Diagnostic = require('../models/diagnostic');
const { sendDiagnosticAlertEmail } = require('./emailService');

const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
const consumerEnabled = process.env.DIAGNOSTIC_CONSUMER_ENABLED !== 'false';

const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || 'fruitytrack-backend';
const topicPrefix = process.env.KAFKA_TOPIC_PREFIX || 'fruitytrack';
const topicName = process.env.DIAGNOSTIC_TOPIC || `${topicPrefix}.diagnostic.pathology`;
const groupId = process.env.DIAGNOSTIC_GROUP_ID || 'fruitytrack-diagnostic-consumer';
const startupRetryDelayMs = Number(process.env.DIAGNOSTIC_CONSUMER_RETRY_MS || 10000);

let consumer = null;
let isRunning = false;
let startupRetryTimer = null;

function normalizeSeverity(value) {
  const normalized = String(value || '').toLowerCase();
  if (['critical', 'crit', 'high'].includes(normalized)) return 'critical';
  if (['medium', 'warning', 'warn'].includes(normalized)) return 'medium';
  if (['low', 'info', 'minor'].includes(normalized)) return 'low';
  return 'low';
}

function buildFallbackId(meta = {}) {
  const keyPart = meta.key || 'diagnostic';
  const offsetPart = meta.offset || Date.now();
  return `${keyPart}-${offsetPart}`;
}

function normalizeTimestamp(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function extractPayload(event) {
  if (event && typeof event.payload === 'object' && event.payload !== null) {
    return event.payload;
  }
  return event || {};
}

async function processMessage(rawValue, meta = {}) {
  if (!rawValue) {
    return;
  }

  let event;
  try {
    event = JSON.parse(rawValue);
  } catch (error) {
    console.error('Diagnostic consumer received invalid JSON:', error.message);
    return;
  }

  const payload = extractPayload(event);
  const diagnosticId = payload.diagnosticId || payload.id || event.diagnosticId || event.id || buildFallbackId(meta);
  const severity = normalizeSeverity(payload.severity || payload.level || event.severity || event.level);
  const timestamp = normalizeTimestamp(payload.timestamp || event.timestamp || event.eventTimestamp);
  const summary = payload.summary || payload.analysisSummary || payload.resultSummary || payload.message || '';
  const analysisId = payload.analysisId || payload.analysis_id || event.analysisId || null;

  try {
    const diagnostic = await Diagnostic.create({
      diagnosticId,
      severity,
      summary,
      analysisId,
      timestamp,
      source: 'kafka',
      raw: event,
    });

    if (diagnostic.severity === 'critical') {
      await sendDiagnosticAlertEmail({
        diagnosticId: diagnostic.diagnosticId,
        severity: diagnostic.severity,
        timestamp: diagnostic.timestamp,
        summary: diagnostic.summary,
        analysisId: diagnostic.analysisId,
      });
    }
  } catch (error) {
    console.error('Diagnostic persistence failed:', error.message);
  }
}

async function startDiagnosticConsumer() {
  if (!kafkaEnabled || !consumerEnabled) {
    console.log('Diagnostic consumer disabled by configuration');
    return;
  }

  if (startupRetryTimer) {
    clearTimeout(startupRetryTimer);
    startupRetryTimer = null;
  }

  if (isRunning) {
    return;
  }

  try {
    const kafka = new Kafka({
      clientId: `${clientId}-diagnostics`,
      brokers,
      logLevel: logLevel.NOTHING,
    });

    consumer = kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic: topicName, fromBeginning: false });

    isRunning = true;

    consumer.run({
      eachMessage: async ({ message, partition }) => {
        const rawValue = message && message.value ? message.value.toString() : '';
        await processMessage(rawValue, {
          key: message && message.key ? message.key.toString() : null,
          offset: message ? message.offset : null,
          partition,
        });
      },
    }).catch((error) => {
      console.error('Diagnostic consumer runtime error:', error.message);
      isRunning = false;
    });

    console.log(`Kafka diagnostic consumer started on ${topicName}`);
  } catch (error) {
    console.error('Diagnostic consumer startup failed:', error.message);
    isRunning = false;
    consumer = null;

    startupRetryTimer = setTimeout(() => {
      startupRetryTimer = null;
      startDiagnosticConsumer().catch((retryError) => {
        console.error('Diagnostic consumer retry failed:', retryError.message);
      });
    }, startupRetryDelayMs);
  }
}

async function stopDiagnosticConsumer() {
  if (startupRetryTimer) {
    clearTimeout(startupRetryTimer);
    startupRetryTimer = null;
  }

  if (!consumer) {
    return;
  }

  try {
    await consumer.disconnect();
  } catch (error) {
    console.error('Diagnostic consumer stop failed:', error.message);
  } finally {
    consumer = null;
    isRunning = false;
  }
}

module.exports = {
  startDiagnosticConsumer,
  stopDiagnosticConsumer,
};
