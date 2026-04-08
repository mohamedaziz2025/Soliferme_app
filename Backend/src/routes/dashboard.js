const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { Tree, User } = require('../models/schema');

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const toValidDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const buildMonthlyGrowth = (trees, months = 6) => {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, index) => {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    return {
      year: bucketDate.getFullYear(),
      month: bucketDate.getMonth(),
      label: MONTH_LABELS[bucketDate.getMonth()],
    };
  });

  const data = buckets.map(() => 0);

  trees.forEach((tree) => {
    const updatedAt = toValidDate(tree.lastUpdate || tree.updatedAt || tree.createdAt);
    if (!updatedAt) return;

    const bucketIndex = buckets.findIndex(
      (bucket) => bucket.year === updatedAt.getFullYear() && bucket.month === updatedAt.getMonth()
    );

    if (bucketIndex >= 0) {
      data[bucketIndex] += 1;
    }
  });

  return {
    labels: buckets.map((bucket) => bucket.label),
    data,
  };
};

const buildHealthDistribution = (healthy, warning, critical, total) => {
  if (!total) {
    return [
      { status: 'excellent', percentage: 0 },
      { status: 'moyen', percentage: 0 },
      { status: 'mauvais', percentage: 0 },
    ];
  }

  return [
    { status: 'excellent', percentage: Math.round((healthy / total) * 100) },
    { status: 'moyen', percentage: Math.round((warning / total) * 100) },
    { status: 'mauvais', percentage: Math.round((critical / total) * 100) },
  ];
};

const buildRecentActivities = (trees, limit = 5) => {
  return trees
    .slice()
    .sort((a, b) => {
      const aDate = toValidDate(a.lastUpdate || a.updatedAt || a.createdAt)?.getTime() || 0;
      const bDate = toValidDate(b.lastUpdate || b.updatedAt || b.createdAt)?.getTime() || 0;
      return bDate - aDate;
    })
    .slice(0, limit)
    .map((tree) => {
      const updatedAt = toValidDate(tree.lastUpdate || tree.updatedAt || tree.createdAt);
      const treeLabel = tree.treeId || tree.treeType || 'Arbre';
      const statusLabel = tree.status || 'healthy';

      return {
        title: `Mise a jour ${treeLabel}`,
        description: `Statut actuel: ${statusLabel}`,
        time: updatedAt ? updatedAt.toISOString() : 'recent',
      };
    });
};

const isTreeDataComplete = (tree) => {
  const hasType = Boolean(tree.treeType);
  const hasOwnerName = Boolean(tree.ownerInfo?.firstName || tree.ownerInfo?.lastName);
  const hasHeight = tree.measurements?.height !== null && tree.measurements?.height !== undefined;
  const hasLocation =
    tree.location?.latitude !== null &&
    tree.location?.latitude !== undefined &&
    tree.location?.longitude !== null &&
    tree.location?.longitude !== undefined;

  return hasType && hasOwnerName && hasHeight && hasLocation;
};

// Route pour récupérer toutes les données du dashboard
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user.role;

    const activeTreeFilter = [
      { isArchived: false },
      { isArchived: { $exists: false } },
    ];

    let treeQuery;
    if (userRole === 'admin') {
      treeQuery = { $or: activeTreeFilter };
    } else {
      treeQuery = {
        $and: [
          { $or: activeTreeFilter },
          {
            $or: [
              { ownerId: req.user.userId },
              { 'ownerInfo.email': req.user.email },
            ],
          },
        ],
      };
    }

    const trees = await Tree.find(treeQuery);

    const healthyCount = trees.filter((tree) => tree.status === 'healthy').length;
    const warningCount = trees.filter((tree) => tree.status === 'warning').length;
    const criticalCount = trees.filter((tree) => tree.status === 'critical').length;
    const fruitsCount = trees.filter((tree) => tree.fruits?.present === true).length;

    // Calcul des statistiques des arbres
    const treeStats = {
      total: trees.length,
      healthy: healthyCount,
      warning: warningCount,
      critical: criticalCount,
      archived: trees.filter((tree) => tree.isArchived === true).length,
      withFruits: fruitsCount,
      treesWithFruits: fruitsCount,
    };

    // Calcul de la qualité des données (pour admin seulement)
    if (userRole === 'admin') {
      const completeDataTrees = trees.filter((tree) => isTreeDataComplete(tree));

      treeStats.complete = completeDataTrees.length;
      treeStats.incomplete = trees.length - completeDataTrees.length;
    }

    // Statistiques des utilisateurs (pour admin seulement)
    let userStats = { total: 0, admin: 0, user: 0 };
    if (userRole === 'admin') {
      const users = await User.find({});
      userStats = {
        total: users.length,
        admin: users.filter((user) => user.role === 'admin').length,
        user: users.filter((user) => user.role === 'user').length,
      };
    }

    const monthlyGrowth = buildMonthlyGrowth(trees);
    const healthDistribution = buildHealthDistribution(
      healthyCount,
      warningCount,
      criticalCount,
      trees.length
    );
    const recentActivities = buildRecentActivities(trees);

    res.json({
      trees: treeStats,
      users: userStats,
      monthlyGrowth,
      healthDistribution,
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
