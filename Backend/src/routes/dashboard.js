const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { Tree, User } = require('../models/schema');

// Route pour récupérer toutes les données du dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Statistiques des arbres
    let treeQuery = {};
    if (userRole !== 'admin') {
      treeQuery = { 'ownerInfo.email': req.user.email };
    }

    const trees = await Tree.find(treeQuery);
    
    // Calcul des statistiques des arbres
    const treeStats = {
      total: trees.length,
      healthy: trees.filter(tree => tree.status === 'healthy').length,
      warning: trees.filter(tree => tree.status === 'warning').length,
      critical: trees.filter(tree => tree.status === 'critical').length,
      archived: trees.filter(tree => tree.isArchived === true).length,
    };

    // Calcul de la qualité des données (pour admin seulement)
    if (userRole === 'admin') {
      const completeDataTrees = trees.filter(tree => 
        tree.treeType && 
        (tree.ownerInfo?.firstName || tree.ownerInfo?.lastName) &&
        tree.measurements?.height &&
        tree.location?.latitude && tree.location?.longitude
      );
      
      treeStats.complete = completeDataTrees.length;
      treeStats.incomplete = trees.length - completeDataTrees.length;
    }

    // Statistiques des utilisateurs (pour admin seulement)
    let userStats = { total: 0, admin: 0, user: 0 };
    if (userRole === 'admin') {
      const users = await User.find({});
      userStats = {
        total: users.length,
        admin: users.filter(user => user.role === 'admin').length,
        user: users.filter(user => user.role === 'user').length,
      };
    }

    // Activités récentes (placeholder)
    const recentActivities = [];

    res.json({
      trees: treeStats,
      users: userStats,
      recentActivities
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des données du dashboard',
      error: error.message 
    });
  }
});

module.exports = router;
