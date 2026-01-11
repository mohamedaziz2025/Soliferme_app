import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Fab,
  Zoom,
  Tooltip,
  alpha,
  styled,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Forest as ForestIcon,
  LocationOn as LocationIcon,
  Height as HeightIcon,
  Spa as SpaIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://72.62.71.97:35000/api';

interface Tree {
  _id: string;
  treeId: string;
  treeType: string;
  status: 'healthy' | 'warning' | 'critical';
  location: {
    latitude: number;
    longitude: number;
  };
  measurements?: {
    height?: number;
    width?: number;
    approximateShape?: string;
  };
  fruits?: {
    present: boolean;
    estimatedQuantity?: number;
  };
  archived?: boolean;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  borderRadius: 16,
  background: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

const StatCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: 'white',
  borderRadius: 16,
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
  },
}));

const AdminTreeManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [trees, setTrees] = useState<Tree[]>([]);
  const [filteredTrees, setFilteredTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);

  useEffect(() => {
    loadTrees();
  }, []);

  useEffect(() => {
    filterTrees();
  }, [trees, searchQuery, statusFilter]);

  const loadTrees = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/trees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrees(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des arbres');
    } finally {
      setLoading(false);
    }
  };

  const filterTrees = () => {
    let filtered = [...trees];

    if (searchQuery) {
      filtered = filtered.filter(
        (tree) =>
          tree.treeType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tree.treeId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((tree) => tree.status === statusFilter);
    }

    setFilteredTrees(filtered);
  };

  const handleDeleteTree = async () => {
    if (!selectedTree) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/trees/${selectedTree._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteDialogOpen(false);
      loadTrees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleArchiveTree = async (treeId: string, currentArchived: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/trees/${treeId}/archive`,
        { archived: !currentArchived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadTrees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'archivage');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'critical':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      healthy: 'En bonne santé',
      warning: 'À surveiller',
      critical: 'Critique',
    };
    return labels[status] || status;
  };

  const stats = {
    total: trees.length,
    healthy: trees.filter((t) => t.status === 'healthy').length,
    warning: trees.filter((t) => t.status === 'warning').length,
    critical: trees.filter((t) => t.status === 'critical').length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      {/* En-tête */}
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
          🌳 Gestion des Arbres
        </Typography>

        {/* Statistiques */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.total}
                </Typography>
                <Typography variant="body2">Total</Typography>
              </Box>
              <ForestIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard sx={{ background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.healthy}
                </Typography>
                <Typography variant="body2">En bonne santé</Typography>
              </Box>
              <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard sx={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.warning}
                </Typography>
                <Typography variant="body2">À surveiller</Typography>
              </Box>
              <WarningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </StatCard>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard sx={{ background: 'linear-gradient(135deg, #f44336, #c62828)' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.critical}
                </Typography>
                <Typography variant="body2">Critique</Typography>
              </Box>
              <ErrorIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </StatCard>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Barre de recherche et filtres */}
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 3, 
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Rechercher par type ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 1, 
                flexWrap: 'wrap',
                justifyContent: { xs: 'flex-start', md: 'flex-end' }
              }}
            >
              <Chip
                icon={<FilterListIcon />}
                label="Tous"
                onClick={() => setStatusFilter('all')}
                color={statusFilter === 'all' ? 'primary' : 'default'}
                sx={{ borderRadius: 2 }}
              />
              <Chip
                icon={<CheckCircleIcon />}
                label="Sains"
                onClick={() => setStatusFilter('healthy')}
                color={statusFilter === 'healthy' ? 'success' : 'default'}
                sx={{ borderRadius: 2 }}
              />
              <Chip
                icon={<WarningIcon />}
                label="Attention"
                onClick={() => setStatusFilter('warning')}
                color={statusFilter === 'warning' ? 'warning' : 'default'}
                sx={{ borderRadius: 2 }}
              />
              <Chip
                icon={<ErrorIcon />}
                label="Critique"
                onClick={() => setStatusFilter('critical')}
                color={statusFilter === 'critical' ? 'error' : 'default'}
                sx={{ borderRadius: 2 }}
              />
              <Tooltip title="Rafraîchir">
                <IconButton onClick={loadTrees} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Liste des arbres */}
      {filteredTrees.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <ForestIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Aucun arbre trouvé
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredTrees.map((tree) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={tree._id}>
              <StyledCard>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getStatusIcon(tree.status)}
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      {tree.treeType}
                    </Typography>
                    {tree.archived && (
                      <Chip 
                        label="Archivé" 
                        size="small" 
                        color="default"
                        sx={{ borderRadius: 1 }}
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    ID: {tree.treeId}
                  </Typography>

                  <Chip
                    label={getStatusLabel(tree.status)}
                    size="small"
                    color={
                      tree.status === 'healthy'
                        ? 'success'
                        : tree.status === 'warning'
                        ? 'warning'
                        : 'error'
                    }
                    sx={{ mb: 2, borderRadius: 2 }}
                  />

                  {tree.measurements && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <HeightIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {tree.measurements.height || 0}m
                        </Typography>
                      </Box>
                      {tree.measurements.approximateShape && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <SpaIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {tree.measurements.approximateShape}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {tree.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {tree.location.latitude.toFixed(4)}, {tree.location.longitude.toFixed(4)}
                      </Typography>
                    </Box>
                  )}

                  {tree.userId && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Propriétaire: {tree.userId.name}
                    </Typography>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Tooltip title="Modifier">
                      <IconButton
                        size="small"
                        onClick={() => window.location.href = `/trees/${tree._id}/edit`}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={tree.archived ? 'Désarchiver' : 'Archiver'}>
                      <IconButton
                        size="small"
                        onClick={() => handleArchiveTree(tree._id, tree.archived || false)}
                      >
                        {tree.archived ? (
                          <UnarchiveIcon fontSize="small" />
                        ) : (
                          <ArchiveIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Tooltip title="Supprimer">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedTree(tree);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB pour ajouter un arbre */}
      <Zoom in={true}>
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: { xs: 16, md: 32 },
            right: { xs: 16, md: 32 },
            background: 'linear-gradient(45deg, #00e676, #4caf50)',
            '&:hover': {
              background: 'linear-gradient(45deg, #66ffa6, #81c784)',
            },
          }}
          onClick={() => (window.location.href = '/trees/new')}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'arbre "{selectedTree?.treeType}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>
            Annuler
          </Button>
          <Button
            onClick={handleDeleteTree}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminTreeManagement;
