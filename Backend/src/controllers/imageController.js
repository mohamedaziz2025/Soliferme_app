const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ImageAsset = require('../models/imageAsset');

const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

function findFallbackPath(imageId) {
  const candidates = [
    path.join(uploadsRoot, 'analysis', imageId),
    path.join(uploadsRoot, imageId),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    let asset = null;

    if (mongoose.isValidObjectId(id)) {
      asset = await ImageAsset.findById(id);
    }

    if (asset) {
      const filePath = path.join(uploadsRoot, asset.relativePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Image file missing on disk' });
      }
      return res.sendFile(filePath);
    }

    const fallbackPath = findFallbackPath(id);
    if (fallbackPath) {
      return res.sendFile(fallbackPath);
    }

    return res.status(404).json({ message: 'Image not found' });
  } catch (error) {
    console.error('Image fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to load image' });
  }
};

module.exports = {
  getImageById,
};
