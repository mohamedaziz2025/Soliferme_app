const { body, param, query } = require('express-validator');
const { logger } = require('../utils/logger');

// Validation des noms communs
const commonValidations = {
  language: body('language')
    .isIn(['fr', 'en', 'ar'])
    .withMessage('Langue non supportée'),
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La page doit être un nombre positif'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('La limite doit être entre 1 et 100')
  ],
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Date de début invalide'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Date de fin invalide')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate <= req.query.startDate) {
          throw new Error('La date de fin doit être postérieure à la date de début');
        }
        return true;
      })
  ]
};

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail()
    .custom(async (email) => {
      // Log de tentative d'inscription pour monitoring
      logger.info({
        type: 'registration_attempt',
        email: email
      });
      return true;
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[!@#$%^&*]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('language')
    .isIn(['fr', 'en', 'ar'])
    .withMessage('Langue non supportée')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

const treeValidation = [
  body('treeType')
    .trim()
    .notEmpty()
    .withMessage('Type d\'arbre requis')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le type d\'arbre doit faire entre 2 et 50 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s-]+$/)
    .withMessage('Le type d\'arbre ne peut contenir que des lettres, espaces et tirets'),
  body('location')
    .isObject()
    .withMessage('Location doit être un objet')
    .custom((value) => {
      if (!value.latitude || !value.longitude) {
        throw new Error('Latitude et longitude requises');
      }
      return true;
    }),
  body('measurements')
    .optional()
    .isObject()
    .withMessage('Measurements doit être un objet'),
  body('fruits')
    .optional()
    .isObject()
    .withMessage('Fruits doit être un objet')
];

const treeAnalysisValidation = [
  body('image')
    .notEmpty()
    .withMessage('Image requise'),
  body('analysisData')
    .isObject()
    .withMessage('Les données d\'analyse doivent être un objet')
    .custom((value) => {
      const requiredFields = ['healthScore', 'fruitCount', 'diseaseDetection'];
      const missingFields = requiredFields.filter(field => !(field in value));
      
      if (missingFields.length > 0) {
        throw new Error(`Champs requis manquants: ${missingFields.join(', ')}`);
      }
      
      if (typeof value.healthScore !== 'number' || value.healthScore < 0 || value.healthScore > 100) {
        throw new Error('Le score de santé doit être un nombre entre 0 et 100');
      }

      if (typeof value.fruitCount !== 'number' || value.fruitCount < 0) {
        throw new Error('Le nombre de fruits doit être un nombre positif');
      }

      return true;
    })
];

const userUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Mot de passe actuel requis pour les changements de sécurité'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une majuscule')
    .matches(/[a-z]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule')
    .matches(/[0-9]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un chiffre')
    .matches(/[!@#$%^&*]/)
    .withMessage('Le nouveau mot de passe doit contenir au moins un caractère spécial'),
  commonValidations.language
];

const searchValidation = [
  ...commonValidations.pagination,
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le terme de recherche doit contenir au moins 2 caractères'),
  query('type')
    .optional()
    .isIn(['tree', 'user', 'analysis'])
    .withMessage('Type de recherche invalide'),
  ...commonValidations.dateRange
];

const idValidation = param('id')
  .isMongoId()
  .withMessage('ID invalide');

module.exports = {
  registerValidation,
  loginValidation,
  treeValidation,
  treeAnalysisValidation,
  userUpdateValidation,
  searchValidation,
  idValidation,
  commonValidations
};
