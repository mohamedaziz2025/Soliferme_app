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
  const [isEditing, setIsEditing] = useState(location.pathname.endsWith('/edit'));
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

      const response = await axios.get(`http://localhost:5000/api/trees/${id}`, {
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
    setIsEditing(false);
    fetchTreeDetails();
    navigate(`/trees/${id}`); // Rediriger vers la vue détails après l'édition
  };

  const handleArchive = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      await axios.put(
        `http://localhost:5000/api/trees/${id}/archive`,
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
        `http://localhost:5000/api/trees/${id}/restore`,
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

  if (loading) return <LinearProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!tree) return <Typography>Arbre non trouvé</Typography>;

  const canEdit = userRole === 'admin' || userEmail === tree.ownerInfo.email;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Arbre #{tree.treeId}
          {tree.isArchived && (
            <Chip
              label="Archivé"
              color="default"
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        {canEdit && !tree.isArchived && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              onClick={() => setIsEditing(!isEditing)}
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

      {isEditing ? (
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
                  <Typography>{tree.measurements?.height ?? 'Non spécifié'} m</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Largeur</Typography>
                  <Typography>{tree.measurements?.width ?? 'Non spécifié'} m</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Forme approximative</Typography>
                  <Typography>{tree.measurements?.approximateShape ?? 'Non spécifiée'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Dernière mise à jour</Typography>
                  <Typography>{new Date(tree.lastUpdate).toLocaleDateString()}</Typography>
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
                  <Typography>{tree.fruits?.present ? 'Oui' : 'Non'}</Typography>
                </Grid>
                {tree.fruits?.present && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Quantité estimée</Typography>
                    <Typography>{tree.fruits?.estimatedQuantity || 0} fruits</Typography>
                  </Grid>
                )}
                {tree.fruits?.lastAnalysisDate && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Dernière analyse</Typography>
                    <Typography>
                      {new Date(tree.fruits.lastAnalysisDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
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
                  <Typography>{tree.location.latitude}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Longitude</Typography>
                  <Typography>{tree.location.longitude}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Type d'arbre</Typography>
                  <Typography>{tree.treeType}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Statut</Typography>
                  <Chip 
                    label={tree.status}
                    color={tree.status === 'healthy' ? 'success' : tree.status === 'warning' ? 'warning' : 'error'}
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