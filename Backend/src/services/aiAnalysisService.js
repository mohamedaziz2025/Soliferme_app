/**
 * Service d'Analyse AI - Client Node.js pour le Service Python
 * Communication avec le serveur Flask AI (port 5001)
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class AIAnalysisService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://72.62.71.97:5001';
    this.timeout = 60000; // 60 secondes
    this.isHealthy = false;
    this.checkHealth();
  }

  /**
   * Vérifier la santé du service AI
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });
      this.isHealthy = response.data.status === 'ok';
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      console.warn('⚠️  Service AI non disponible, utilisation du mode fallback');
      return false;
    }
  }

  /**
   * Analyser une image d'arbre
   * @param {string} imagePath - Chemin vers l'image
   * @param {Object} options - Options d'analyse
   * @returns {Promise<Object>} Résultats de l'analyse
   */
  async analyzeTreeImage(imagePath, options = {}) {
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image introuvable: ${imagePath}`);
      }

      // Vérifier la santé du service
      await this.checkHealth();

      if (!this.isHealthy) {
        console.warn('Service AI indisponible, utilisation du fallback');
        return this._getMockAnalysis(imagePath);
      }

      // Préparer le formulaire multipart
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      
      if (options.treeType) {
        formData.append('tree_type', options.treeType);
      }
      
      if (options.gpsData) {
        formData.append('gps_data', JSON.stringify(options.gpsData));
      }

      // Appeler le service AI
      const response = await axios.post(
        `${this.aiServiceUrl}/analyze`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: this.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return response.data;

    } catch (error) {
      console.error('Erreur lors de l\'analyse AI:', error.message);
      
      // Fallback en cas d'erreur
      return this._getMockAnalysis(imagePath);
    }
  }

  /**
   * Analyse par lot de plusieurs images
   * @param {Array<string>} imagePaths - Chemins vers les images
   * @param {Object} options - Options d'analyse
   * @returns {Promise<Array>} Résultats des analyses
   */
  async batchAnalyze(imagePaths, options = {}) {
    try {
      await this.checkHealth();

      if (!this.isHealthy) {
        return imagePaths.map(path => this._getMockAnalysis(path));
      }

      const formData = new FormData();
      
      imagePaths.forEach((imagePath, index) => {
        if (fs.existsSync(imagePath)) {
          formData.append('files', fs.createReadStream(imagePath));
        }
      });

      if (options.treeType) {
        formData.append('tree_type', options.treeType);
      }

      const response = await axios.post(
        `${this.aiServiceUrl}/batch-analyze`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: this.timeout * 2,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      return response.data.results || [];

    } catch (error) {
      console.error('Erreur lors de l\'analyse par lot:', error.message);
      return imagePaths.map(path => this._getMockAnalysis(path));
    }
  }

  /**
   * Analyse de fallback basique (utilisée quand le service AI est indisponible)
   * @private
   */
  _getMockAnalysis(imagePath) {
    const fileName = path.basename(imagePath).toLowerCase();
    
    // Analyse basique basée sur le nom de fichier ou données par défaut
    let diseases = [];
    let healthScore = 75;

    // Simulation de détection basée sur des mots-clés dans le nom
    if (fileName.includes('disease') || fileName.includes('sick')) {
      diseases.push({
        name: 'Maladie détectée',
        confidence: 65,
        severity: 'medium',
        affectedArea: 25,
        recommendations: [
          'Inspection visuelle recommandée',
          'Surveillance régulière nécessaire'
        ]
      });
      healthScore = 55;
    }

    return {
      success: true,
      mode: 'fallback',
      diseaseDetection: {
        detected: diseases.length > 0,
        diseases: diseases,
        overallHealthScore: healthScore
      },
      treeAnalysis: {
        species: 'Non identifié',
        estimatedAge: 'Non estimé',
        foliageDensity: 70,
        structuralIntegrity: 80,
        growthIndicators: {
          newGrowth: true,
          leafColor: 'green',
          branchHealth: 'good'
        }
      }
    };
  }
}

// Singleton instance
const aiAnalysisService = new AIAnalysisService();

module.exports = aiAnalysisService;

