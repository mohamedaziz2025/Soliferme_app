/**
 * API Configuration Centralisée
 * Toutes les URLs API utilisent des variables d'environnement
 * Plus d'IPs codées en dur !
 */

// Configuration de base
const normalizeApiBaseUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
};

const inferApiBaseUrl = (): string => {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();
  if (configuredUrl) {
    return normalizeApiBaseUrl(configuredUrl);
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    return normalizeApiBaseUrl(`${protocol}//${hostname}:35000`);
  }

  return normalizeApiBaseUrl('http://localhost:35000');
};

export const API_BASE_URL = inferApiBaseUrl();

// Services internes
export const BACKEND_API = {
  BASE: API_BASE_URL,
  AUTH: `${API_BASE_URL}/api/auth`,
  TREES: `${API_BASE_URL}/api/trees`,
  ANALYSIS: `${API_BASE_URL}/api/analysis`,
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  IMPORT: `${API_BASE_URL}/api/import`,
  SYNC: `${API_BASE_URL}/api/sync`,
};

// Points d'accès API détaillés
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${BACKEND_API.AUTH}/login`,
  REGISTER: `${BACKEND_API.AUTH}/register`,
  LOGOUT: `${BACKEND_API.AUTH}/logout`,
  PROFILE: `${BACKEND_API.AUTH}/profile`,
  USERS: `${BACKEND_API.AUTH}/users`,

  // Trees Management
  TREES_LIST: `${BACKEND_API.TREES}`,
  TREE_DETAIL: (id: string) => `${BACKEND_API.TREES}/${id}`,
  TREE_CREATE: `${BACKEND_API.TREES}`,
  TREE_UPDATE: (id: string) => `${BACKEND_API.TREES}/${id}`,
  TREE_DELETE: (id: string) => `${BACKEND_API.TREES}/${id}`,
  TREE_BY_OWNER: (email: string) => `${BACKEND_API.TREES}/owner/${encodeURIComponent(email)}`,
  TREES_BULK_IMPORT: `${BACKEND_API.IMPORT}/trees`,
  TREES_REASSIGN: `${BACKEND_API.TREES}/reassign`,

  // Analysis
  ANALYSIS_CREATE: `${BACKEND_API.ANALYSIS}`,
  ANALYSIS_CREATE_WITH_GPS: `${BACKEND_API.ANALYSIS}/create-with-gps`,
  ANALYSIS_CREATE_WITH_AI: `${BACKEND_API.ANALYSIS}/create-with-ai`,
  ANALYSIS_DETAIL: (id: string) => `${BACKEND_API.ANALYSIS}/${id}`,
  ANALYSIS_HISTORY: `${BACKEND_API.ANALYSIS}/history`,
  ANALYSIS_BY_TREE: (treeId: string) => `${BACKEND_API.ANALYSIS}/tree/${treeId}`,

  // Dashboard
  DASHBOARD: `${BACKEND_API.DASHBOARD}`,
  DASHBOARD_STATS: `${BACKEND_API.DASHBOARD}/stats`,

  // Sync
  SYNC_PULL: `${BACKEND_API.SYNC}/pull`,
  SYNC_PUSH: `${BACKEND_API.SYNC}/push`,
};

// Configuration des délais d'attente HTTP
export const HTTP_CONFIG = {
  TIMEOUT: 30000, // 30 secondes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 seconde
};

/**
 * Obtenir l'URL de base du backend
 * Utile pour construire des URLs dynamiques
 */
export const getBackendUrl = (): string => {
  return API_BASE_URL;
};

/**
 * Vérifier si on est en mode développement local
 */
export const isLocalDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Vérifier si on est en mode Docker
 */
export const isDockerDeployment = (): boolean => {
  return API_BASE_URL.includes('soliferme-backend') || API_BASE_URL.includes('backend:');
};

/**
 * Vérifier si on est en production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export default API_BASE_URL;
