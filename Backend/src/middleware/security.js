const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RateLimiterMongo } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

// Rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
});

// Plus strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 failed login attempts per hour
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard'
});

// MongoDB rate limiter for more precise control
const mongoRateLimiter = new RateLimiterMongo({
  storeClient: mongoose.connection,
  points: 10, // Number of points
  duration: 1, // Per second
});

module.exports = {
  securityMiddleware: [
    helmet(), // Sécurité générale
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    }),
  ],
  limiter,
  authLimiter,
  mongoRateLimiter
};
