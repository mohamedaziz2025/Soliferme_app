const mongoose = require('mongoose');

const ImageAssetSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  relativePath: { type: String, required: true },
  contentType: { type: String },
  size: { type: Number },
  origin: { type: String, enum: ['analysis', 'tree', 'sync', 'unknown'], default: 'analysis' },
  analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },
  treeId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },
});

ImageAssetSchema.index({ uploadedAt: -1 });
ImageAssetSchema.index({ analysisId: 1 });
ImageAssetSchema.index({ treeId: 1 });

module.exports = mongoose.model('ImageAsset', ImageAssetSchema);
