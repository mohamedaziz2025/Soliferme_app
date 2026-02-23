const express = require('express');
const authMiddleware = require('../middleware/auth');
const SyncEvent = require('../models/syncEvent');

const router = express.Router();

// Upload local changes from mobile
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { type, id, data, timestamp } = req.body;
    const event = new SyncEvent({
      type,
      refId: id,
      data,
      timestamp: timestamp ? new Date(timestamp) : Date.now(),
    });
    await event.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Upload sync error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download changes since given timestamp
router.get('/download', authMiddleware, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const events = await SyncEvent.find({ timestamp: { $gt: since } }).sort({ timestamp: 1 });
    // transform events to client-friendly format
    const out = events.map(e => ({
      type: e.type,
      id: e.refId,
      data: e.data,
      timestamp: e.timestamp,
    }));
    res.json(out);
  } catch (err) {
    console.error('Download sync error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
