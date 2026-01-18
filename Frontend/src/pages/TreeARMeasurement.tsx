import React, { useRef, useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  CameraAlt,
  Height,
  Straighten,
  SaveAlt,
  Info,
  Close,
  Refresh,
  CheckCircle,
  Square
} from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

interface MeasurementPoint {
  x: number;
  y: number;
  label: string;
}

interface TreeMeasurement {
  height: number;
  width: number;
  circumference?: number;
  timestamp: Date;
}

const TreeARMeasurement: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [measurements, setMeasurements] = useState<TreeMeasurement[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<Partial<TreeMeasurement>>({});
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [measurementMode, setMeasurementMode] = useState<'height' | 'width' | 'circumference'>('height');
  const [calibrationDistance, setCalibrationDistance] = useState<number>(2); // Distance en mètres
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [treeName, setTreeName] = useState('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(true);

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      console.error('Erreur caméra:', err);
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  };

  // Gérer le clic sur le canvas pour ajouter des points
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newPoint: MeasurementPoint = {
      x,
      y,
      label: measurementMode === 'height' 
        ? (measurementPoints.length === 0 ? 'Base' : 'Sommet')
        : (measurementPoints.length === 0 ? 'Début' : 'Fin')
    };

    const updatedPoints = [...measurementPoints, newPoint];
    setMeasurementPoints(updatedPoints);

    // Si on a 2 points, calculer la mesure
    if (updatedPoints.length === 2) {
      calculateMeasurement(updatedPoints);
    }

    // Dessiner les points
    drawPoints(updatedPoints);
  };

  // Calculer la mesure basée sur les points
  const calculateMeasurement = (points: MeasurementPoint[]) => {
    if (points.length !== 2) return;

    const [point1, point2] = points;
    
    // Calculer la distance en pixels
    const pixelDistance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );

    // Calibration basée sur la distance de référence
    // Cette formule est simplifiée. Dans un vrai système AR, on utiliserait
    // des algorithmes plus sophistiqués avec des marqueurs AR ou SLAM
    const pixelToMeterRatio = calibrationDistance / 100; // Approximation
    const realDistance = (pixelDistance * pixelToMeterRatio) / 10;

    const newMeasurement: Partial<TreeMeasurement> = { ...currentMeasurement };

    if (measurementMode === 'height') {
      newMeasurement.height = parseFloat(realDistance.toFixed(2));
      setSuccess(`Hauteur mesurée: ${newMeasurement.height}m`);
    } else if (measurementMode === 'width') {
      newMeasurement.width = parseFloat(realDistance.toFixed(2));
      setSuccess(`Largeur mesurée: ${newMeasurement.width}m`);
    } else if (measurementMode === 'circumference') {
      newMeasurement.circumference = parseFloat(realDistance.toFixed(2));
      setSuccess(`Circonférence mesurée: ${newMeasurement.circumference}m`);
    }

    setCurrentMeasurement(newMeasurement);
  };

  // Dessiner les points et les lignes sur le canvas
  const drawPoints = (points: MeasurementPoint[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner les points
    points.forEach((point, index) => {
      // Point
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#4CAF50';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(point.label, point.x + 12, point.y - 5);
    });

    // Dessiner la ligne si on a 2 points
    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Dessiner les flèches
      const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
      const arrowLength = 15;
      
      // Flèche au point 2
      ctx.beginPath();
      ctx.moveTo(points[1].x, points[1].y);
      ctx.lineTo(
        points[1].x - arrowLength * Math.cos(angle - Math.PI / 6),
        points[1].y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(points[1].x, points[1].y);
      ctx.lineTo(
        points[1].x - arrowLength * Math.cos(angle + Math.PI / 6),
        points[1].y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Réinitialiser la mesure actuelle
  const resetMeasurement = () => {
    setMeasurementPoints([]);
    setSuccess('');
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Changer le mode de mesure
  const changeMeasurementMode = (mode: 'height' | 'width' | 'circumference') => {
    setMeasurementMode(mode);
    resetMeasurement();
  };

  // Sauvegarder la mesure
  const saveMeasurement = async () => {
    if (!currentMeasurement.height && !currentMeasurement.width) {
      setError('Aucune mesure à enregistrer');
      return;
    }

    try {
      const measurementData = {
        name: treeName || 'Arbre sans nom',
        height: currentMeasurement.height,
        width: currentMeasurement.width,
        circumference: currentMeasurement.circumference,
        measurementDate: new Date().toISOString(),
        measurementMethod: 'AR'
      };

      const response = await axiosInstance.post('/trees', measurementData);
      
      setSuccess('Mesure enregistrée avec succès !');
      setMeasurements([...measurements, { 
        ...currentMeasurement as TreeMeasurement,
        timestamp: new Date()
      }]);
      
      // Réinitialiser
      setCurrentMeasurement({});
      setTreeName('');
      setShowSaveDialog(false);
      resetMeasurement();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement de la mesure');
      console.error('Erreur:', err);
    }
  };

  // Initialiser le canvas
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      });
    }
  }, [isStreaming]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📏 Mesure AR des Arbres
          </Typography>
          <IconButton onClick={() => setShowInstructions(true)} color="primary">
            <Info />
          </IconButton>
        </Box>

        {/* Instructions */}
        {showInstructions && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <IconButton size="small" onClick={() => setShowInstructions(false)}>
                <Close />
              </IconButton>
            }
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Instructions d'utilisation:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
              <li>Activez la caméra et positionnez-vous à environ {calibrationDistance}m de l'arbre</li>
              <li>Choisissez le type de mesure (hauteur, largeur ou circonférence)</li>
              <li>Cliquez sur deux points sur l'image pour effectuer la mesure</li>
              <li>La distance sera calculée automatiquement</li>
              <li>Enregistrez vos mesures pour les sauvegarder</li>
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Contrôles de calibration */}
        <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ⚙️ Calibration
            </Typography>
            <TextField
              label="Distance de calibration (mètres)"
              type="number"
              value={calibrationDistance}
              onChange={(e) => setCalibrationDistance(parseFloat(e.target.value) || 2)}
              inputProps={{ min: 0.5, max: 10, step: 0.5 }}
              size="small"
              fullWidth
              helperText="Distance approximative entre vous et l'arbre"
            />
          </CardContent>
        </Card>

        {/* Zone de caméra et canvas */}
        <Box sx={{ position: 'relative', mb: 3, bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              display: isStreaming ? 'block' : 'none',
              maxHeight: '600px'
            }}
            playsInline
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
              display: isStreaming ? 'block' : 'none'
            }}
          />
          {!isStreaming && (
            <Box
              sx={{
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <Typography variant="h6">
                Appuyez sur "Activer la caméra" pour commencer
              </Typography>
            </Box>
          )}
        </Box>

        {/* Contrôles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              fullWidth
              color={isStreaming ? 'error' : 'primary'}
              startIcon={isStreaming ? <Close /> : <CameraAlt />}
              onClick={isStreaming ? stopCamera : startCamera}
              size="large"
            >
              {isStreaming ? 'Arrêter la caméra' : 'Activer la caméra'}
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Refresh />}
              onClick={resetMeasurement}
              disabled={!isStreaming}
              size="large"
            >
              Réinitialiser
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              fullWidth
              color="success"
              startIcon={<SaveAlt />}
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentMeasurement.height && !currentMeasurement.width}
              size="large"
            >
              Enregistrer
            </Button>
          </Grid>
        </Grid>

        {/* Mode de mesure */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Type de mesure:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                variant={measurementMode === 'height' ? 'contained' : 'outlined'}
                fullWidth
                startIcon={<Height />}
                onClick={() => changeMeasurementMode('height')}
                disabled={!isStreaming}
              >
                Hauteur
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant={measurementMode === 'width' ? 'contained' : 'outlined'}
                fullWidth
                startIcon={<Straighten />}
                onClick={() => changeMeasurementMode('width')}
                disabled={!isStreaming}
              >
                Largeur
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant={measurementMode === 'circumference' ? 'contained' : 'outlined'}
                fullWidth
                startIcon={<Square />}
                onClick={() => changeMeasurementMode('circumference')}
                disabled={!isStreaming}
              >
                Circonférence
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Mesures actuelles */}
        {(currentMeasurement.height || currentMeasurement.width || currentMeasurement.circumference) && (
          <Card sx={{ mb: 3, bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                Mesures actuelles
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {currentMeasurement.height && (
                  <Grid item xs={12} sm={4}>
                    <Chip
                      icon={<Height />}
                      label={`Hauteur: ${currentMeasurement.height} m`}
                      color="success"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Grid>
                )}
                {currentMeasurement.width && (
                  <Grid item xs={12} sm={4}>
                    <Chip
                      icon={<Straighten />}
                      label={`Largeur: ${currentMeasurement.width} m`}
                      color="success"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Grid>
                )}
                {currentMeasurement.circumference && (
                  <Grid item xs={12} sm={4}>
                    <Chip
                      icon={<Square />}
                      label={`Circonférence: ${currentMeasurement.circumference} m`}
                      color="success"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Historique des mesures */}
        {measurements.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Historique des mesures
              </Typography>
              <Divider sx={{ my: 2 }} />
              {measurements.map((measurement, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {measurement.timestamp.toLocaleString()}
                  </Typography>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {measurement.height && (
                      <Grid item>
                        <Chip
                          size="small"
                          icon={<Height />}
                          label={`${measurement.height}m`}
                        />
                      </Grid>
                    )}
                    {measurement.width && (
                      <Grid item>
                        <Chip
                          size="small"
                          icon={<Straighten />}
                          label={`${measurement.width}m`}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* Dialog pour sauvegarder */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enregistrer la mesure</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de l'arbre (optionnel)"
            type="text"
            fullWidth
            value={treeName}
            onChange={(e) => setTreeName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Mesures à enregistrer:
            </Typography>
            {currentMeasurement.height && (
              <Typography variant="body1">• Hauteur: {currentMeasurement.height} m</Typography>
            )}
            {currentMeasurement.width && (
              <Typography variant="body1">• Largeur: {currentMeasurement.width} m</Typography>
            )}
            {currentMeasurement.circumference && (
              <Typography variant="body1">• Circonférence: {currentMeasurement.circumference} m</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Annuler</Button>
          <Button onClick={saveMeasurement} variant="contained" color="success">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TreeARMeasurement;
