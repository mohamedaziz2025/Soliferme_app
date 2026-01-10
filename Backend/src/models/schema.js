const mongoose = require('mongoose');

// Schéma pour les arbres
const treeSchema = new mongoose.Schema({
  treeId: { type: String, required: true, unique: true },
  treeType: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true }
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  measurements: {
    height: Number,
    width: Number,
    approximateShape: String,
  },
  fruits: {
    present: Boolean,
    estimatedQuantity: Number,
    lastAnalysisDate: Date,
  },
  status: { type: String, enum: ['healthy', 'warning', 'critical', 'archived'], default: 'healthy' },
  lastUpdate: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false },
  archivedDate: { type: Date },
});

// Schéma pour les utilisateurs
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  language: { type: String, enum: ['fr', 'en', 'ar'], default: 'fr' },
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Schéma pour les analyses
const analysisSchema = new mongoose.Schema({
  treeId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  fruitCount: Number,
  treeHealth: String,
  images: [{
    url: String,
    type: String, // 'regular', 'infrared', etc.
  }],
  measurements: {
    height: Number,
    width: Number,
    density: Number,
  },
  // AI Analysis results
  diseaseDetection: {
    detected: { type: Boolean, default: false },
    diseases: [{
      name: String,
      confidence: Number, // 0-100
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      affectedArea: String,
      recommendations: [String]
    }],
    overallHealthScore: Number, // 0-100
  },
  treeAnalysis: {
    species: String,
    estimatedAge: Number,
    foliageDensity: Number, // 0-100
    structuralIntegrity: Number, // 0-100
    growthIndicators: {
      newGrowth: Boolean,
      leafColor: String,
      branchHealth: String,
    }
  },
  gpsData: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: Number,
    altitude: Number,
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = {
  Tree: mongoose.model('Tree', treeSchema),
  User: mongoose.model('User', userSchema),
  Analysis: mongoose.model('Analysis', analysisSchema),
};