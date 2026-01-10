import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Fade,
  Zoom,
  Slide,
  Avatar,
  LinearProgress,
  Badge,
  Tooltip,
  useTheme,
  styled,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Edit,
  Add,
  RemoveRedEye,
  Archive,
  TrendingUp as TrendingUpIcon,
  Nature as NatureIcon,
  LocationOn as LocationOnIcon,
  DataUsage as DataUsageIcon,
  Insights as InsightsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  Forest as ForestIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelImport from '../components/ExcelImport';

// Styled Components for Futuristic Design
const GlassmorphicPaper = styled(Paper)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: '20px',
  boxShadow: `
    0 8px 32px 0 ${alpha(theme.palette.primary.main, 0.1)},
    inset 0 1px 0 0 ${alpha('#ffffff', 0.1)}
  `,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `
      0 16px 64px 0 ${alpha(theme.palette.primary.main, 0.2)},
      inset 0 1px 0 0 ${alpha('#ffffff', 0.2)}
    `,
  },
}));

const FuturisticButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  textTransform: 'none',
  padding: '10px 24px',
  boxShadow: `
    0 4px 20px ${alpha(theme.palette.primary.main, 0.3)},
    inset 0 1px 0 ${alpha('#ffffff', 0.2)}
  `,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: `
      0 8px 30px ${alpha(theme.palette.primary.main, 0.4)},
      inset 0 1px 0 ${alpha('#ffffff', 0.3)}
    `,
  },
}));

const HolographicCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.main, 0.1)} 0%, 
    ${alpha(theme.palette.secondary.main, 0.1)} 50%, 
    ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: `0 8px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

interface TreeStats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  archived: number;
}

interface Tree {
  _id: string;
  treeId: string;
  treeType?: string;
  ownerInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  status: string;
  isArchived?: boolean;
  measurements?: {
    height?: number;
    width?: number;
    approximateShape?: string;
  };
  fruits?: {
    present?: boolean;
    estimatedQuantity?: number;
  };
  lastUpdate: string;
}

const TreeList = () => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [treeStats, setTreeStats] = useState<TreeStats | null>(null);
  const [expandedTree, setExpandedTree] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        setUserEmail(payload.email);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [userRole, userEmail, showArchived]);

  const fetchTrees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      let url = 'http://localhost:5000/api/trees';
      if (userRole !== 'admin') {
        url = `http://localhost:5000/api/trees/owner/${encodeURIComponent(userEmail)}`;
      }

      if (showArchived && userRole === 'admin') {
        url += '?showArchived=true';
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        if (response.data.trees && Array.isArray(response.data.trees)) {
          setTrees(response.data.trees);
          setTreeStats(response.data.stats || null);
        } else if (Array.isArray(response.data)) {
          setTrees(response.data);
          setTreeStats(null);
        } else {
          setError('Format de données inattendu du serveur');
        }
      } else {
        setError('Réponse vide du serveur');
      }
      
      setError('');
    } catch (error: any) {
      console.error('Error fetching trees:', error);
      if (error.response?.status === 403) {
        setError('Accès non autorisé');
      } else if (error.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter');
      } else if (error.response?.status === 500) {
        setError('Erreur serveur. Veuillez réessayer plus tard.');
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK' || !error.response) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré sur le port 5000.');
      } else {
        setError(`Erreur lors de la récupération des arbres: ${error.message}`);
      }
      setTrees([]);
      setTreeStats(null);
    }
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value);
  };

  const filteredTrees = trees.filter(tree => {
    if (statusFilter === 'all') return true;
    return tree.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const toggleTreeExpand = (treeId: string) => {
    setExpandedTree(expandedTree === treeId ? null : treeId);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header futuriste */}
      <Fade in timeout={1000}>
        <Box sx={{ 
          mb: 6, 
          borderRadius: '24px',
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.1)} 0%, 
            ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          p: 4
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                width: 64, 
                height: 64, 
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`
              }}>
                <ForestIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}>
                  🌲 Gestion des Arbres
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: theme.palette.text.secondary,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                  Plateforme de surveillance intelligente
                </Typography>
              </Box>
            </Box>
            {userRole === 'admin' && (
              <FuturisticButton
                startIcon={<Add />}
                onClick={() => navigate('/trees/new')}
              >
                Ajouter un arbre
              </FuturisticButton>
            )}
          </Box>
        </Box>
      </Fade>

      {error && (
        <Fade in timeout={800}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: '16px',
              background: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              backdropFilter: 'blur(10px)',
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Statistiques */}
      {treeStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { 
              value: treeStats.total, 
              label: 'Total des arbres',
              icon: DataUsageIcon,
              color: theme.palette.primary.main 
            },
            { 
              value: treeStats.healthy, 
              label: 'En bonne santé',
              icon: TrendingUpIcon,
              color: '#00ff88' 
            },
            { 
              value: treeStats.warning, 
              label: 'À surveiller',
              icon: VisibilityIcon,
              color: '#ffaa00' 
            },
            { 
              value: treeStats.critical, 
              label: 'Critique',
              icon: SpeedIcon,
              color: '#ff4444' 
            }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Zoom in timeout={1000 + index * 200}>
                <HolographicCard>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Avatar sx={{ 
                      bgcolor: stat.color,
                      width: 56,
                      height: 56,
                      margin: '0 auto 16px',
                      boxShadow: `0 0 20px ${alpha(stat.color, 0.5)}`
                    }}>
                      <stat.icon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      color: stat.color,
                      textShadow: `0 0 10px ${alpha(stat.color, 0.3)}`
                    }}>
                      {stat.value}
                    </Typography>
                    <Typography color="textSecondary" sx={{ fontWeight: 500 }}>
                      {stat.label}
                    </Typography>
                    <LinearProgress 
                      value={treeStats.total > 0 ? (stat.value / treeStats.total) * 100 : 0} 
                      variant="determinate" 
                      sx={{ 
                        mt: 2, 
                        borderRadius: '10px',
                        height: '8px',
                        background: alpha(stat.color, 0.2),
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(45deg, ${stat.color}, ${alpha(stat.color, 0.8)})`,
                          borderRadius: '10px',
                        }
                      }} 
                    />
                  </CardContent>
                </HolographicCard>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Import Excel pour admin */}
      {treeStats && userRole === 'admin' && (
        <GlassmorphicPaper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <InsightsIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Importer des données
            </Typography>
          </Box>
          <ExcelImport onImportSuccess={fetchTrees} />
        </GlassmorphicPaper>
      )}

      {/* Filtres */}
      <GlassmorphicPaper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrer par état</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Filtrer par état"
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="all">🌳 Tous</MenuItem>
              <MenuItem value="healthy">🌿 En bonne santé</MenuItem>
              <MenuItem value="warning">⚠️ À surveiller</MenuItem>
              <MenuItem value="critical">🚨 Critique</MenuItem>
              {userRole === 'admin' && (
                <MenuItem value="archived">📦 Archivés</MenuItem>
              )}
            </Select>
          </FormControl>

          {userRole === 'admin' && (
            <FuturisticButton
              startIcon={<Archive />}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Masquer archivés' : 'Voir archivés'}
            </FuturisticButton>
          )}
        </Box>
      </GlassmorphicPaper>

      {/* Table principale */}
      <GlassmorphicPaper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                background: `linear-gradient(45deg, 
                  ${alpha(theme.palette.primary.main, 0.1)}, 
                  ${alpha(theme.palette.secondary.main, 0.1)})`,
              }}>
                <TableCell sx={{ fontWeight: 700 }}>🆔 ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>🌲 Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>👤 Propriétaire</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>📊 État</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>📏 Hauteur</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>📐 Largeur</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>🍎 Fruits</TableCell>
                {userRole === 'admin' && <TableCell sx={{ fontWeight: 700 }}>⚙️ Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrees.map((tree, index) => (
                <React.Fragment key={tree.treeId}>
                  <TableRow
                    hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: `linear-gradient(45deg, 
                          ${alpha(theme.palette.primary.main, 0.1)}, 
                          ${alpha(theme.palette.secondary.main, 0.1)})`,
                        transform: 'scale(1.01)',
                      },
                      ...(tree.isArchived && {
                        opacity: 0.7,
                        background: alpha(theme.palette.action.disabled, 0.1),
                      }),
                    }}
                    onClick={() => toggleTreeExpand(tree.treeId)}
                  >
                    <TableCell>
                      <Chip 
                        label={tree.treeId} 
                        size="small"
                        sx={{ 
                          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <NatureIcon sx={{ color: tree.treeType ? theme.palette.success.main : theme.palette.warning.main }} />
                        {tree.treeType || 'Non spécifié'}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {(tree.ownerInfo?.firstName || tree.ownerInfo?.lastName) 
                            ? (tree.ownerInfo?.firstName?.charAt(0) || tree.ownerInfo?.lastName?.charAt(0) || '?').toUpperCase() 
                            : '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {`${tree.ownerInfo?.firstName || 'Propriétaire'} ${tree.ownerInfo?.lastName || 'non spécifié'}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tree.ownerInfo?.email || 'Email non spécifié'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={tree.status || 'unknown'}
                        size="small"
                        color={getStatusColor(tree.status || 'unknown')}
                        sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon sx={{ color: theme.palette.info.main }} />
                        {tree.measurements?.height || 0}m
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SpeedIcon sx={{ color: theme.palette.secondary.main }} />
                        {tree.measurements?.width || 0}cm
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {tree.fruits?.present ? (
                        <Chip
                          label={`${tree.fruits?.estimatedQuantity || 0} fruits`}
                          color="success"
                          size="small"
                          icon={<NatureIcon />}
                        />
                      ) : (
                        <Chip 
                          label="Pas de fruits" 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    
                    {userRole === 'admin' && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Voir détails">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/trees/${tree.treeId}`);
                              }}
                              sx={{
                                background: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': { transform: 'scale(1.1)' },
                              }}
                            >
                              <VisibilityIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/trees/${tree.treeId}/edit`);
                              }}
                              sx={{
                                background: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main,
                                '&:hover': { transform: 'scale(1.1)' },
                              }}
                            >
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                  
                  {/* Section détails étendus */}
                  <TableRow>
                    <TableCell sx={{ py: 0 }} colSpan={userRole === 'admin' ? 8 : 7}>
                      <Collapse in={expandedTree === tree.treeId} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 3 }}>
                          <HolographicCard sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ 
                              mb: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              color: theme.palette.primary.main
                            }}>
                              <InsightsIcon />
                              Détails complets - Arbre {tree.treeId}
                            </Typography>
                            
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Card sx={{ borderRadius: '12px' }}>
                                  <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <LocationOnIcon sx={{ color: theme.palette.primary.main }} />
                                      Informations générales
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      <Typography variant="body2">
                                        <strong>Type:</strong> {tree.treeType || 'Non spécifié'}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>État:</strong> {tree.status || 'Non évalué'}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Forme:</strong> {tree.measurements?.approximateShape || 'Non spécifiée'}
                                      </Typography>
                                      
                                      {tree.location?.latitude && tree.location?.longitude && (
                                        <Typography variant="body2">
                                          <strong>Position GPS:</strong>{' '}
                                          <Link
                                            href={`https://www.google.com/maps?q=${tree.location.latitude},${tree.location.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ color: theme.palette.primary.main }}
                                          >
                                            {tree.location.latitude.toFixed(6)}, {tree.location.longitude.toFixed(6)}
                                          </Link>
                                        </Typography>
                                      )}
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                              
                              <Grid item xs={12} md={6}>
                                <Card sx={{ borderRadius: '12px' }}>
                                  <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <PersonIcon sx={{ color: theme.palette.secondary.main }} />
                                      Propriétaire
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      <Typography variant="body2">
                                        <strong>Nom:</strong> {`${tree.ownerInfo?.firstName || 'Propriétaire'} ${tree.ownerInfo?.lastName || 'non spécifié'}`}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Email:</strong> {tree.ownerInfo?.email || 'Non spécifié'}
                                      </Typography>
                                    </Box>
                                    
                                    {tree.fruits?.present && (
                                      <Box sx={{ mt: 2, p: 2, borderRadius: '8px', background: alpha('#00ff88', 0.1) }}>
                                        <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600 }}>
                                          🍎 Fruits présents
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Quantité estimée:</strong> {tree.fruits?.estimatedQuantity || 0}
                                        </Typography>
                                      </Box>
                                    )}
                                    
                                    {tree.isArchived && (
                                      <Box sx={{ mt: 2, p: 2, borderRadius: '8px', background: alpha(theme.palette.warning.main, 0.1) }}>
                                        <Typography variant="body2" sx={{ color: theme.palette.warning.main, fontWeight: 600 }}>
                                          📦 Arbre archivé
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Date:</strong> {new Date(tree.lastUpdate).toLocaleDateString()}
                                        </Typography>
                                      </Box>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            </Grid>
                          </HolographicCard>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              
              {filteredTrees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={userRole === 'admin' ? 8 : 7} align="center">
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Avatar sx={{ 
                        width: 80, 
                        height: 80, 
                        margin: '0 auto 16px',
                        background: `linear-gradient(45deg, ${theme.palette.grey[400]}, ${theme.palette.grey[600]})`,
                      }}>
                        <ForestIcon sx={{ fontSize: 40 }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        Aucun arbre trouvé
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ajustez vos filtres ou ajoutez de nouveaux arbres
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassmorphicPaper>
    </Container>
  );
};

export default TreeList;
