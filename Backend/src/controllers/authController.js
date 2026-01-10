const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/schema');

const register = async (req, res) => {
  try {
    const { email, password, name, language } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      language
    });

    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    console.log('DEBUG: Login attempt with data:', req.body); // Debug log
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    console.log('DEBUG: User found:', user ? 'Yes' : 'No'); // Debug log
    if (!user) {
      console.log('DEBUG: User not found for email:', email); // Debug log
      return res.status(401).json({ message: 'Authentification échouée' });
    }

    if (user.archived) {
      console.log('DEBUG: User is archived'); // Debug log
      return res.status(403).json({ message: 'Compte archivé. Veuillez contacter un administrateur.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('DEBUG: Password valid:', isValidPassword); // Debug log
    if (!isValidPassword) {
      console.log('DEBUG: Invalid password for user:', email); // Debug log
      return res.status(401).json({ message: 'Authentification échouée' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        archived: user.archived
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la connexion', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { email, password, name, role, language } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet utilisateur existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'user',
      language: language || 'fr'
    });

    await user.save();

    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur', error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, language, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Mettre à jour les champs de base
    user.name = name;
    user.language = language;

    // Si un nouveau mot de passe est fourni, le mettre à jour
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Le mot de passe actuel est requis' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }

      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    // Renvoyer l'utilisateur sans le mot de passe
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: error.message });
  }
};

const archiveUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Ne pas permettre l'archivage d'un admin
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Impossible d\'archiver un administrateur' });
    }

    user.archived = !user.archived;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'archivage de l\'utilisateur', error: error.message });
  }
};

// exports moved below (after updateUserByAdmin) to avoid referencing before initialization

// Mise à jour complète d'un utilisateur par un administrateur
const updateUserByAdmin = async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { email, name, role, language, archived, password } = req.body;

    const updates = {};

    if (email) {
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      updates.email = email;
    }

    if (name !== undefined) updates.name = name;

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }
      updates.role = role;
    }

    if (language !== undefined) {
      if (!['fr', 'en', 'ar'].includes(language)) {
        return res.status(400).json({ message: 'Langue invalide' });
      }
      updates.language = language;
    }

    if (archived !== undefined) updates.archived = archived;

    if (password) {
      updates.password = await bcrypt.hash(password, 12);
    }

    // Charger l'utilisateur cible pour vérifier certaines règles (ex: ne pas archiver un admin)
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Empêcher l'archivage d'un administrateur
    if (updates.archived && user.role === 'admin') {
      return res.status(400).json({ message: 'Impossible d\'archiver un administrateur' });
    }

    // Appliquer les mises à jour
    Object.keys(updates).forEach(k => {
      user[k] = updates[k];
    });

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'utilisateur", error: error.message });
  }
};

module.exports = {
  register,
  login,
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserByAdmin,
  getProfile,
  updateProfile,
  archiveUser
};