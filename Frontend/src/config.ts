// Configuration de l'API
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://72.62.71.97:35000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  USERS: `${API_BASE_URL}/api/auth/users`,
  
  // Dashboard
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  
  // Trees
  TREES: `${API_BASE_URL}/api/trees`,
  
  // Analysis
  ANALYSIS: `${API_BASE_URL}/api/analysis`,
  ANALYSIS_HISTORY: `${API_BASE_URL}/api/analysis/history`,
};

export default API_BASE_URL;
