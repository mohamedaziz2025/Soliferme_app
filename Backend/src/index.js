require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { securityMiddleware, limiter } = require('./middleware/security');
const authRoutes = require('./routes/auth');
const treeRoutes = require('./routes/trees');
const analysisRoutes = require('./routes/analysis');
const dashboardRoutes = require('./routes/dashboard');
const importRoutes = require('./routes/import');
const syncRoutes = require('./routes/sync');
const winston = require('winston');
const { initProducer, disconnectProducer } = require('./services/eventBus');

// Configuration du logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'fruitytrack-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
const bcrypt = require('bcryptjs');
const { User, Tree } = require('./models/schema');

const app = express();

// Middleware
// Security middlewares
app.use(cors({
  origin: '*', // Accepter toutes les origines (mobile app, web, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(limiter);
app.use(securityMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trees', treeRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint for Docker and Kubernetes
app.get('/health', (req, res) => {
  // Check MongoDB connection
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = mongoState === 1 ? 'connected' : 'disconnected';
  
  if (mongoState === 1) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: mongoStatus,
        api: 'running'
      },
      version: process.env.APP_VERSION || '1.0.0'
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: mongoStatus,
        api: 'running'
      },
      version: process.env.APP_VERSION || '1.0.0'
    });
  }
});

// Fonction d'initialisation pour créer un admin par défaut
async function initializeAdmin() {
  try {
    const adminEmail = 'admin@fruitytrack.com';
    const defaultPassword = 'Admin123!';
    
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      adminUser = new User({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        language: 'fr'
      });
      
      await adminUser.save();
      console.log('Admin par défaut créé avec succès');
      console.log('Email: admin@fruitytrack.com');
      console.log('Mot de passe: Admin123!');
    }

    return adminUser;
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
    return null;
  }
}

async function initializeTestTrees(adminUser) {
  try {
    if (!adminUser) {
      console.warn('⚠️  Seeding des arbres de test ignoré: admin introuvable');
      return;
    }

    const testTrees = [
      {
        treeId: 'TEST-SERVER-001',
        treeType: 'Manguier',
        ownerId: adminUser._id,
        ownerInfo: {
          firstName: 'Admin',
          lastName: 'FruityTrack',
          email: adminUser.email
        },
        location: { latitude: 14.6928, longitude: -17.4467 },
        measurements: { height: 4.2, width: 175, approximateShape: 'ovale' },
        fruits: { present: true, estimatedQuantity: 28, lastAnalysisDate: new Date() },
        status: 'healthy',
        isArchived: false
      },
      {
        treeId: 'TEST-SERVER-002',
        treeType: 'Oranger',
        ownerId: adminUser._id,
        ownerInfo: {
          firstName: 'Admin',
          lastName: 'FruityTrack',
          email: adminUser.email
        },
        location: { latitude: 14.6951, longitude: -17.4559 },
        measurements: { height: 3.1, width: 142, approximateShape: 'ronde' },
        fruits: { present: true, estimatedQuantity: 16, lastAnalysisDate: new Date() },
        status: 'warning',
        isArchived: false
      },
      {
        treeId: 'TEST-SERVER-003',
        treeType: 'Citronnier',
        ownerId: adminUser._id,
        ownerInfo: {
          firstName: 'Admin',
          lastName: 'FruityTrack',
          email: adminUser.email
        },
        location: { latitude: 14.7012, longitude: -17.4622 },
        measurements: { height: 2.8, width: 125, approximateShape: 'conique' },
        fruits: { present: false, estimatedQuantity: 0, lastAnalysisDate: new Date() },
        status: 'critical',
        isArchived: false
      }
    ];

    let createdCount = 0;
    for (const tree of testTrees) {
      const existingTree = await Tree.findOne({ treeId: tree.treeId });
      if (!existingTree) {
        await Tree.create(tree);
        createdCount += 1;
      }
    }

    if (createdCount > 0) {
      console.log(`🌱 ${createdCount} arbre(s) de test créé(s) au démarrage`);
    } else {
      console.log('🌱 Arbres de test déjà présents, aucun ajout nécessaire');
    }
  } catch (error) {
    console.error('Erreur lors du seeding des arbres de test:', error);
  }
}

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://rfeki14_db_user:J69IGsnJOXCefkmY@cluster0.bxno01m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔌 Connecting to MongoDB Atlas...');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,  // 60 secondes pour Atlas
  connectTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  retryWrites: true,
  maxPoolSize: 10
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  initializeAdmin()
    .then((adminUser) => initializeTestTrees(adminUser));
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⏳ Will retry connection in background...');
});

// Gestion des événements de connexion
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and accessible from all network interfaces`);
  initProducer();
});

process.on('SIGINT', async () => {
  await disconnectProducer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectProducer();
  process.exit(0);
});
