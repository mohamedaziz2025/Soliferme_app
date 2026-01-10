const { User, Tree } = require('../models/schema');
const mongoose = require('mongoose');

// Helper: try to find a tree by its custom treeId first, then by Mongo _id when applicable
async function findTreeByParamId(id) {
  // Try by custom treeId (string identifiers like '54445')
  let tree = await Tree.findOne({ treeId: id }).populate({
    path: 'ownerId',
    select: 'name email language role createdAt'
  });

  // If not found and id looks like a Mongo ObjectId, try lookup by _id
  if (!tree && mongoose.Types.ObjectId.isValid(id)) {
    tree = await Tree.findById(id).populate({
      path: 'ownerId',
      select: 'name email language role createdAt'
    });
  }

  return tree;
}

// Get all trees
const getAllTrees = async (req, res) => {
  try {
    console.log('🔍 getAllTrees called, user role:', req.user.role);
    let query = {}; // Commencer sans filtre sur isArchived pour les anciens arbres
    
    if (req.user.role === 'admin') {
      // Admin peut voir tous les arbres
      if (req.query.showArchived !== 'true') {
        // Exclure les arbres explicitement archivés, mais inclure ceux sans le champ isArchived
        query.$or = [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ];
      }
      console.log('🔍 Admin query:', JSON.stringify(query));
    } else {
      // Users peuvent seulement voir leurs propres arbres
      // Pour les anciens arbres sans ownerInfo, on les ignore pour les utilisateurs normaux
      query['ownerInfo.email'] = req.user.email;
      query.$or = [
        { isArchived: false },
        { isArchived: { $exists: false } }
      ];
      console.log('🔍 User query:', JSON.stringify(query));
    }

    console.log('🔍 Executing query to MongoDB...');
    const trees = await Tree.find(query).populate({
      path: 'ownerId',
      select: 'name email language role createdAt'
    });

    console.log('🔍 Found trees:', trees.length);

    // Normaliser les données pour les arbres anciens
    const normalizedTrees = trees.map(tree => {
      const treeObj = tree.toObject();
      return {
        ...treeObj,
        treeType: treeObj.treeType || 'Non spécifié',
        ownerInfo: treeObj.ownerInfo || {
          firstName: 'Propriétaire',
          lastName: 'Non spécifié',
          email: 'non-specifie@example.com'
        },
        measurements: treeObj.measurements || {
          height: 0,
          width: 0,
          approximateShape: 'Non spécifiée'
        },
        fruits: treeObj.fruits || {
          present: false,
          estimatedQuantity: 0,
          lastAnalysisDate: new Date()
        },
        isArchived: treeObj.isArchived || false
      };
    });

    const stats = {
      total: normalizedTrees.length,
      healthy: normalizedTrees.filter(t => (t.status || 'healthy') === 'healthy').length,
      warning: normalizedTrees.filter(t => (t.status || 'healthy') === 'warning').length,
      critical: normalizedTrees.filter(t => (t.status || 'healthy') === 'critical').length,
      archived: normalizedTrees.filter(t => t.isArchived).length
    };

    console.log('🔍 Sending response with', normalizedTrees.length, 'trees and stats:', stats);
    res.json({ trees: normalizedTrees, stats });
  } catch (error) {
    console.error('❌ Error in getAllTrees:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single tree
const getTreeById = async (req, res) => {
  try {
    const tree = await findTreeByParamId(req.params.id);
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    // Normaliser les données pour les arbres anciens
    const treeObj = tree.toObject();
    const normalizedTree = {
      ...treeObj,
      treeType: treeObj.treeType || 'Non spécifié',
      ownerInfo: treeObj.ownerInfo || {
        firstName: 'Propriétaire',
        lastName: 'Non spécifié',
        email: 'non-specifie@example.com'
      },
      measurements: treeObj.measurements || {
        height: 0,
        width: 0,
        approximateShape: 'Non spécifiée'
      },
      fruits: treeObj.fruits || {
        present: false,
        estimatedQuantity: 0,
        lastAnalysisDate: new Date()
      },
      isArchived: treeObj.isArchived || false
    };

    // Vérifier si l'utilisateur est autorisé à voir cet arbre
    // Pour les admins, toujours autorisé
    // Pour les users, seulement leurs propres arbres (et on ignore les anciens arbres sans propriétaire)
    if (req.user.role !== 'admin') {
      const ownerEmail = normalizedTree.ownerInfo.email;
      if (ownerEmail === 'non-specifie@example.com' || ownerEmail !== req.user.email) {
        return res.status(403).json({ message: 'Accès non autorisé à cet arbre' });
      }
    }

    res.json(normalizedTree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new tree
const createTree = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Seuls les administrateurs peuvent ajouter des arbres' });
  }

  const tree = new Tree({
    treeId: req.body.treeId,
    treeType: req.body.treeType,
    ownerInfo: {
      firstName: req.body.owner.firstName,
      lastName: req.body.owner.lastName,
      email: req.body.owner.email
    },
    location: req.body.location,
    measurements: req.body.measurements,
    fruits: {
      present: req.body.fruits?.present || false,
      estimatedQuantity: req.body.fruits?.estimatedQuantity || 0,
      lastAnalysisDate: new Date()
    },
    status: req.body.status || 'healthy',
    isArchived: false
  });

  try {
    const user = await User.findOne({ email: req.body.owner.email });
    if (!user) {
      return res.status(404).json({ message: 'Propriétaire non trouvé' });
    }
    tree.ownerId = user._id;

    const newTree = await tree.save();
    res.status(201).json(newTree);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a tree
const updateTree = async (req, res) => {
  try {
  const tree = await findTreeByParamId(req.params.id);
    
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    // Vérifier les autorisations (avec vérification sécurisée pour les anciens arbres)
    if (req.user.role !== 'admin') {
      const ownerEmail = tree.ownerInfo?.email || 'non-specifie@example.com';
      if (ownerEmail === 'non-specifie@example.com' || ownerEmail !== req.user.email) {
        return res.status(403).json({ message: 'Accès non autorisé à cet arbre' });
      }
    }

    // Mettre à jour uniquement les champs autorisés
    if (req.body.location) tree.location = req.body.location;
    if (req.body.measurements) tree.measurements = req.body.measurements;
    if (req.body.fruits) {
      tree.fruits = {
        ...tree.fruits,
        ...req.body.fruits,
        lastAnalysisDate: new Date()
      };
    }
    if (req.body.status && req.body.status !== 'archived') tree.status = req.body.status;
    
    // Permettre uniquement aux admins de modifier les informations du propriétaire
    if (req.user.role === 'admin' && req.body.ownerInfo) {
      tree.ownerInfo = req.body.ownerInfo;
    }

    tree.lastUpdate = new Date();
    const updatedTree = await tree.save();
    res.json(updatedTree);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add an image to a tree
const addTreeImage = async (req, res) => {
  try {
  const tree = await findTreeByParamId(req.params.id);
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    const image = {
      url: req.body.url,
      date: new Date(),
      analysisResults: req.body.analysisResults
    };

    tree.images.push(image);
    const updatedTree = await tree.save();
    res.json(updatedTree);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get tree statistics
const getTreeStats = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'admin') {
      // Admin voit toutes les statistiques de la plateforme
      query = {
        $or: [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ]
      };
    } else {
      // Utilisateur voit seulement ses propres arbres
      query = {
        'ownerInfo.email': req.user.email,
        $or: [
          { isArchived: false },
          { isArchived: { $exists: false } }
        ]
      };
    }

    const allTrees = await Tree.find(query);
    
    // Normaliser les données pour les anciens arbres
    const normalizedTrees = allTrees.map(tree => {
      const treeObj = tree.toObject();
      return {
        ...treeObj,
        status: treeObj.status || 'healthy',
        fruits: treeObj.fruits || { present: false },
        isArchived: treeObj.isArchived || false
      };
    });
    
    const stats = {
      totalTrees: normalizedTrees.length,
      treesWithFruits: normalizedTrees.filter(tree => tree.fruits?.present).length,
      healthyTrees: normalizedTrees.filter(tree => tree.status === 'healthy').length,
      needsAttention: normalizedTrees.filter(tree => tree.status !== 'healthy' && tree.status !== 'archived').length,
      warningTrees: normalizedTrees.filter(tree => tree.status === 'warning').length,
      criticalTrees: normalizedTrees.filter(tree => tree.status === 'critical').length,
      archivedTrees: normalizedTrees.filter(tree => tree.isArchived).length,
      monthlyGrowth: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
        data: await calculateMonthlyGrowth(query),
      },
      healthDistribution: {
        labels: ['En bonne santé', 'À surveiller', 'Critique'],
        data: [
          normalizedTrees.filter(tree => tree.status === 'healthy').length,
          normalizedTrees.filter(tree => tree.status === 'warning').length,
          normalizedTrees.filter(tree => tree.status === 'critical').length,
        ],
      }
    };

    // Si admin, ajouter des statistiques globales supplémentaires
    if (req.user.role === 'admin') {
      const totalUsers = await User.countDocuments({ 
        $or: [
          { archived: { $ne: true } },
          { archived: { $exists: false } }
        ]
      });
      const totalAdmins = await User.countDocuments({ 
        role: 'admin',
        $or: [
          { archived: { $ne: true } },
          { archived: { $exists: false } }
        ]
      });
      const totalTreesEverCreated = await Tree.countDocuments({});
      const archivedTreesCount = await Tree.countDocuments({ isArchived: true });
      
      // Compter les arbres avec données incomplètes
      const incompleteDataTrees = normalizedTrees.filter(tree => {
        return (
          !tree.treeType || tree.treeType === 'Non spécifié' ||
          !tree.ownerInfo || 
          tree.ownerInfo.email === 'non-specifie@example.com' ||
          !tree.ownerInfo.firstName || tree.ownerInfo.firstName === 'Propriétaire' ||
          !tree.ownerInfo.lastName || tree.ownerInfo.lastName === 'Non spécifié' ||
          !tree.measurements ||
          tree.measurements.height === 0 ||
          tree.measurements.width === 0 ||
          !tree.measurements.approximateShape || tree.measurements.approximateShape === 'Non spécifiée'
        );
      }).length;
      
      stats.platformStats = {
        totalUsers,
        totalAdmins,
        regularUsers: totalUsers - totalAdmins,
        totalTreesEverCreated,
        archivedTrees: archivedTreesCount,
        incompleteDataTrees,
        completeDataTrees: normalizedTrees.length - incompleteDataTrees
      };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tree analytics
const getTreeAnalytics = async (req, res) => {
  try {
  const tree = await findTreeByParamId(req.params.id);
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    const analytics = {
      growthData: await calculateTreeGrowth(tree),
      fruitHistory: calculateFruitHistory(tree),
      healthHistory: calculateHealthHistory(tree),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trees by owner email
const getTreesByOwnerEmail = async (req, res) => {
  try {
    const email = req.params.email;
    
    // Only admins can view other users' trees
    if (req.user.role !== 'admin' && req.user.email !== email) {
      return res.status(403).json({ message: 'Non autorisé à voir les arbres de cet utilisateur' });
    }

    const trees = await Tree.find({ 
      'ownerInfo.email': email,
      isArchived: false 
    });

    const stats = {
      total: trees.length,
      healthy: trees.filter(t => t.status === 'healthy').length,
      warning: trees.filter(t => t.status === 'warning').length,
      critical: trees.filter(t => t.status === 'critical').length
    };

    res.json({ trees, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reassign trees from one user to another
const reassignTrees = async (req, res) => {
  try {
    const { fromUserId, toUserId, treeIds } = req.body;
    
    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: 'Destination user not found' });
    }

    const query = treeIds ? 
      { ownerId: fromUserId, treeId: { $in: treeIds } } : 
      { ownerId: fromUserId };

    const updateResult = await Tree.updateMany(query, {
      $set: {
        ownerId: toUserId,
        ownerInfo: {
          firstName: toUser.firstName,
          lastName: toUser.lastName,
          email: toUser.email
        }
      }
    });

    res.json({ 
      message: 'Trees reassigned successfully',
      modifiedCount: updateResult.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Archive a tree
const archiveTree = async (req, res) => {
  try {
    const tree = await findTreeByParamId(req.params.id);
    
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    // Only admin or tree owner can archive (avec vérification sécurisée)
    if (req.user.role !== 'admin') {
      const ownerEmail = tree.ownerInfo?.email || 'non-specifie@example.com';
      if (ownerEmail === 'non-specifie@example.com' || ownerEmail !== req.user.email) {
        return res.status(403).json({ message: 'Non autorisé à archiver cet arbre' });
      }
    }

    tree.isArchived = true;
    tree.archivedDate = new Date();
    tree.status = 'archived';
    await tree.save();

    res.json({ message: 'Arbre archivé avec succès', tree });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore a tree
const restoreTree = async (req, res) => {
  try {
    const tree = await findTreeByParamId(req.params.id);
    
    if (!tree) {
      return res.status(404).json({ message: 'Arbre non trouvé' });
    }

    // Only admin or tree owner can restore (avec vérification sécurisée)
    if (req.user.role !== 'admin') {
      const ownerEmail = tree.ownerInfo?.email || 'non-specifie@example.com';
      if (ownerEmail === 'non-specifie@example.com' || ownerEmail !== req.user.email) {
        return res.status(403).json({ message: 'Non autorisé à restaurer cet arbre' });
      }
    }

    tree.isArchived = false;
    tree.archivedDate = null;
    tree.status = 'healthy'; // Restaurer avec un statut sain par défaut
    await tree.save();

    res.json({ message: 'Arbre restauré avec succès', tree });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trees by owner
const getTreesByOwner = async (req, res) => {
  try {
    const userId = req.params.userId;
    const trees = await Tree.find({ ownerId: userId });
    res.json(trees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get trees with incomplete data (admin only)
const getIncompleteDataTrees = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const allTrees = await Tree.find({
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } }
      ]
    }).populate({
      path: 'ownerId',
      select: 'name email language role createdAt'
    });

    // Normaliser et filtrer les arbres avec données incomplètes
    const incompleteDataTrees = allTrees.filter(tree => {
      const treeObj = tree.toObject();
      const normalizedTree = {
        ...treeObj,
        treeType: treeObj.treeType || 'Non spécifié',
        ownerInfo: treeObj.ownerInfo || {
          firstName: 'Propriétaire',
          lastName: 'Non spécifié',
          email: 'non-specifie@example.com'
        },
        measurements: treeObj.measurements || {
          height: 0,
          width: 0,
          approximateShape: 'Non spécifiée'
        }
      };

      return (
        !normalizedTree.treeType || normalizedTree.treeType === 'Non spécifié' ||
        !normalizedTree.ownerInfo || 
        normalizedTree.ownerInfo.email === 'non-specifie@example.com' ||
        !normalizedTree.ownerInfo.firstName || normalizedTree.ownerInfo.firstName === 'Propriétaire' ||
        !normalizedTree.ownerInfo.lastName || normalizedTree.ownerInfo.lastName === 'Non spécifié' ||
        !normalizedTree.measurements ||
        normalizedTree.measurements.height === 0 ||
        normalizedTree.measurements.width === 0 ||
        !normalizedTree.measurements.approximateShape || normalizedTree.measurements.approximateShape === 'Non spécifiée'
      );
    }).map(tree => {
      const treeObj = tree.toObject();
      return {
        ...treeObj,
        treeType: treeObj.treeType || 'Non spécifié',
        ownerInfo: treeObj.ownerInfo || {
          firstName: 'Propriétaire',
          lastName: 'Non spécifié',
          email: 'non-specifie@example.com'
        },
        measurements: treeObj.measurements || {
          height: 0,
          width: 0,
          approximateShape: 'Non spécifiée'
        },
        fruits: treeObj.fruits || {
          present: false,
          estimatedQuantity: 0,
          lastAnalysisDate: new Date()
        },
        isArchived: treeObj.isArchived || false
      };
    });

    res.json({ 
      trees: incompleteDataTrees,
      count: incompleteDataTrees.length,
      message: `${incompleteDataTrees.length} arbres avec données incomplètes trouvés`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper functions for analytics
async function calculateMonthlyGrowth(treesQuery) {
  try {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
    const currentDate = new Date();
    const monthlyData = Array(6).fill(0);
    
    // Simuler des données de croissance réalistes basées sur le nombre d'arbres
    const trees = await Tree.find(treesQuery);
    const baseGrowth = Math.max(1, trees.length / 10); // Croissance de base
    
    for (let i = 0; i < 6; i++) {
      // Variation saisonnière : plus de croissance au printemps/été
      const seasonalFactor = [0.5, 0.7, 1.2, 1.5, 1.3, 1.0][i];
      monthlyData[i] = Math.round(baseGrowth * seasonalFactor * (0.8 + Math.random() * 0.4));
    }
    
    return monthlyData;
  } catch (error) {
    console.error('Error calculating monthly growth:', error);
    return [2, 3, 5, 7, 6, 4]; // Données par défaut
  }
}

function calculateFruitHistory(tree) {
  return tree.images
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(image => ({
      date: image.date,
      fruitCount: image.analysisResults.fruitCount,
    }));
}

function calculateHealthHistory(tree) {
  return tree.images
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(image => ({
      date: image.date,
      health: image.analysisResults.health,
    }));
}

async function calculateTreeGrowth(tree) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const growthHistory = await Tree.find({
    treeId: tree.treeId,
    'measurements.lastUpdate': { $gte: oneYearAgo }
  }).sort('measurements.lastUpdate');

  return growthHistory.map(record => ({
    date: record.measurements.lastUpdate,
    height: record.measurements.height,
    width: record.measurements.width,
  }));
}

// Create multiple trees at once
const createBulkTrees = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Seuls les administrateurs peuvent importer des arbres' });
  }

  try {
    const { trees } = req.body;

    if (!Array.isArray(trees) || trees.length === 0) {
      return res.status(400).json({ message: 'Aucun arbre à importer' });
    }

    // Nettoyer et valider les données
    const cleanedTrees = trees.map(tree => ({
      ...tree,
      treeType: (tree.treeType || '').trim(),
      ownerInfo: {
        firstName: (tree.ownerInfo?.firstName || '').trim(),
        lastName: (tree.ownerInfo?.lastName || '').trim(),
        email: (tree.ownerInfo?.email || '').trim().toLowerCase(),
      },
      location: {
        latitude: parseFloat(tree.location?.latitude) || 0,
        longitude: parseFloat(tree.location?.longitude) || 0,
      },
      measurements: {
        height: parseFloat(tree.measurements?.height) || 0,
        width: parseFloat(tree.measurements?.width) || 0,
        approximateShape: (tree.measurements?.approximateShape || '').trim(),
      },
      fruits: {
        present: Boolean(tree.fruits?.present),
        estimatedQuantity: parseInt(tree.fruits?.estimatedQuantity) || 0,
      }
    })).filter(tree => 
      tree.treeType && 
      tree.ownerInfo.email && 
      tree.location.latitude && 
      tree.location.longitude
    );

    if (cleanedTrees.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée valide à importer' });
    }

    // Vérifier et récupérer tous les utilisateurs
    const userEmails = [...new Set(cleanedTrees.map(tree => tree.ownerInfo.email))];
    const users = await User.find({ email: { $in: userEmails } });
    
    const emailToUserId = {};
    users.forEach(user => {
      emailToUserId[user.email] = user._id;
    });

    // Vérifier les utilisateurs manquants
    const missingEmails = userEmails.filter(email => !emailToUserId[email]);
    if (missingEmails.length > 0) {
      return res.status(400).json({
        message: 'Certains utilisateurs n\'existent pas',
        missingEmails
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: 0
    };

    // Traiter chaque arbre
    for (const tree of cleanedTrees) {
      try {
        // Vérifier si l'arbre existe déjà
        const existingTree = await Tree.findOne({ 
          $or: [
            { treeId: tree.treeId },
            {
              'location.latitude': tree.location.latitude,
              'location.longitude': tree.location.longitude,
              'ownerInfo.email': tree.ownerInfo.email
            }
          ]
        });

        if (existingTree) {
          // Mettre à jour l'arbre existant
          const updated = await Tree.findByIdAndUpdate(
            existingTree._id,
            {
              $set: {
                treeType: tree.treeType,
                ownerInfo: tree.ownerInfo,
                ownerId: emailToUserId[tree.ownerInfo.email],
                measurements: {
                  ...tree.measurements,
                  lastUpdate: new Date()
                },
                fruits: {
                  ...tree.fruits,
                  lastAnalysisDate: new Date()
                },
                lastUpdate: new Date()
              }
            },
            { new: true }
          );
          if (updated) results.updated++;
          else results.errors++;
        } else {
          // Créer un nouvel arbre
          const newTree = new Tree({
            treeId: tree.treeId || Math.random().toString(36).substr(2, 9),
            treeType: tree.treeType,
            ownerInfo: tree.ownerInfo,
            ownerId: emailToUserId[tree.ownerInfo.email],
            location: tree.location,
            measurements: {
              ...tree.measurements,
              lastUpdate: new Date()
            },
            fruits: {
              ...tree.fruits,
              lastAnalysisDate: new Date()
            },
            status: 'healthy',
            isArchived: false,
            lastUpdate: new Date()
          });
          await newTree.save();
          results.created++;
        }
      } catch (err) {
        console.error('Erreur lors du traitement d\'un arbre:', err);
        results.errors++;
      }
    }

    res.status(200).json({
      message: 'Importation terminée',
      results: {
        total: cleanedTrees.length,
        ...results
      }
    });
  } catch (error) {
    res.status(400).json({
      message: 'Erreur lors de l\'importation',
      error: error.message
    });
  }
};

module.exports = {
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
};