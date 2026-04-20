const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { 
  upload,
  createAnalysisWithGPSAndAI,
  createAnalysisWithGPSMatching,
  getAllAnalyses,
  getAnalysisById,
  getAnalysesByTreeId,
  getAnalysisHistory,
  updateAnalysis,
  deleteAnalysis
} = require('../controllers/analysisController');

const uploadAnalysisImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: 'Image trop volumineuse (max 10MB)'
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Champ image invalide. Utilisez le champ "image".'
        });
      }

      return res.status(400).json({
        message: err.message || 'Erreur lors de l\'upload de l\'image'
      });
    }

    return res.status(400).json({
      message: err.message || 'Fichier image invalide'
    });
  });
};

// Create new analysis with GPS matching and AI (nouvelle version avec image)
router.post('/create-with-ai', auth, uploadAnalysisImage, createAnalysisWithGPSAndAI);

// Create new analysis with GPS matching (legacy, sans image)
router.post('/create-with-gps', auth, createAnalysisWithGPSMatching);

// Get analysis history (for admin)
router.get('/history', auth, getAnalysisHistory);

// Get all analyses
router.get('/', auth, getAllAnalyses);

// Get analyses for a specific tree
router.get('/tree/:treeId', auth, getAnalysesByTreeId);

// Get analysis by ID
router.get('/:id', auth, getAnalysisById);

// Update analysis
router.put('/:id', auth, updateAnalysis);

// Delete analysis
router.delete('/:id', auth, deleteAnalysis);

module.exports = router;