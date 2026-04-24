const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AIServiceError extends Error {
  constructor(message, {
    code = 'AI_SERVICE_ERROR',
    statusCode = 502,
    details,
  } = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class AIAnalysisService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';
    this.timeout = Number(process.env.AI_SERVICE_TIMEOUT_MS || 30000);
    this.healthPath = process.env.AI_SERVICE_HEALTH_PATH || '/health';
    this.analyzePath = process.env.AI_SERVICE_ANALYZE_PATH || '/api/v1/analyze';
    this.batchAnalyzePath = process.env.AI_SERVICE_BATCH_ANALYZE_PATH || '/api/v1/batch-analyze';
  }

  _buildUrl(path) {
    const base = this.aiServiceUrl.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  _normalizeAnalysisPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new AIServiceError('Reponse IA invalide', {
        code: 'AI_INVALID_RESPONSE',
        statusCode: 502,
      });
    }

    if (payload.success === false) {
      throw new AIServiceError(payload.error || 'Le service IA a retourne une erreur', {
        code: 'AI_INFERENCE_FAILED',
        statusCode: 502,
        details: payload,
      });
    }

    const diseaseDetection = payload.diseaseDetection && typeof payload.diseaseDetection === 'object'
      ? payload.diseaseDetection
      : {
          detected: false,
          diseases: [],
          overallHealthScore: 0,
        };

    const treeAnalysis = payload.treeAnalysis && typeof payload.treeAnalysis === 'object'
      ? payload.treeAnalysis
      : {};

    const metadata = payload.metadata && typeof payload.metadata === 'object'
      ? payload.metadata
      : {};

    return {
      success: true,
      diseaseDetection,
      treeAnalysis,
      metadata,
    };
  }

  /**
   * Analyse une image d'arbre avec l'AI
   * @param {string} imagePath - Chemin vers l'image
   * @param {object} options - Options supplémentaires (tree_type, gps_data)
   * @returns {Promise<object>} Résultats de l'analyse
   */
  async analyzeTreeImage(imagePath, options = {}) {
    try {
      if (!imagePath || !fs.existsSync(imagePath)) {
        throw new AIServiceError('Image introuvable pour analyse IA', {
          code: 'AI_INPUT_IMAGE_MISSING',
          statusCode: 400,
        });
      }

      // Verifier que le service IA repond avant de lancer l'inference.
      const health = await this.checkHealth();
      if (!health.available) {
        throw new AIServiceError('Service IA indisponible', {
          code: 'AI_SERVICE_UNAVAILABLE',
          statusCode: 503,
          details: health,
        });
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(imagePath));
      
      if (options.tree_type) {
        form.append('tree_type', options.tree_type);
      }
      
      if (options.gps_data) {
        form.append('gps_data', JSON.stringify(options.gps_data));
      }

      if (options.measurements) {
        form.append('measurements', JSON.stringify(options.measurements));
      }

      const response = await axios.post(this._buildUrl(this.analyzePath), form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: this.timeout,
      });

      return this._normalizeAnalysisPayload(response.data);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error.response) {
        throw new AIServiceError('Le service IA a repondu avec une erreur', {
          code: 'AI_SERVICE_BAD_RESPONSE',
          statusCode: error.response.status || 502,
          details: error.response.data,
        });
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNABORTED') {
        throw new AIServiceError('Le service IA est injoignable', {
          code: 'AI_SERVICE_UNREACHABLE',
          statusCode: 503,
          details: { reason: error.code },
        });
      }

      throw new AIServiceError(`Erreur lors de l'analyse IA: ${error.message}`, {
        code: 'AI_SERVICE_REQUEST_FAILED',
        statusCode: 502,
      });
    }
  }

  /**
   * Vérifie si le service AI est disponible
   * @returns {Promise<{available: boolean, statusCode?: number, latencyMs?: number, error?: string}>}
   */
  async checkHealth() {
    const start = Date.now();

    try {
      const response = await axios.get(this._buildUrl(this.healthPath), {
        timeout: 5000,
      });

      return {
        available: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      const statusCode = error.response ? error.response.status : undefined;
      return {
        available: false,
        statusCode,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Analyse un lot d'images via le service IA distant.
   * @param {Array<string>} imagePaths
   * @returns {Promise<object>}
   */
  async batchAnalyze(imagePaths = []) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      throw new AIServiceError('Aucune image fournie pour l\'analyse en lot', {
        code: 'AI_BATCH_EMPTY_INPUT',
        statusCode: 400,
      });
    }

    const validImagePaths = imagePaths.filter((imagePath) => imagePath && fs.existsSync(imagePath));
    if (validImagePaths.length === 0) {
      throw new AIServiceError('Aucune image valide trouvee pour l\'analyse en lot', {
        code: 'AI_BATCH_NO_VALID_FILES',
        statusCode: 400,
      });
    }

    const health = await this.checkHealth();
    if (!health.available) {
      throw new AIServiceError('Service IA indisponible', {
        code: 'AI_SERVICE_UNAVAILABLE',
        statusCode: 503,
        details: health,
      });
    }

    const form = new FormData();
    validImagePaths.forEach((imagePath) => {
      form.append('files', fs.createReadStream(imagePath));
    });

    try {
      const response = await axios.post(this._buildUrl(this.batchAnalyzePath), form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: this.timeout * validImagePaths.length,
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new AIServiceError('Reponse IA invalide en batch', {
          code: 'AI_BATCH_INVALID_RESPONSE',
          statusCode: 502,
        });
      }

      if (response.data.success === false) {
        throw new AIServiceError(response.data.error || 'Echec de l\'analyse IA en lot', {
          code: 'AI_BATCH_FAILED',
          statusCode: 502,
          details: response.data,
        });
      }

      return response.data;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error.response) {
        throw new AIServiceError('Le service IA a repondu avec une erreur (batch)', {
          code: 'AI_BATCH_BAD_RESPONSE',
          statusCode: error.response.status || 502,
          details: error.response.data,
        });
      }

      throw new AIServiceError(`Erreur lors de l'analyse IA en lot: ${error.message}`, {
        code: 'AI_BATCH_REQUEST_FAILED',
        statusCode: 502,
      });
    }
  }
}

// Instance singleton
let aiServiceInstance = null;

function getAIAnalysisService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIAnalysisService();
  }
  return aiServiceInstance;
}

module.exports = {
  AIAnalysisService,
  AIServiceError,
  getAIAnalysisService,
};
