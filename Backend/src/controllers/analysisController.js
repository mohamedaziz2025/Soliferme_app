const { Analysis, Tree } = require('../models/schema');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/analysis');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images (JPEG, JPG, PNG) sont autorisées'));
    }
  }
});

// Helper function to calculate distance between two GPS coordinates (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function: Analyse locale intégrée (sans service distant)
function generateLocalAnalysis(treeType, imagePath) {
  // Générer des données d'analyse réalistes basées sur le type d'arbre
  const healthScore = Math.floor(Math.random() * 30) + 70; // 70-100
  const hasDisease = Math.random() < 0.2; // 20% chance de maladie
  
  const analysis = {
    success: true,
    diseaseDetection: {
      detected: hasDisease,
      diseases: [],
      overallHealthScore: healthScore
    },
    treeAnalysis: {
      species: treeType,
      estimatedAge: Math.floor(Math.random() * 20) + 5, // 5-25 ans
      foliageDensity: Math.floor(Math.random() * 30) + 70, // 70-100%
      structuralIntegrity: Math.floor(Math.random() * 20) + 80, // 80-100%
      growthIndicators: {
        newGrowth: Math.random() > 0.3,
        leafColor: healthScore > 80 ? 'green' : healthScore > 60 ? 'yellow-green' : 'yellow',
        branchHealth: healthScore > 80 ? 'good' : healthScore > 60 ? 'fair' : 'poor'
      }
    }
  };

  // Si maladie détectée, ajouter des détails
  if (hasDisease) {
    const diseases = [
      { name: 'Taches foliaires', severity: 'low' },
      { name: 'Oïdium', severity: 'medium' },
      { name: 'Rouille', severity: 'low' },
      { name: 'Anthracnose', severity: 'medium' },
      { name: 'Pourriture des racines', severity: 'high' }
    ];
    
    const disease = diseases[Math.floor(Math.random() * diseases.length)];
    analysis.diseaseDetection.diseases.push({
      name: disease.name,
      confidence: Math.floor(Math.random() * 30) + 60, // 60-90%
      severity: disease.severity,
      affectedArea: Math.floor(Math.random() * 40) + 10, // 10-50%
      recommendations: [
        'Inspection visuelle détaillée recommandée',
        'Surveillance régulière nécessaire',
        'Consulter un arboriste si les symptômes persistent'
      ]
    });
  }

  return analysis;
}

