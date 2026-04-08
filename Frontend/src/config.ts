// Configuration de l'API
const inferApiBaseUrl = (): string => {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:35000`;
  }

  return 'http://localhost:35000';
};

export const API_BASE_URL = inferApiBaseUrl();

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
