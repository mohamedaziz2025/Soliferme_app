const jwt = require('jsonwebtoken');
const { User } = require('../models/schema');

module.exports = async (req, res, next) => {
  try {
    // Vérifier si le header Authorization existe
    if (!req.headers.authorization) {
      return res.status(401).json({ 
        message: 'Token manquant. Veuillez vous authentifier.' 
      });
    }

    const authHeader = req.headers.authorization;
    
    // Vérifier le format du header
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Format d\'authentification invalide. Utilisez "Bearer <token>".' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Token vide. Veuillez vous authentifier.' 
      });
    }
    
    // Vérifier et décoder le token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expiré. Veuillez vous reconnecter.' 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Token invalide. Veuillez vous reconnecter.' 
        });
      }
      throw jwtError;
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findById(decodedToken.userId);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Utilisateur non trouvé. Veuillez vous reconnecter.' 
      });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      archived: user.archived
    };
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(401).json({ 
      message: 'Authentification échouée. Veuillez vous reconnecter.' 
    });
  }
};