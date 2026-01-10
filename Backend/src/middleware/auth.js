const jwt = require('jsonwebtoken');
const { User } = require('../models/schema');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Authentication failed!');
    }
    
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decodedToken.userId);
    
    if (!user) {
      throw new Error('User not found!');
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
    return res.status(401).json({ message: 'Authentication failed!' });
  }
};