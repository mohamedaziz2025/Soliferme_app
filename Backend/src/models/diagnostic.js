const mongoose = require('mongoose');

const DiagnosticSchema = new mongoose.Schema({
  diagnosticId: { type: String, required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'critical'], required: true, index: true },
  summary: { type: String, default: '' },
  analysisId: { type: String },
  timestamp: { type: Date, required: true, index: true },
  source: { type: String, default: 'kafka' },
  raw: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

DiagnosticSchema.index({ severity: 1, timestamp: -1 });
DiagnosticSchema.index({ diagnosticId: 1, timestamp: -1 });

module.exports = mongoose.model('Diagnostic', DiagnosticSchema);
