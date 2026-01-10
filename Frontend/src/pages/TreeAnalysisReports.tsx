import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  LocalHospital as LocalHospitalIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useParams } from 'react-router-dom';

interface Disease {
  name: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedArea: string;
  recommendations: string[];
}

interface Analysis {
  _id: string;
  treeId: string;
  date: string;
  gpsData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  diseaseDetection: {
    detected: boolean;
    diseases: Disease[];
    overallHealthScore: number;
  };
  treeAnalysis: {
    species: string;
    estimatedAge?: number;
    foliageDensity?: number;
    structuralIntegrity?: number;
    growthIndicators?: {
      newGrowth: boolean;
      leafColor: string;
      branchHealth: string;
    };
  };
  measurements?: {
    height?: number;
    width?: number;
    density?: number;
  };
  createdBy?: {
    name: string;
    email: string;
  };
  notes?: string;
}

interface TreeInfo {
  _id: string;
  treeId: string;
  treeType: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  ownerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const TreeAnalysisReportsPage: React.FC = () => {
  const { treeId } = useParams<{ treeId: string }>();
  const [tree, setTree] = useState<TreeInfo | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (treeId) {
      fetchTreeAndAnalyses();
    }
  }, [treeId]);

  const fetchTreeAndAnalyses = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Fetch tree info
      const treeResponse = await fetch(`http://localhost:5000/api/trees/${treeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!treeResponse.ok) {
        throw new Error('Erreur lors du chargement de l\'arbre');
      }

      const treeData = await treeResponse.json();
      setTree(treeData);

      // Fetch analyses for this tree
      const analysesResponse = await fetch(
        `http://localhost:5000/api/analysis/tree/${treeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!analysesResponse.ok) {
        throw new Error('Erreur lors du chargement des analyses');
      }

      const analysesData = await analysesResponse.json();
      setAnalyses(analysesData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'high':
        return '#f57c00';
      case 'medium':
        return '#fbc02d';
      case 'low':
        return '#388e3c';
      default:
        return '#9e9e9e';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateAverageHealth = () => {
    if (analyses.length === 0) return 0;
    const sum = analyses.reduce(
      (acc, analysis) => acc + analysis.diseaseDetection.overallHealthScore,
      0
    );
    return Math.round(sum / analyses.length);
  };

  const countDiseases = () => {
    return analyses.reduce(
      (acc, analysis) =>
        acc + (analysis.diseaseDetection.detected ? analysis.diseaseDetection.diseases.length : 0),
      0
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!tree) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">Arbre non trouvé</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              Rapports d'Analyse - {tree.treeId}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Historique complet des analyses pour cet arbre
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tree Information Card */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Informations de l'Arbre
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Type d'arbre
              </Typography>
              <Typography variant="h6">{tree.treeType}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Statut actuel
              </Typography>
              <Chip
                label={tree.status.toUpperCase()}
                color={getStatusColor(tree.status) as any}
                sx={{ mt: 0.5, fontWeight: 'bold' }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Propriétaire
              </Typography>
              <Typography variant="body1">
                {tree.ownerInfo.firstName} {tree.ownerInfo.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tree.ownerInfo.email}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <PlaceIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                Localisation GPS
              </Typography>
              <Typography variant="body1">
                Lat: {tree.location.latitude.toFixed(6)}
                <br />
                Long: {tree.location.longitude.toFixed(6)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Total Analyses
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {analyses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Santé Moyenne
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 'bold',
                    color: getHealthScoreColor(calculateAverageHealth()),
                  }}
                >
                  {calculateAverageHealth()}%
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={calculateAverageHealth()}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getHealthScoreColor(calculateAverageHealth()),
                      },
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Maladies Détectées (Total)
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                {countDiseases()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analysis Timeline */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          Historique des Analyses
        </Typography>

        {analyses.length === 0 ? (
          <Alert severity="info">Aucune analyse disponible pour cet arbre</Alert>
        ) : (
          analyses.map((analysis, index) => (
            <Accordion key={analysis._id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: getHealthScoreColor(analysis.diseaseDetection.overallHealthScore),
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                    }}
                  >
                    {analysis.diseaseDetection.overallHealthScore}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {format(new Date(analysis.date), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Par {analysis.createdBy?.name || 'Utilisateur'} •{' '}
                      {analysis.diseaseDetection.detected
                        ? `${analysis.diseaseDetection.diseases.length} maladie(s) détectée(s)`
                        : 'Aucune maladie'}
                    </Typography>
                  </Box>
                  <Box>
                    {analysis.diseaseDetection.detected ? (
                      <WarningIcon sx={{ color: '#f57c00', fontSize: 32 }} />
                    ) : (
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 32 }} />
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Divider sx={{ mb: 2 }} />

                {/* Disease Detection */}
                {analysis.diseaseDetection.detected && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <LocalHospitalIcon sx={{ color: '#f57c00' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Maladies Détectées
                      </Typography>
                    </Box>
                    {analysis.diseaseDetection.diseases.map((disease, idx) => (
                      <Paper
                        key={idx}
                        sx={{
                          p: 2,
                          mb: 2,
                          bgcolor: '#fafafa',
                          border: `2px solid ${getSeverityColor(disease.severity)}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {disease.name}
                          </Typography>
                          <Chip
                            label={`${disease.severity.toUpperCase()} - ${disease.confidence.toFixed(
                              1
                            )}%`}
                            sx={{
                              bgcolor: getSeverityColor(disease.severity),
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Zone affectée: {disease.affectedArea}
                        </Typography>
                        {disease.recommendations.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                              Recommandations:
                            </Typography>
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {disease.recommendations.map((rec, recIdx) => (
                                <li key={recIdx}>
                                  <Typography variant="body2">{rec}</Typography>
                                </li>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Tree Analysis */}
                {analysis.treeAnalysis && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      Analyse de l'Arbre
                    </Typography>
                    <Grid container spacing={2}>
                      {analysis.treeAnalysis.estimatedAge && (
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="body2" color="text.secondary">
                              Âge Estimé
                            </Typography>
                            <Typography variant="h6">
                              {analysis.treeAnalysis.estimatedAge} ans
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                      {analysis.treeAnalysis.foliageDensity && (
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="body2" color="text.secondary">
                              Densité du Feuillage
                            </Typography>
                            <Typography variant="h6">
                              {analysis.treeAnalysis.foliageDensity}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={analysis.treeAnalysis.foliageDensity}
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                      )}
                      {analysis.treeAnalysis.structuralIntegrity && (
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="body2" color="text.secondary">
                              Intégrité Structurelle
                            </Typography>
                            <Typography variant="h6">
                              {analysis.treeAnalysis.structuralIntegrity}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={analysis.treeAnalysis.structuralIntegrity}
                              sx={{ mt: 1 }}
                            />
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Notes */}
                {analysis.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Notes
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                      <Typography variant="body2">{analysis.notes}</Typography>
                    </Paper>
                  </Box>
                )}

                {/* GPS Data */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Localisation GPS de l'Analyse
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      Latitude: {analysis.gpsData.latitude.toFixed(6)} | Longitude:{' '}
                      {analysis.gpsData.longitude.toFixed(6)}
                      {analysis.gpsData.accuracy && ` | Précision: ${analysis.gpsData.accuracy.toFixed(2)}m`}
                    </Typography>
                  </Paper>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Paper>
    </Container>
  );
};

export default TreeAnalysisReportsPage;
