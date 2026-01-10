const express = require('express');
const { Tree, User } = require('../models/schema');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/import/trees - Import batch d'arbres depuis CSV/XLSX
router.post('/trees', auth, async (req, res) => {
  try {
    const { trees } = req.body;
    
    if (!trees || !Array.isArray(trees)) {
      return res.status(400).json({ 
        message: 'Le format des données est invalide. Attendu: { trees: [...] }' 
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < trees.length; i++) {
      const treeData = trees[i];
      
      try {
        // Extraire les données de l'arbre
        const {
          treeId,
          treeType,
          ownerLastName,
          ownerFirstName,
          ownerEmail,
          location,
          measurements,
          fruits,
          status,
          lastUpdate,
          notes,
          isArchived
        } = treeData;

        // Validation des champs obligatoires
        if (!treeId) {
          throw new Error('treeId est obligatoire');
        }

        // Valider que treeId est un nombre de 3-9 chiffres
        const treeIdStr = String(treeId).trim();
        if (!/^\d{3,9}$/.test(treeIdStr)) {
          throw new Error(`treeId "${treeId}" doit être un nombre de 3 à 9 chiffres`);
        }

        if (!treeType || treeType === '') {
          throw new Error('treeType est obligatoire');
        }

        if (!location || !location.latitude || !location.longitude) {
          throw new Error('Les coordonnées GPS (latitude, longitude) sont obligatoires');
        }

        // Valider les coordonnées GPS
        const lat = parseFloat(location.latitude);
        const lon = parseFloat(location.longitude);
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          throw new Error(`Coordonnées GPS invalides: latitude=${lat}, longitude=${lon}`);
        }

        // Chercher un utilisateur existant par email si fourni
        let ownerId = null;
        let ownerInfo = null;

        if (ownerEmail) {
          const existingUser = await User.findOne({ email: ownerEmail });
          if (existingUser) {
            ownerId = existingUser._id;
            ownerInfo = {
              firstName: existingUser.name.split(' ')[0] || '',
              lastName: existingUser.name.split(' ').slice(1).join(' ') || '',
              email: existingUser.email
            };
          }
        }

        // Si pas d'utilisateur trouvé, utiliser les infos du CSV
        if (!ownerId) {
          // Chercher par nom si disponible
          if (ownerLastName || ownerFirstName) {
            const searchName = `${ownerFirstName || ''} ${ownerLastName || ''}`.trim();
            if (searchName) {
              const userByName = await User.findOne({
                name: { $regex: searchName, $options: 'i' }
              });
              if (userByName) {
                ownerId = userByName._id;
                ownerInfo = {
                  firstName: userByName.name.split(' ')[0] || '',
                  lastName: userByName.name.split(' ').slice(1).join(' ') || '',
                  email: userByName.email
                };
              }
            }
          }
        }

        // Si toujours pas d'utilisateur, créer un placeholder ou utiliser un admin par défaut
        if (!ownerId) {
          // Chercher un admin par défaut
          const adminUser = await User.findOne({ role: 'admin' });
          if (adminUser) {
            ownerId = adminUser._id;
            ownerInfo = {
              firstName: ownerLastName || ownerFirstName || 'Import',
              lastName: ownerFirstName ? ownerLastName || '' : 'Machine',
              email: adminUser.email
            };
          } else {
            throw new Error('Aucun utilisateur trouvé et aucun admin par défaut disponible');
          }
        }

        // Préparer les données de l'arbre
        const treePayload = {
          treeId,
          treeType: treeType === 'Non spécifié' ? 'Inconnu' : treeType,
          ownerId,
          ownerInfo,
          location: {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude)
          },
          measurements: {
            height: measurements?.height ? parseFloat(measurements.height) : undefined,
            width: measurements?.width ? parseFloat(measurements.width) : undefined,
            approximateShape: measurements?.approximateShape || undefined
          },
          fruits: {
            present: fruits?.present || false,
            estimatedQuantity: fruits?.estimatedQuantity ? parseInt(fruits.estimatedQuantity) : 0,
            lastAnalysisDate: fruits?.lastAnalysisDate ? new Date(fruits.lastAnalysisDate) : undefined
          },
          status: status || 'healthy',
          lastUpdate: lastUpdate ? new Date(lastUpdate) : new Date(),
          isArchived: isArchived || false
        };

        // Nettoyer les valeurs undefined
        Object.keys(treePayload.measurements).forEach(key => {
          if (treePayload.measurements[key] === undefined) {
            delete treePayload.measurements[key];
          }
        });

        Object.keys(treePayload.fruits).forEach(key => {
          if (treePayload.fruits[key] === undefined) {
            delete treePayload.fruits[key];
          }
        });

        // Chercher si l'arbre existe déjà par treeId
        let existingTree = await Tree.findOne({ treeId });

        if (existingTree) {
          // Mise à jour de l'arbre existant
          await Tree.findOneAndUpdate(
            { treeId },
            { $set: treePayload },
            { new: true, runValidators: true }
          );
          
          results.push({
            ligne: i + 1,
            treeId,
            action: 'updated',
            status: 'success',
            message: 'Arbre mis à jour avec succès'
          });
        } else {
          // Création d'un nouvel arbre
          const newTree = new Tree(treePayload);
          await newTree.save();
          
          results.push({
            ligne: i + 1,
            treeId,
            action: 'created',
            status: 'success',
            message: 'Nouvel arbre créé avec succès'
          });
        }

        successCount++;

      } catch (error) {
        errorCount++;
        results.push({
          ligne: i + 1,
          treeId: treeData.treeId || 'INCONNU',
          action: 'error',
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      message: `Import terminé: ${successCount} succès, ${errorCount} erreurs`,
      summary: {
        total: trees.length,
        success: successCount,
        errors: errorCount
      },
      details: results
    });

  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'import',
      error: error.message 
    });
  }
});

module.exports = router;
