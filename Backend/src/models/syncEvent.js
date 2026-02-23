const mongoose = require('mongoose');

const SyncEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  refId: { type: String, required: true }, // tree id, analysis id, etc.
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SyncEvent = mongoose.model('SyncEvent', SyncEventSchema);
module.exports = SyncEvent;
