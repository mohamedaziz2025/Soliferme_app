const { Kafka, logLevel } = require('kafkajs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
const alertConsumerEnabled = process.env.ALERT_CONSUMER_ENABLED !== 'false';

const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const clientId = process.env.KAFKA_CLIENT_ID || 'fruitytrack-backend';
const topicPrefix = process.env.KAFKA_TOPIC_PREFIX || 'fruitytrack';
const groupId = process.env.ALERT_CONSUMER_GROUP_ID || 'fruitytrack-alert-consumer';

const minLevel = (process.env.ALERT_MIN_LEVEL || 'warning').toLowerCase();
const maxAiMs = Number(process.env.ALERT_RULE_MAX_AI_MS || 2000);
const maxProcessingMs = Number(process.env.ALERT_RULE_MAX_PROCESSING_MS || 5000);
const cooldownMs = Number(process.env.ALERT_COOLDOWN_SECONDS || 120) * 1000;

const emailEnabled = process.env.ALERT_EMAIL_ENABLED === 'true';
const emailFrom = process.env.ALERT_EMAIL_FROM || 'noreply@fruitytrack.local';
const emailTo = (process.env.ALERT_EMAIL_TO || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER || '';
const smtpPassword = process.env.SMTP_PASSWORD || '';

const webhookEnabled = process.env.ALERT_WEBHOOK_ENABLED === 'true';
const webhookUrl = process.env.ALERT_WEBHOOK_URL || '';
const webhookAuthHeader = process.env.ALERT_WEBHOOK_AUTH_HEADER || '';
const webhookTimeoutMs = Number(process.env.ALERT_WEBHOOK_TIMEOUT_MS || 5000);

const levelWeight = {
  info: 1,
  warning: 2,
  critical: 3,
};

let consumer = null;
let isRunning = false;
let emailTransporter = null;
const lastSentByKey = new Map();

function topic(name) {
  return `${topicPrefix}.${name}`;
}

function shouldSendByLevel(level) {
  const levelScore = levelWeight[level] || levelWeight.warning;
  const minLevelScore = levelWeight[minLevel] || levelWeight.warning;
  return levelScore >= minLevelScore;
}

function shouldSendNow(alertKey) {
  const now = Date.now();
  const lastSentAt = lastSentByKey.get(alertKey) || 0;

  if (now - lastSentAt < cooldownMs) {
    return false;
  }

  lastSentByKey.set(alertKey, now);

  // Prevent unbounded memory growth in long-running processes.
  if (lastSentByKey.size > 2000) {
    const expirationThreshold = now - (cooldownMs * 2);
    for (const [key, sentAt] of lastSentByKey.entries()) {
      if (sentAt < expirationThreshold) {
        lastSentByKey.delete(key);
      }
    }
  }

  return true;
}

function createAlert({
  severity,
  code,
  title,
  message,
  eventType,
  eventTimestamp,
  payload,
  metadata,
}) {
  return {
    severity,
    code,
    title,
    message,
    eventType,
    eventTimestamp,
    metadata: metadata || {},
    payload,
    generatedAt: new Date().toISOString(),
  };
}

function evaluateRules(eventType, payload, eventTimestamp) {
  const alerts = [];

  if (eventType === 'analysis.created') {
    const aiInferenceMs = Number(payload.aiInferenceMs || 0);
    const totalProcessingMs = Number(payload.totalProcessingMs || 0);
    const hasDisease = Boolean(payload.hasDisease);

    if (hasDisease) {
      alerts.push(
        createAlert({
          severity: 'critical',
          code: 'disease_detected',
          title: 'Maladie detectee sur une analyse',
          message: `Une analyse signale une maladie pour l'arbre ${payload.treeId || 'inconnu'}.`,
          eventType,
          eventTimestamp,
          payload,
          metadata: {
            treeId: payload.treeId,
            analysisId: payload.analysisId,
            userId: payload.userId,
          },
        })
      );
    }

    if (aiInferenceMs > maxAiMs) {
      alerts.push(
        createAlert({
          severity: 'warning',
          code: 'ai_inference_slow',
          title: 'Inference IA lente',
          message: `Le temps d'inference IA (${aiInferenceMs}ms) depasse le seuil (${maxAiMs}ms).`,
          eventType,
          eventTimestamp,
          payload,
          metadata: {
            treeId: payload.treeId,
            analysisId: payload.analysisId,
            aiInferenceMs,
          },
        })
      );
    }

    if (totalProcessingMs > maxProcessingMs) {
      alerts.push(
        createAlert({
          severity: 'warning',
          code: 'analysis_processing_slow',
          title: 'Traitement d\'analyse lent',
          message: `Le traitement total (${totalProcessingMs}ms) depasse le seuil (${maxProcessingMs}ms).`,
          eventType,
          eventTimestamp,
          payload,
          metadata: {
            treeId: payload.treeId,
            analysisId: payload.analysisId,
            totalProcessingMs,
          },
        })
      );
    }
  }

  if (eventType === 'sync.uploaded') {
    const operationType = String(payload.type || '').toLowerCase();
    const sensitiveOperations = new Set(['delete', 'bulk_delete', 'purge']);

    if (sensitiveOperations.has(operationType)) {
      alerts.push(
        createAlert({
          severity: 'warning',
          code: 'sync_sensitive_operation',
          title: 'Operation de sync sensible',
          message: `Une operation de synchronisation sensible a ete detectee (${operationType}).`,
          eventType,
          eventTimestamp,
          payload,
          metadata: {
            refId: payload.refId,
            userId: payload.userId,
            operationType,
          },
        })
      );
    }
  }

  return alerts;
}

function buildAlertKey(alert) {
  const treeId = alert.metadata.treeId || 'none';
  const analysisId = alert.metadata.analysisId || 'none';
  const userId = alert.metadata.userId || 'none';
  return `${alert.code}:${treeId}:${analysisId}:${userId}`;
}

async function getEmailTransporter() {
  if (!emailEnabled) {
    return null;
  }

  if (emailTransporter) {
    return emailTransporter;
  }

  if (!smtpHost || !smtpUser || !smtpPassword || emailTo.length === 0) {
    console.warn('Alert email transport is not configured; email alerts disabled.');
    return null;
  }

  emailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  try {
    await emailTransporter.verify();
    console.log('Alert email transport ready');
    return emailTransporter;
  } catch (error) {
    console.error('Alert email transport verification failed:', error.message);
    emailTransporter = null;
    return null;
  }
}

function formatEmail(alert) {
  const subject = `[${alert.severity.toUpperCase()}] FruityTrack - ${alert.title}`;
  const text = [
    `Titre: ${alert.title}`,
    `Severite: ${alert.severity}`,
    `Type evenement: ${alert.eventType}`,
    `Code: ${alert.code}`,
    `Message: ${alert.message}`,
    `Horodatage evenement: ${alert.eventTimestamp}`,
    `Horodatage alerte: ${alert.generatedAt}`,
    '',
    `Metadata: ${JSON.stringify(alert.metadata)}`,
    `Payload: ${JSON.stringify(alert.payload)}`,
  ].join('\n');

  return { subject, text };
}

async function sendEmailAlert(alert) {
  const transporter = await getEmailTransporter();
  if (!transporter) {
    return false;
  }

  const { subject, text } = formatEmail(alert);

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: emailTo.join(', '),
      subject,
      text,
    });
    console.log(`Alert email sent: ${alert.code}`);
    return true;
  } catch (error) {
    console.error(`Alert email failed for ${alert.code}:`, error.message);
    return false;
  }
}

