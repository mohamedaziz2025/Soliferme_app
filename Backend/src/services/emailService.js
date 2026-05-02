const nodemailer = require('nodemailer');

const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailSecure = process.env.EMAIL_SECURE === 'true';
const emailUser = process.env.EMAIL_USER || '';
const emailPass = process.env.EMAIL_PASS || '';
const emailFrom = process.env.EMAIL_FROM || emailUser || 'no-reply@soliferme.local';
const emailTo = (process.env.EMAIL_TO || emailUser || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

let transporter = null;

function isConfigured() {
  return Boolean(emailHost && emailUser && emailPass && emailTo.length > 0);
}

async function getTransporter() {
  if (!isConfigured()) {
    console.warn('Email transport not configured; skipping email notification.');
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  try {
    await transporter.verify();
    console.log('Email transport ready');
    return transporter;
  } catch (error) {
    console.error('Email transport verification failed:', error.message);
    transporter = null;
    return null;
  }
}

async function sendEmail({ subject, text }) {
  const activeTransport = await getTransporter();
  if (!activeTransport) {
    return false;
  }

  try {
    await activeTransport.sendMail({
      from: emailFrom,
      to: emailTo.join(', '),
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
}

function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function buildDiagnosticEmail({ diagnosticId, severity, timestamp, summary, analysisId }) {
  const subject = `[${String(severity).toUpperCase()}] Diagnostic pathologique ${diagnosticId}`;
  const lines = [
    `Diagnostic ID: ${diagnosticId}`,
    `Severity: ${severity}`,
    `Timestamp: ${formatTimestamp(timestamp)}`,
    analysisId ? `Analysis ID: ${analysisId}` : null,
    `Summary: ${summary || 'No summary provided'}`,
  ].filter(Boolean);

  return {
    subject,
    text: lines.join('\n'),
  };
}

async function sendDiagnosticAlertEmail(payload) {
  const { subject, text } = buildDiagnosticEmail(payload);
  return sendEmail({ subject, text });
}

module.exports = {
  sendEmail,
  sendDiagnosticAlertEmail,
};