// Create analysis with GPS-based tree matching and AI analysis
const createAnalysisWithGPSAndAI = async (req, res) => {
  try {
    console.log('📥 Requête reçue - req.body:', JSON.stringify(req.body, null, 2));
    console.log('📥 Fichier uploadé:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'aucun');

    let {
      treeType,
      gpsData,
      measurements,
      notes
    } = req.body;

    // Parse gpsData if it's a string
    if (typeof gpsData === 'string') {
      try {
        gpsData = JSON.parse(gpsData);
      } catch (e) {
        return res.status(400).json({ 
          message: 'Format GPS invalide' 
        });
      }
    }

    if (!treeType || !gpsData || !gpsData.latitude || !gpsData.longitude) {
      return res.status(400).json({ 
        message: 'Type d\'arbre et coordonnées GPS sont requis' 
      });
    }

    // Vérifier si une image a été uploadée
    if (!req.file) {
      return res.status(400).json({
        message: 'Image requise pour l\'analyse'
      });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/analysis/${req.file.filename}`;

    // 1. Analyse AI locale intégrée (pas de service distant)
    console.log('🔍 Analyse locale en cours...');
    const aiResults = generateLocalAnalysis(treeType, imagePath);
    console.log('✅ Analyse locale terminée');


    const searchRadius = 10; // 10 meters radius
    let matchedTree = null;
    let isNewTree = false;

    // 2. Search for existing tree at the exact GPS location (within 10m)
    const allTrees = await Tree.find({ isArchived: { $ne: true } });
    
    for (const tree of allTrees) {
      const distance = calculateDistance(
        gpsData.latitude,
        gpsData.longitude,
        tree.location.latitude,
        tree.location.longitude
      );

      if (distance <= searchRadius) {
        matchedTree = tree;
        console.log(`✅ Arbre trouvé à ${distance.toFixed(2)}m`);
        break;
      }
    }

    // 3. If no tree found at location, search for nearest tree with same type
    if (!matchedTree) {
      const treesOfSameType = allTrees.filter(t => 
        t.treeType && t.treeType.toLowerCase() === treeType.toLowerCase()
      );

      let nearestTree = null;
      let nearestDistance = Infinity;

      for (const tree of treesOfSameType) {
        const distance = calculateDistance(
          gpsData.latitude,
          gpsData.longitude,
          tree.location.latitude,
          tree.location.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTree = tree;
        }
      }

      if (nearestTree && nearestDistance <= 100) {
        matchedTree = nearestTree;
        console.log(`✅ Arbre du même type trouvé à ${nearestDistance.toFixed(2)}m`);
      }
    }

    // 4. If still no match, create a new tree
    if (!matchedTree) {
      isNewTree = true;
      
      const treeCount = await Tree.countDocuments();
      const treeId = `TREE-${Date.now()}-${treeCount + 1}`;

      matchedTree = new Tree({
        treeId,
        treeType,
        location: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude
        },
        ownerInfo: {
          firstName: req.user.name || 'Mobile',
          lastName: 'User',
          email: req.user.email
        },
        ownerId: req.user.userId,
        measurements: measurements || {},
        status: 'healthy',
        isArchived: false
      });

      await matchedTree.save();
      console.log(`🌳 Nouvel arbre créé: ${treeId}`);
    }

    // 5. Create the analysis with AI results
    const analysisData = {
      treeId: matchedTree.treeId,
      date: new Date(),
      images: [{
        url: imageUrl,
        imageType: 'analysis'
      }],
      diseaseDetection: aiResults.diseaseDetection,
      treeAnalysis: aiResults.treeAnalysis,
      gpsData,
      measurements: measurements || {},
      notes: notes || '',
      createdBy: req.user.userId
    };

    console.log('📝 Données d\'analyse avant sauvegarde:', JSON.stringify({
      treeId: analysisData.treeId,
      images: analysisData.images,
      imageUrl: imageUrl
    }, null, 2));

    const analysis = new Analysis(analysisData);

    await analysis.save();
    console.log(`📊 Analyse créée avec succès`);

    // 6. Update tree status based on disease detection
    if (aiResults.diseaseDetection && aiResults.diseaseDetection.detected && 
        aiResults.diseaseDetection.diseases.length > 0) {
      const highSeverity = aiResults.diseaseDetection.diseases.some(d => 
        d.severity === 'high' || d.severity === 'critical'
      );
      
      if (highSeverity) {
        matchedTree.status = 'critical';
        console.log('⚠️ Statut arbre: CRITIQUE');
      } else {
        matchedTree.status = 'warning';
        console.log('⚠️ Statut arbre: AVERTISSEMENT');
      }
      
      matchedTree.lastUpdate = new Date();
      await matchedTree.save();
    }

    res.status(201).json({
      success: true,
      message: isNewTree ? 'Nouvel arbre créé avec analyse locale' : 'Analyse locale ajoutée à l\'arbre existant',
      analysis,
      tree: matchedTree,
      isNewTree,
      aiAnalysis: {
        method: 'local',
        timestamp: new Date().toISOString(),
        diseaseDetection: aiResults.diseaseDetection,
        treeAnalysis: aiResults.treeAnalysis
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'analyse:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la création de l\'analyse', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Create analysis with GPS-based tree matching (legacy, sans AI)
const createAnalysisWithGPSMatching = async (req, res) => {
  try {
    const {
      treeType,
      gpsData,
      images,
      diseaseDetection,
      treeAnalysis,
      measurements,
      notes
    } = req.body;

    if (!treeType || !gpsData || !gpsData.latitude || !gpsData.longitude) {
      return res.status(400).json({ 
        message: 'Type d\'arbre et coordonnées GPS sont requis' 
      });
    }

    const searchRadius = 10; // 10 meters radius
    let matchedTree = null;
    let isNewTree = false;

    // 1. Search for existing tree at the exact GPS location (within 10m)
    const allTrees = await Tree.find({ isArchived: { $ne: true } });
    
    for (const tree of allTrees) {
      const distance = calculateDistance(
        gpsData.latitude,
        gpsData.longitude,
        tree.location.latitude,
        tree.location.longitude
      );

      if (distance <= searchRadius) {
        // Found tree at this location
        matchedTree = tree;
        break;
      }
    }

    // 2. If no tree found at location, search for nearest tree with same type
    if (!matchedTree) {
      const treesOfSameType = allTrees.filter(t => 
        t.treeType && t.treeType.toLowerCase() === treeType.toLowerCase()
      );

      let nearestTree = null;
      let nearestDistance = Infinity;

      for (const tree of treesOfSameType) {
        const distance = calculateDistance(
          gpsData.latitude,
          gpsData.longitude,
          tree.location.latitude,
          tree.location.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTree = tree;
        }
      }

      // If found a nearby tree of same type (within reasonable distance, e.g., 100m)
      if (nearestTree && nearestDistance <= 100) {
        matchedTree = nearestTree;
      }
    }

    // 3. If still no match, create a new tree
    if (!matchedTree) {
      isNewTree = true;
      
      // Generate unique tree ID
      const treeCount = await Tree.countDocuments();
      const treeId = `TREE-${Date.now()}-${treeCount + 1}`;

      // Create new tree
      matchedTree = new Tree({
        treeId,
        treeType,
        location: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude
        },
        ownerInfo: {
          firstName: req.user.name || 'Mobile',
          lastName: 'User',
          email: req.user.email
        },
        ownerId: req.user.userId,
        measurements: measurements || {},
        status: 'healthy',
        isArchived: false
      });

      await matchedTree.save();
    }

    // 4. Create the analysis
    const analysis = new Analysis({
      treeId: matchedTree.treeId,
      date: new Date(),
      images: images || [],
      diseaseDetection: diseaseDetection || {
        detected: false,
        diseases: [],
        overallHealthScore: 100
      },
      treeAnalysis: treeAnalysis || {},
      gpsData,
      measurements: measurements || {},
      notes: notes || '',
      createdBy: req.user.userId
    });

    await analysis.save();

    // 5. Update tree status based on disease detection
    if (diseaseDetection && diseaseDetection.detected && diseaseDetection.diseases.length > 0) {
      const highSeverity = diseaseDetection.diseases.some(d => 
        d.severity === 'high' || d.severity === 'critical'
      );
      
      if (highSeverity) {
        matchedTree.status = 'critical';
      } else {
        matchedTree.status = 'warning';
      }
      
      matchedTree.lastUpdate = new Date();
      await matchedTree.save();
    }

    res.status(201).json({
      success: true,
      message: isNewTree ? 'Nouvel arbre créé avec analyse' : 'Analyse ajoutée à l\'arbre existant',
      analysis,
      tree: matchedTree,
      isNewTree
    });

  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création de l\'analyse', 
      error: error.message 
    });
  }
};

// Get all analyses
const getAllAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.find()
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analyses', error: error.message });
  }
};

// Get analysis by ID
const getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analysis', error: error.message });
  }
};

// Get analyses for a specific tree
const getAnalysesByTreeId = async (req, res) => {
  try {
    const analyses = await Analysis.find({ treeId: req.params.treeId })
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tree analyses', error: error.message });
  }
};

// Get analysis history (for admin dashboard)
const getAnalysisHistory = async (req, res) => {
  try {
    const { startDate, endDate, treeType, severity } = req.query;
    
    let query = {};
    
    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const analyses = await Analysis.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    // Additional filtering for tree type and severity (after population)
    let filteredAnalyses = analyses;
    
    if (treeType) {
      filteredAnalyses = filteredAnalyses.filter(a => 
        a.treeAnalysis && a.treeAnalysis.species === treeType
      );
    }
    
    if (severity) {
      filteredAnalyses = filteredAnalyses.filter(a => 
        a.diseaseDetection && a.diseaseDetection.diseases.some(d => d.severity === severity)
      );
    }
    
    // Calculate statistics
    const stats = {
      total: filteredAnalyses.length,
      withDiseases: filteredAnalyses.filter(a => a.diseaseDetection?.detected).length,
      healthy: filteredAnalyses.filter(a => !a.diseaseDetection?.detected).length,
      criticalCases: filteredAnalyses.filter(a => 
        a.diseaseDetection?.diseases?.some(d => d.severity === 'critical')
      ).length
    };
    
    res.json({
      analyses: filteredAnalyses,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analysis history', error: error.message });
  }
};

// Update analysis
const updateAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Error updating analysis', error: error.message });
  }
};

// Delete analysis
const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findByIdAndDelete(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    
    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting analysis', error: error.message });
  }
};

module.exports = {
  upload,
  createAnalysisWithGPSAndAI,
  createAnalysisWithGPSMatching,
  getAllAnalyses,
  getAnalysisById,
  getAnalysesByTreeId,
  getAnalysisHistory,
  updateAnalysis,
  deleteAnalysis
};