async function sendWebhookAlert(alert) {
  if (!webhookEnabled) {
    return false;
  }

  if (!webhookUrl) {
    console.warn('Alert webhook is enabled but ALERT_WEBHOOK_URL is missing.');
    return false;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (webhookAuthHeader) {
    headers.Authorization = webhookAuthHeader;
  }

  try {
    await axios.post(webhookUrl, alert, {
      headers,
      timeout: webhookTimeoutMs,
    });
    console.log(`Alert webhook sent: ${alert.code}`);
    return true;
  } catch (error) {
    console.error(`Alert webhook failed for ${alert.code}:`, error.message);
    return false;
  }
}

async function dispatchAlert(alert) {
  if (!shouldSendByLevel(alert.severity)) {
    return;
  }

  const alertKey = buildAlertKey(alert);
  if (!shouldSendNow(alertKey)) {
    return;
  }

  const [emailSent, webhookSent] = await Promise.all([
    sendEmailAlert(alert),
    sendWebhookAlert(alert),
  ]);

  if (!emailSent && !webhookSent) {
    console.log(`Alert generated but no channel delivered: ${alert.code}`);
  }
}

async function processMessage(rawValue) {
  if (!rawValue) {
    return;
  }

  let event;
  try {
    event = JSON.parse(rawValue);
  } catch (error) {
    console.error('Alert consumer received invalid JSON event:', error.message);
    return;
  }

  const eventType = event.eventType;
  const payload = event.payload || {};
  const eventTimestamp = event.timestamp || new Date().toISOString();

  if (!eventType) {
    return;
  }

  const alerts = evaluateRules(eventType, payload, eventTimestamp);
  for (const alert of alerts) {
    await dispatchAlert(alert);
  }
}

async function startAlertConsumer() {
  if (!kafkaEnabled || !alertConsumerEnabled) {
    console.log('Alert consumer disabled by configuration');
    return;
  }

  if (isRunning) {
    return;
  }

  try {
    const kafka = new Kafka({
      clientId: `${clientId}-alerts`,
      brokers,
      logLevel: logLevel.NOTHING,
    });

    consumer = kafka.consumer({ groupId });
    await consumer.connect();

    await consumer.subscribe({ topic: topic('analysis.created'), fromBeginning: false });
    await consumer.subscribe({ topic: topic('sync.uploaded'), fromBeginning: false });

    isRunning = true;

    consumer.run({
      eachMessage: async ({ message }) => {
        const rawValue = message && message.value ? message.value.toString() : '';
        await processMessage(rawValue);
      },
    }).catch((error) => {
      console.error('Alert consumer runtime error:', error.message);
      isRunning = false;
    });

    console.log('Kafka alert consumer started');
  } catch (error) {
    console.error('Alert consumer startup failed:', error.message);
    isRunning = false;
    consumer = null;
  }
}

async function stopAlertConsumer() {
  if (!consumer) {
    return;
  }

  try {
    await consumer.disconnect();
  } catch (error) {
    console.error('Alert consumer stop failed:', error.message);
  } finally {
    consumer = null;
    isRunning = false;
  }
}

module.exports = {
  startAlertConsumer,
  stopAlertConsumer,
  evaluateRules,
};