const { RateLimiterMongo } = require('rate-limiter-flexible');
const { logger } = require('./logger');
const mongoose = require('mongoose');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      activeUsers: 0,
      syncOperations: 0,
      averageResponseTime: 0,
      lastMinuteRequests: [],
    };

    // Rate limiter pour la protection DDoS
    this.rateLimiter = new RateLimiterMongo({
      storeClient: mongoose.connection,
      keyPrefix: 'middleware',
      points: 100, // Nombre de requêtes
      duration: 60, // Par minute
    });

    setInterval(() => this.cleanupMetrics(), 60000); // Nettoyage toutes les minutes
  }

  // Middleware de monitoring
  createMonitoringMiddleware() {
    return async (req, res, next) => {
      const start = Date.now();
      
      try {
        // Vérification du rate limiting
        await this.rateLimiter.consume(req.ip);
        
        // Enregistrement de la requête
        this.metrics.requests++;
        this.metrics.lastMinuteRequests.push({
          timestamp: start,
          path: req.path,
          method: req.method,
        });

        // Tracking des utilisateurs actifs
        if (req.user) {
          this.updateActiveUsers(req.user.id);
        }

        // Intercepter la fin de la requête
        res.on('finish', () => {
          const duration = Date.now() - start;
          this.updateResponseTime(duration);

          if (res.statusCode >= 400) {
            this.metrics.errors++;
          }

          // Log pour monitoring
          logger.info({
            type: 'request_metrics',
            path: req.path,
            method: req.method,
            status: res.statusCode,
            duration,
            user: req.user ? req.user.id : 'anonymous',
          });
        });

        next();
      } catch (error) {
        if (error.remainingPoints) {
          // Rate limit atteint
          res.status(429).json({
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
            retryAfter: error.msBeforeNext / 1000,
          });
        } else {
          next(error);
        }
      }
    };
  }

  updateResponseTime(duration) {
    // Calcul de la moyenne mobile
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * 0.9) + (duration * 0.1);
  }

  updateActiveUsers(userId) {
    // TODO: Implémenter le tracking des utilisateurs actifs
    // avec Redis ou une autre solution de cache
  }

  cleanupMetrics() {
    const oneMinuteAgo = Date.now() - 60000;
    this.metrics.lastMinuteRequests = this.metrics.lastMinuteRequests
      .filter(req => req.timestamp > oneMinuteAgo);
  }

  getMetrics() {
    return {
      ...this.metrics,
      requestsPerMinute: this.metrics.lastMinuteRequests.length,
      timestamp: new Date().toISOString(),
    };
  }

  // Route pour exposer les métriques (protégée par authentification)
  getMetricsMiddleware() {
    return (req, res) => {
      if (req.user && req.user.role === 'admin') {
        res.json(this.getMetrics());
      } else {
        res.status(403).json({ message: 'Non autorisé' });
      }
    };
  }
}

module.exports = new MonitoringService();
