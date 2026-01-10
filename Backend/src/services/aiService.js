const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class AIAnalysisService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    this.timeout = 30000; // 30 secondes
  }

  /**
   * Analyse une image d'arbre avec l'AI
   * @param {string} imagePath - Chemin vers l'image
   * @param {object} options - Options supplémentaires (tree_type, gps_data)
   * @returns {Promise<object>} Résultats de l'analyse
   */
  async analyzeTreeImage(imagePath, options = {}) {
    try {
      // Vérifier si le service AI est disponible
      const isAvailable = await this.checkHealth();
      if (!isAvailable) {
        console.warn('Service AI non disponible, utilisation des données simulées');
        return this._getMockAnalysis();
      }

      // Préparer le formulaire
      const form = new FormData();
      form.append('file', fs.createReadStream(imagePath));
      
      if (options.tree_type) {
        form.append('tree_type', options.tree_type);
      }
      
      if (options.gps_data) {
        form.append('gps_data', JSON.stringify(options.gps_data));
      }

      // Envoyer la requête
      const response = await axios.post(`${this.aiServiceUrl}/analyze`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: this.timeout,
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'analyse AI:', error.message);
      
      // Retourner des données simulées en cas d'erreur
      return this._getMockAnalysis();
    }
  }

  /**
   * Vérifie si le service AI est disponible
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Service AI non disponible:', error.message);
      return false;
    }
  }

  /**
   * Analyse de plusieurs images en lot
   * @param {Array<string>} imagePaths - Chemins vers les images
   * @returns {Promise<object>}
   */
  async batchAnalyze(imagePaths) {
    try {
      const isAvailable = await this.checkHealth();
      if (!isAvailable) {
        console.warn('Service AI non disponible pour l\'analyse en lot');
        return {
          success: false,
          error: 'Service AI non disponible',
        };
      }

      const form = new FormData();
      imagePaths.forEach((path) => {
        form.append('files', fs.createReadStream(path));
      });

      const response = await axios.post(`${this.aiServiceUrl}/batch-analyze`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: this.timeout * imagePaths.length,
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'analyse en lot:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retourne une analyse simulée pour le développement
   * @private
   */
  _getMockAnalysis() {
    const diseases = [
      {
        name: 'Mildiou',
        confidence: 87.5,
        severity: 'medium',
        affectedArea: 'Feuilles supérieures',
        recommendations: [
          'Traiter avec un fongicide approprié',
          'Améliorer la circulation d\'air',
          'Éviter l\'arrosage des feuilles',
        ],
      },
      {
        name: 'Chlorose',
        confidence: 65.2,
        severity: 'low',
        affectedArea: 'Feuillage général',
        recommendations: [
          'Analyser le pH du sol',
          'Apporter des engrais riches en fer',
          'Vérifier le drainage',
        ],
      },
    ];

    const hasDisease = Math.random() > 0.3; // 70% de chance d'avoir une maladie

    return {
      success: true,
      diseaseDetection: {
        detected: hasDisease,
        diseases: hasDisease ? diseases : [],
        overallHealthScore: hasDisease ? 72 : 90,
      },
      treeAnalysis: {
        species: 'Olivier',
        estimatedAge: Math.floor(Math.random() * 15) + 5,
        foliageDensity: Math.floor(Math.random() * 30) + 70,
        structuralIntegrity: Math.floor(Math.random() * 20) + 80,
        growthIndicators: {
          newGrowth: Math.random() > 0.3,
          leafColor: 'Vert foncé',
          branchHealth: 'Bonne',
        },
      },
      metadata: {
        analysisMethod: 'mock_data',
        timestamp: new Date().toISOString(),
      },
    };
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
  getAIAnalysisService,
};
