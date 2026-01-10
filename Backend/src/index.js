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
const winston = require('winston');

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
const { User } = require('./models/schema');

const app = express();

// Middleware
// Security middlewares
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://votre-domaine.com' : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        language: 'fr'
      });
      
      await admin.save();
      console.log('Admin par défaut créé avec succès');
      console.log('Email: admin@fruitytrack.com');
      console.log('Mot de passe: Admin123!');
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
  }
}

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/fruitytrack?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.3.2', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  initializeAdmin(); // Initialise l'admin après la connexion
})
.catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and accessible from all network interfaces`);
});