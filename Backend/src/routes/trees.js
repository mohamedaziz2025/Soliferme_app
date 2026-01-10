const express = require('express');
const multer = require('multer');
const path = require('path');
const { 
  getAllTrees, 
  getTreeById, 
  createTree,
  createBulkTrees,
  updateTree, 
  addTreeImage,
  getTreeStats,
  getTreeAnalytics,
  getTreesByOwnerEmail,
  reassignTrees,
  getTreesByOwner,
  archiveTree,
  restoreTree,
  getIncompleteDataTrees
} = require('../controllers/treeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Images uniquement!'));
  }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Routes
router.get('/stats', getTreeStats);
router.get('/incomplete-data', getIncompleteDataTrees);
router.get('/owner/:email', getTreesByOwnerEmail);
router.get('/:id/analytics', getTreeAnalytics);
router.get('/', getAllTrees);
router.get('/:id', getTreeById);
router.post('/', createTree);
router.post('/bulk', createBulkTrees);
router.put('/:id', updateTree);
router.post('/:id/images', upload.single('image'), addTreeImage);
router.post('/reassign', authMiddleware, reassignTrees);
router.get('/owner/:userId', authMiddleware, getTreesByOwner);
router.put('/:id/archive', authMiddleware, archiveTree);
router.put('/:id/restore', authMiddleware, restoreTree);

module.exports = router;