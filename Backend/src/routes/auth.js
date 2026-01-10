const express = require('express');
const { register, login, getAllUsers, createUser, updateUserRole, updateUserByAdmin, getProfile, updateProfile, archiveUser } = require('../controllers/authController');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.use(auth);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id', updateUserByAdmin);
router.put('/users/:id/archive', archiveUser);

module.exports = router;