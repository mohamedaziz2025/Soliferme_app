import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Chip,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit, Archive, Unarchive } from '@mui/icons-material';
import axios from 'axios';
import EditTreeForm from '../components/EditTreeForm';
import { API_ENDPOINTS } from '../config/apiConfig';

interface Tree {
  _id: string;
  treeId: string;
  treeType: string;
  status: string;
  isArchived: boolean;
  ownerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  measurements?: {
    height?: number;
    width?: number;
    approximateShape?: string;
  };
  fruits?: {
    present?: boolean;
    estimatedQuantity?: number;
    lastAnalysisDate?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  lastUpdate: string;
}

const TreeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const isEditing = location.pathname.endsWith('/edit');
  const [error, setError] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role);
      setUserEmail(payload.email);
    }
  }, []);

  const fetchTreeDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_ENDPOINTS.TREES_LIST}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTree(response.data);
      setError('');
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching tree details:', error);
      if (error.response?.status === 404) {
        setError('Arbre non trouvé');
      } else if (error.response?.status === 403) {
        setError('Accès non autorisé à cet arbre');
      } else if (error.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter');
      } else {
        setError('Erreur lors du chargement des détails de l\'arbre');
      }
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTreeDetails();
  }, [fetchTreeDetails]);

  const handleTreeUpdated = () => {
    fetchTreeDetails();
    navigate(`/trees/${id}`); // Rediriger vers la vue détails après l'édition
  };

  const handleToggleEdit = useCallback(() => {
    if (!id) {
      return;
    }
    navigate(isEditing ? `/trees/${id}` : `/trees/${id}/edit`);
  }, [id, isEditing, navigate]);

  const handleArchive = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      await axios.put(
        `${API_ENDPOINTS.TREES_LIST}/${id}/archive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowArchiveDialog(false);
      setError('');
      fetchTreeDetails();
    } catch (error: any) {
      console.error('Error archiving tree:', error);
      if (error.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à archiver cet arbre');
      } else if (error.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter');
      } else {
        setError('Erreur lors de l\'archivage de l\'arbre');
      }
      setShowArchiveDialog(false);
    }
  };

  const handleRestore = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      await axios.put(
        `${API_ENDPOINTS.TREES_LIST}/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError('');
      fetchTreeDetails();
    } catch (error: any) {
      console.error('Error restoring tree:', error);
      if (error.response?.status === 403) {
        setError('Vous n\'êtes pas autorisé à restaurer cet arbre');
      } else if (error.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter');
      } else {
        setError('Erreur lors de la restauration de l\'arbre');
      }
    }
  };

  const canEdit = tree ? (userRole === 'admin' || userEmail === tree.ownerInfo.email) : false;
  const canEditTree = canEdit && !tree?.isArchived;

  if (loading) return <LinearProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!tree) return <Typography>Arbre non trouvé</Typography>;

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return 'Non spécifié';
    }
    if (typeof value === 'number' && Number.isNaN(value)) {
      return 'Non spécifié';
    }
    return String(value);
  };

  const formatNumberWithUnit = (value: number | null | undefined, unit: string) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'Non spécifié';
    }
    return `${value} ${unit}`;
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Non spécifié';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Non spécifié';
    }
    return date.toLocaleDateString();
  };

  const treeIdLabel = formatValue(tree.treeId);
  const treeTypeLabel = formatValue(tree.treeType);
  const statusLabel = formatValue(tree.status);
  const statusColor = tree.status === 'healthy'
    ? 'success'
    : tree.status === 'warning'
      ? 'warning'
      : tree.status === 'critical'
        ? 'error'
        : 'default';
  const fruitsPresence = tree.fruits?.present === undefined
    ? 'Non spécifié'
    : (tree.fruits.present ? 'Oui' : 'Non');
  const fruitsQuantity = tree.fruits?.present
    ? formatNumberWithUnit(tree.fruits.estimatedQuantity, 'fruits')
    : 'Non spécifié';
  const fruitsLastAnalysis = formatDate(tree.fruits?.lastAnalysisDate);
  const latitudeLabel = formatValue(tree.location?.latitude);
  const longitudeLabel = formatValue(tree.location?.longitude);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Arbre #{treeIdLabel}
          {tree.isArchived && (
            <Chip
              label="Archivé"
              color="default"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        {canEditTree && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              onClick={handleToggleEdit}
              sx={{ mr: 1 }}
            >
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Archive />}
              onClick={() => setShowArchiveDialog(true)}
            >
              Archiver
            </Button>
          </Box>
        )}
        {canEdit && tree.isArchived && (
          <Box>
            <Button
              variant="contained"
              color="success"
              startIcon={<Unarchive />}
              onClick={handleRestore}
            >
              Restaurer
            </Button>
          </Box>
        )}
      </Box>

      {isEditing && canEditTree ? (
        <EditTreeForm treeId={id!} onTreeUpdated={handleTreeUpdated} />
      ) : (
        <Grid container spacing={3}>
          {/* Informations principales */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Hauteur</Typography>
                  <Typography>{formatNumberWithUnit(tree.measurements?.height, 'm')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Largeur</Typography>
                  <Typography>{formatNumberWithUnit(tree.measurements?.width, 'm')}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Forme approximative</Typography>
                  <Typography>{formatValue(tree.measurements?.approximateShape)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Dernière mise à jour</Typography>
                  <Typography>{formatDate(tree.lastUpdate)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* État des fruits */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                État des fruits
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Présence de fruits</Typography>
                  <Typography>{fruitsPresence}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Quantité estimée</Typography>
                  <Typography>{fruitsQuantity}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Dernière analyse</Typography>
                  <Typography>{fruitsLastAnalysis}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Informations de localisation */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Localisation
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Latitude</Typography>
                  <Typography>{latitudeLabel}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Longitude</Typography>
                  <Typography>{longitudeLabel}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Type d'arbre</Typography>
                  <Typography>{treeTypeLabel}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Statut</Typography>
                  <Chip 
                    label={statusLabel}
                    color={statusColor}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Dialog open={showArchiveDialog} onClose={() => setShowArchiveDialog(false)}>
        <DialogTitle>Archiver l'arbre</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir archiver cet arbre ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowArchiveDialog(false)}>Annuler</Button>
          <Button onClick={handleArchive} color="warning" variant="contained">
            Archiver
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TreeDetails;


