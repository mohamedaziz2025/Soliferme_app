import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  Grid,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  styled,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  CloudUpload as CloudUploadIcon,
  GpsFixed as GpsFixedIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import axiosInstance from '../utils/axiosConfig';

const API_URL = 'http://72.62.71.97:35000/api';
const AI_SERVICE_URL = 'http://72.62.71.97:35002';

interface AnalysisResult {
  tree_type?: string;
  health_status?: string;
  diseases?: string[];
  recommendations?: string[];
  confidence?: number;
  detected_issues?: string[];
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  background: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const UploadBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: 16,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  background: alpha(theme.palette.primary.main, 0.05),
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.1),
    borderColor: theme.palette.primary.dark,
    transform: 'scale(1.02)',
  },
}));

const TreeAnalysisScreen: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [matchedTree, setMatchedTree] = useState<any>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [manualGPS, setManualGPS] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [treeType, setTreeType] = useState('');

  const steps = ['Photo', 'Localisation', 'Type d\'arbre', 'Analyse IA', 'Résultat'];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setActiveStep(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentPosition = useCallback(() => {
    setLoadingGPS(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      setLoadingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoadingGPS(false);
        setActiveStep(2);
      },
      (error) => {
        let errorMessage = 'Erreur lors de la récupération de la position GPS: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Autorisation refusée. Veuillez autoriser l\'accès à votre position dans les paramètres du navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Position indisponible. Vérifiez que votre GPS est activé.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Délai d\'attente dépassé. Réessayez.';
            break;
          default:
            errorMessage += error.message || 'Erreur inconnue';
        }
        setError(errorMessage);
        setLoadingGPS(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleManualGPSSubmit = () => {
    const lat = parseFloat(manualLatitude);
    const lng = parseFloat(manualLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Veuillez entrer des coordonnées GPS valides');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('La latitude doit être entre -90 et 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('La longitude doit être entre -180 et 180');
      return;
    }

    setGpsLocation({
      latitude: lat,
      longitude: lng,
      accuracy: 0,
    });
    setError(null);
    setActiveStep(2);
  };

  const analyzeImage = async () => {
    if (!selectedImage || !gpsLocation) {
      setError('Image ou localisation manquante');
      return;
    }

    if (!treeType || treeType.trim() === '') {
      setError('Type d\'arbre requis');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Vérifier si le token existe
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setAnalyzing(false);
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }

      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('treeType', treeType.trim());
      
      // Envoyer les données GPS au format attendu par le backend
      formData.append('gpsData', JSON.stringify({
        latitude: gpsLocation.latitude,
        longitude: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy || 0
      }));
      
      if (notes) {
        formData.append('notes', notes);
      }

      console.log('Envoi de l\'analyse avec token:', token ? 'présent' : 'absent');

      // Appel à l'API d'analyse
      const response = await axiosInstance.post(
        `/api/analysis/create-with-ai`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setAnalysisResult(response.data.aiAnalysis || {});
      setMatchedTree(response.data.tree || null);
      setActiveStep(3);
      setResultDialogOpen(true);
    } catch (err: any) {
      console.error('Erreur d\'analyse:', err.response || err);
      
      // Gestion spécifique des erreurs 401
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        // Supprimer le token invalide
        localStorage.removeItem('token');
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Erreur lors de l\'analyse');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setActiveStep(0);
    setSelectedImage(null);
    setImagePreview(null);
    setGpsLocation(null);
    setAnalysisResult(null);
    setMatchedTree(null);
    setNotes('');
    setTreeType('');
    setError(null);
    setResultDialogOpen(false);
  };

  const getHealthColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'sain':
        return 'success';
      case 'warning':
      case 'attention':
        return 'warning';
      case 'critical':
      case 'critique':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          gutterBottom
          sx={{
            background: 'linear-gradient(45deg, #00e676, #4caf50)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            mb: 3,
          }}
        >
          🔍 Analyse d'Arbre par IA
        </Typography>

        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          sx={{ mb: 4 }}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Étape 1: Capture d'image */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📸 Étape 1: Capture de l'image
              </Typography>

              {!imagePreview ? (
                <UploadBox
                  onClick={() => document.getElementById('image-input')?.click()}
                >
                  <PhotoCameraIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    Cliquez pour prendre une photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ou sélectionnez une image depuis votre appareil
                  </Typography>
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                </UploadBox>
              ) : (
                <Box>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={imagePreview}
                      alt="Preview"
                      sx={{ 
                        borderRadius: 2, 
                        maxHeight: 300,
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      onClick={resetAnalysis}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'background.paper' },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setActiveStep(0);
                      }}
                    >
                      Changer l'image
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </StyledCard>
        </Grid>

        {/* Étape 2: GPS */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📍 Étape 2: Localisation GPS
              </Typography>

              {!gpsLocation ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                    <Button
                      variant={!manualGPS ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setManualGPS(false)}
                      sx={{ borderRadius: 3 }}
                    >
                      Automatique
                    </Button>
                    <Button
                      variant={manualGPS ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setManualGPS(true)}
                      sx={{ borderRadius: 3 }}
                    >
                      Manuel
                    </Button>
                  </Box>

                  {!manualGPS ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <GpsFixedIcon 
                        sx={{ 
                          fontSize: 60, 
                          color: 'primary.main', 
                          mb: 2,
                          animation: loadingGPS ? 'pulse 1.5s ease-in-out infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.4 },
                            '100%': { opacity: 1 },
                          },
                        }} 
                      />
                      <Typography variant="body1" gutterBottom>
                        Obtenez votre position actuelle
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<GpsFixedIcon />}
                        onClick={getCurrentPosition}
                        disabled={loadingGPS || !selectedImage}
                        sx={{ mt: 2, borderRadius: 3 }}
                      >
                        {loadingGPS ? 'Localisation...' : 'Obtenir ma position'}
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ py: 2 }}>
                      <Typography variant="body2" gutterBottom sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Entrez manuellement les coordonnées GPS
                      </Typography>
                      <TextField
                        fullWidth
                        label="Latitude"
                        placeholder="Ex: 36.8065"
                        value={manualLatitude}
                        onChange={(e) => setManualLatitude(e.target.value)}
                        type="number"
                        inputProps={{ step: 'any' }}
                        sx={{ mb: 2 }}
                        helperText="Entre -90 et 90"
                      />
                      <TextField
                        fullWidth
                        label="Longitude"
                        placeholder="Ex: 10.1815"
                        value={manualLongitude}
                        onChange={(e) => setManualLongitude(e.target.value)}
                        type="number"
                        inputProps={{ step: 'any' }}
                        sx={{ mb: 2 }}
                        helperText="Entre -180 et 180"
                      />
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        onClick={handleManualGPSSubmit}
                        disabled={!selectedImage || !manualLatitude || !manualLongitude}
                        sx={{ borderRadius: 3 }}
                      >
                        Valider les coordonnées
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box>
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                    Position GPS obtenue avec succès
                  </Alert>
                  <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Latitude:</strong> {gpsLocation.latitude.toFixed(6)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Longitude:</strong> {gpsLocation.longitude.toFixed(6)}
                    </Typography>
                    {gpsLocation.accuracy && gpsLocation.accuracy > 0 && (
                      <Typography variant="body2">
                        <strong>Précision:</strong> ±{gpsLocation.accuracy.toFixed(0)}m
                      </Typography>
                    )}
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setGpsLocation(null);
                      setManualLatitude('');
                      setManualLongitude('');
                      setActiveStep(1);
                    }}
                    sx={{ mb: 2, borderRadius: 3 }}
                  >
                    Modifier la position
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={getCurrentPosition}
                    disabled={loadingGPS}
                    sx={{ mt: 2, borderRadius: 3 }}
                    fullWidth
                  >
                    Rafraîchir la position
                  </Button>
                </Box>
              )}
            </Box>
          </StyledCard>
        </Grid>

        {/* Étape 3: Type d'arbre */}
        <Grid item xs={12} md={6}>
          <StyledCard>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🌳 Étape 3: Type d'arbre
              </Typography>
              
              <TextField
                fullWidth
                label="Type d'arbre *"
                placeholder="Ex: Manguier, Oranger, Citronnier..."
                value={treeType}
                onChange={(e) => setTreeType(e.target.value)}
                disabled={!gpsLocation}
                required
                sx={{ mb: 2 }}
                helperText={!gpsLocation ? "Complétez d'abord la localisation GPS" : "Entrez le type d'arbre à analyser"}
              />

              {treeType && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Type d'arbre: {treeType}
                </Alert>
              )}
            </Box>
          </StyledCard>
        </Grid>

        {/* Notes et analyse */}
        <Grid item xs={12}>
          <StyledCard>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📝 Notes supplémentaires (optionnel)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Ajoutez des observations, notes ou contexte..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                  onClick={analyzeImage}
                  disabled={!selectedImage || !gpsLocation || !treeType || analyzing}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    background: 'linear-gradient(45deg, #00e676, #4caf50)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #66ffa6, #81c784)',
                    },
                  }}
                >
                  {analyzing ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={resetAnalysis}
                  sx={{ borderRadius: 3 }}
                >
                  Réinitialiser
                </Button>
              </Box>
            </Box>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Dialog des résultats */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3 }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(45deg, #00e676, #4caf50)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ mr: 1 }} />
            Résultats de l'analyse
          </Box>
          <IconButton onClick={() => setResultDialogOpen(false)} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {analysisResult && (
            <Grid container spacing={2}>
              {matchedTree && (
                <Grid item xs={12}>
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Arbre correspondant trouvé: <strong>{matchedTree.treeType}</strong> (ID: {matchedTree.treeId})
                  </Alert>
                </Grid>
              )}

              {analysisResult.tree_type && (
                <Grid item xs={12} sm={6}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Type d'arbre détecté
                    </Typography>
                    <Typography variant="h6">
                      {analysisResult.tree_type}
                    </Typography>
                  </Card>
                </Grid>
              )}

              {analysisResult.health_status && (
                <Grid item xs={12} sm={6}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      État de santé
                    </Typography>
                    <Chip
                      label={analysisResult.health_status}
                      color={getHealthColor(analysisResult.health_status)}
                      sx={{ mt: 1, borderRadius: 2 }}
                    />
                  </Card>
                </Grid>
              )}

              {analysisResult.confidence && (
                <Grid item xs={12}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Niveau de confiance
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <Box
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${analysisResult.confidence * 100}%`,
                              bgcolor: 'primary.main',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {(analysisResult.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              )}

              {analysisResult.diseases && analysisResult.diseases.length > 0 && (
                <Grid item xs={12}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Maladies détectées
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {analysisResult.diseases.map((disease, index) => (
                        <Chip key={index} label={disease} color="error" size="small" />
                      ))}
                    </Box>
                  </Card>
                </Grid>
              )}

              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <Grid item xs={12}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Recommandations
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                      {analysisResult.recommendations.map((rec, index) => (
                        <Typography component="li" variant="body2" key={index} sx={{ mb: 1 }}>
                          {rec}
                        </Typography>
                      ))}
                    </Box>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={resetAnalysis} variant="outlined" sx={{ borderRadius: 2 }}>
            Nouvelle analyse
          </Button>
          <Button
            onClick={() => {
              setResultDialogOpen(false);
              window.location.href = '/analysis-history';
            }}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Voir l'historique
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TreeAnalysisScreen;
