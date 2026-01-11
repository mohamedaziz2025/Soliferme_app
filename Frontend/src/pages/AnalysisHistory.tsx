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
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  };
  createdBy?: {
    name: string;
    email: string;
  };
  notes?: string;
}

interface AnalysisStats {
  total: number;
  withDiseases: number;
  healthy: number;
  criticalCases: number;
}

const AnalysisHistoryPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [treeType, setTreeType] = useState('');
  const [severity, setSeverity] = useState('');

  useEffect(() => {
    fetchAnalysisHistory();
  }, [startDate, endDate, treeType, severity]);

  const fetchAnalysisHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (treeType) queryParams.append('treeType', treeType);
      if (severity) queryParams.append('severity', severity);

      const response = await fetch(
        `http://72.62.71.97:35000/api/analysis/history?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des analyses');
      }

      const data = await response.json();
      setAnalyses(data.analyses || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalysis = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedAnalysis(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Arbre ID', 'Type', 'Score Santé', 'Maladies', 'GPS'];
    const rows = analyses.map((analysis) => [
      format(new Date(analysis.date), 'dd/MM/yyyy HH:mm', { locale: fr }),
      analysis.treeId,
      analysis.treeAnalysis.species || 'N/A',
      `${analysis.diseaseDetection.overallHealthScore}%`,
      analysis.diseaseDetection.detected ? 'Oui' : 'Non',
      `${analysis.gpsData.latitude.toFixed(6)}, ${analysis.gpsData.longitude.toFixed(6)}`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analyses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
          Historique des Analyses
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consultez toutes les analyses effectuées sur les arbres
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Total Analyses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {stats.total}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, color: '#1976d2', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Arbres Sains
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                      {stats.healthy}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 48, color: '#2e7d32', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Avec Maladies
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                      {stats.withDiseases}
                    </Typography>
                  </Box>
                  <WarningIcon sx={{ fontSize: 48, color: '#f57c00', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Cas Critiques
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#c62828' }}>
                      {stats.criticalCases}
                    </Typography>
                  </Box>
                  <ErrorIcon sx={{ fontSize: 48, color: '#c62828', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1, color: '#2e7d32' }} />
          <Typography variant="h6">Filtres</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Date de début"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Date de fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Sévérité"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="low">Faible</MenuItem>
              <MenuItem value="medium">Moyen</MenuItem>
              <MenuItem value="high">Élevé</MenuItem>
              <MenuItem value="critical">Critique</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              sx={{ height: '56px' }}
            >
              Exporter CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Analysis Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Arbre ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Score Santé</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Maladies</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>GPS</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Analyste</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">Aucune analyse trouvée</Typography>
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((analysis) => (
                <TableRow key={analysis._id} hover>
                  <TableCell>
                    {format(new Date(analysis.date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Chip label={analysis.treeId} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{analysis.treeAnalysis.species || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: getHealthScoreColor(analysis.diseaseDetection.overallHealthScore),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                        }}
                      >
                        {analysis.diseaseDetection.overallHealthScore}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {analysis.diseaseDetection.detected ? (
                      <Chip
                        label={`${analysis.diseaseDetection.diseases.length} détectée(s)`}
                        color="warning"
                        size="small"
                      />
                    ) : (
                      <Chip label="Aucune" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {analysis.gpsData.latitude.toFixed(6)},
                      <br />
                      {analysis.gpsData.longitude.toFixed(6)}
                    </Typography>
                  </TableCell>
                  <TableCell>{analysis.createdBy?.name || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleViewAnalysis(analysis)}
                      size="small"
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Analysis Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedAnalysis && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Détails de l'Analyse</Typography>
                <Chip
                  label={`Score: ${selectedAnalysis.diseaseDetection.overallHealthScore}%`}
                  sx={{
                    bgcolor: getHealthScoreColor(selectedAnalysis.diseaseDetection.overallHealthScore),
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Informations Générales
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Date
                        </Typography>
                        <Typography variant="body1">
                          {format(new Date(selectedAnalysis.date), 'dd MMMM yyyy à HH:mm', {
                            locale: fr,
                          })}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Arbre ID
                        </Typography>
                        <Typography variant="body1">{selectedAnalysis.treeId}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Type d'arbre
                        </Typography>
                        <Typography variant="body1">
                          {selectedAnalysis.treeAnalysis.species || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Analyste
                        </Typography>
                        <Typography variant="body1">
                          {selectedAnalysis.createdBy?.name || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {selectedAnalysis.diseaseDetection.detected && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Maladies Détectées
                    </Typography>
                    {selectedAnalysis.diseaseDetection.diseases.map((disease, index) => (
                      <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6">{disease.name}</Typography>
                          <Chip
                            label={disease.severity.toUpperCase()}
                            color={getSeverityColor(disease.severity) as any}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Confiance: {disease.confidence.toFixed(1)}% | Zone affectée:{' '}
                          {disease.affectedArea}
                        </Typography>
                        {disease.recommendations.length > 0 && (
                          <>
                            <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold' }}>
                              Recommandations:
                            </Typography>
                            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                              {disease.recommendations.map((rec, idx) => (
                                <li key={idx}>
                                  <Typography variant="body2">{rec}</Typography>
                                </li>
                              ))}
                            </Box>
                          </>
                        )}
                      </Paper>
                    ))}
                  </Grid>
                )}

                {selectedAnalysis.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                      <Typography variant="body2">{selectedAnalysis.notes}</Typography>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Localisation GPS
                  </Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      Latitude: {selectedAnalysis.gpsData.latitude.toFixed(6)}
                      <br />
                      Longitude: {selectedAnalysis.gpsData.longitude.toFixed(6)}
                      {selectedAnalysis.gpsData.accuracy && (
                        <>
                          <br />
                          Précision: {selectedAnalysis.gpsData.accuracy.toFixed(2)}m
                        </>
                      )}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AnalysisHistoryPage;
