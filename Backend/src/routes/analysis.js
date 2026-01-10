const express = require('express');
const router = express.Router();
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

// Create new analysis with GPS matching and AI (nouvelle version avec image)
router.post('/create-with-ai', auth, upload.single('image'), createAnalysisWithGPSAndAI);

// Create new analysis with GPS matching (legacy, sans image)
router.post('/create-with-gps', auth, createAnalysisWithGPSMatching);

// Get analysis history (for admin)
router.get('/history', auth, getAnalysisHistory);

// Get all analyses
router.get('/', auth, getAllAnalyses);

// Get analysis by ID
router.get('/:id', auth, getAnalysisById);

// Get analyses for a specific tree
router.get('/tree/:treeId', auth, getAnalysesByTreeId);

// Update analysis
router.put('/:id', auth, updateAnalysis);

// Delete analysis
router.delete('/:id', auth, deleteAnalysis);

module.exports = router;