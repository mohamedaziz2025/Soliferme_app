/**
 * Legacy compatibility wrapper.
 *
 * Keeps old imports working while routing all AI calls through
 * the strict externalized AI service client.
 */

const { AIAnalysisService } = require('./aiService');

class LegacyAIAnalysisService extends AIAnalysisService {
  async analyzeTreeImage(imagePath, options = {}) {
    const normalizedOptions = {
      tree_type: options.tree_type || options.treeType,
      gps_data: options.gps_data || options.gpsData,
      measurements: options.measurements,
    };

    return super.analyzeTreeImage(imagePath, normalizedOptions);
  }
}

module.exports = new LegacyAIAnalysisService();
