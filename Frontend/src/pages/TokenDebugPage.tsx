import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, Button, Alert, CircularProgress, Divider } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

interface TokenInfo {
  valid: boolean;
  decoded?: any;
  error?: string;
}

const TokenDebugPage: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [apiTest, setApiTest] = useState<{ success: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkToken = () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setTokenInfo({ valid: false, error: 'Aucun token trouvé' });
      return;
    }

    try {
      // Decode JWT token
      const parts = token.split('.');
      if (parts.length !== 3) {
        setTokenInfo({ valid: false, error: 'Format de token invalide' });
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp && payload.exp < now) {
        setTokenInfo({ 
          valid: false, 
          decoded: payload,
          error: 'Token expiré' 
        });
      } else {
        setTokenInfo({ valid: true, decoded: payload });
      }
    } catch (err) {
      setTokenInfo({ valid: false, error: 'Erreur lors du décodage du token' });
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setApiTest(null);

    try {
      // Test simple endpoint (dashboard)
      const response = await axiosInstance.get('/api/dashboard');
      setApiTest({ 
        success: true, 
        message: 'API accessible avec succès!' 
      });
    } catch (err: any) {
      setApiTest({ 
        success: false, 
        message: err.response?.data?.message || err.message || 'Erreur inconnue' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          🔍 Diagnostic d'authentification
        </Typography>
        
        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            État du token
          </Typography>
          
          {tokenInfo ? (
            <Box>
              <Alert 
                severity={tokenInfo.valid ? 'success' : 'error'}
                icon={tokenInfo.valid ? <CheckCircle /> : <ErrorIcon />}
              >
                {tokenInfo.valid ? 'Token valide' : tokenInfo.error}
              </Alert>

              {tokenInfo.decoded && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Informations du token:
                  </Typography>
                  <pre style={{ fontSize: '0.85rem', overflow: 'auto' }}>
                    {JSON.stringify(tokenInfo.decoded, null, 2)}
                  </pre>
                  
                  {tokenInfo.decoded.exp && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Expiration: {new Date(tokenInfo.decoded.exp * 1000).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            <CircularProgress />
          )}

          <Button 
            variant="outlined" 
            onClick={checkToken}
            sx={{ mt: 2 }}
          >
            Recharger le token
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Test d'accès API
          </Typography>
          
          {apiTest && (
            <Alert 
              severity={apiTest.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {apiTest.message}
            </Alert>
          )}

          <Button 
            variant="contained" 
            onClick={testAPI}
            disabled={loading || !tokenInfo?.valid}
          >
            {loading ? <CircularProgress size={24} /> : 'Tester l\'API'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Actions
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => {
                localStorage.removeItem('token');
                checkToken();
                setApiTest(null);
              }}
            >
              Supprimer le token
            </Button>
            
            <Button 
              variant="outlined"
              onClick={() => window.location.href = '/login'}
            >
              Aller à la connexion
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default TokenDebugPage;
