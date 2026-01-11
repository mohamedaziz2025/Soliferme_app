import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Collapse,
  Avatar,
  Fade,
  Zoom,
  Badge,
  useTheme,
  styled,
  alpha,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { 
  LocationOn, 
  ExpandMore, 
  ExpandLess,
  Refresh as RefreshIcon,
  Map as MapIcon,
  Satellite as SatelliteIcon,
  Nature as NatureIcon,
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
  DataUsage as DataUsageIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import AddTreeForm from '../components/AddTreeForm';
import MapLegend from '../components/MapLegend';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Create custom icons for different tree statuses
const createCustomIcon = (status: string) => {
  let color = '#4CAF50'; // Default green for healthy
  
  switch (status) {
    case 'warning':
      color = '#FF9800'; // Orange
      break;
    case 'critical':
      color = '#F44336'; // Red
      break;
    case 'archived':
      color = '#9E9E9E'; // Gray
      break;
    default:
      color = '#4CAF50'; // Green
  }

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="30" height="30">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface Tree {
  _id: string;
  treeId: string;
  treeType: string;
  ownerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  ownerId?: {
    name: string;
    email: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  status: string;
  measurements?: {
    height: number;
    width: number;
  };
  fruits?: {
    present: boolean;
    estimatedQuantity: number;
  };
  isArchived?: boolean;
  lastUpdate: string;
}

const TreeMap = () => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [center, setCenter] = useState<[number, number]>([36.8065, 10.1815]); // Default to Tunisia
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [showTreesList, setShowTreesList] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Decode JWT token to get user data
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        setUserEmail(payload.email);
      }
    };

    const fetchTrees = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        let url = 'http://72.62.71.97:35000/api/trees';
        
        // If user is not admin, fetch only their trees
        if (userRole !== 'admin' && userEmail) {
          url = `http://72.62.71.97:35000/api/trees/owner/${encodeURIComponent(userEmail)}`;
        }

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle different response structures
        const treesData = response.data.trees || response.data;
        setTrees(treesData);
        
        // Update center if we have trees and set to first tree location
        if (treesData.length > 0) {
          const firstTree = treesData[0];
          setCenter([firstTree.location.latitude, firstTree.location.longitude]);
        }
      } catch (error) {
        console.error('Error fetching trees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    if (userRole || userEmail) {
      fetchTrees();
    }
  }, [userRole, userEmail]);

  const handleTreeAdded = () => {
    // Refresh the trees list after adding a new tree
    const fetchTrees = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        let url = 'http://72.62.71.97:35000/api/trees';
        
        // If user is not admin, fetch only their trees
        if (userRole !== 'admin' && userEmail) {
          url = `http://72.62.71.97:35000/api/trees/owner/${encodeURIComponent(userEmail)}`;
        }

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Handle different response structures
        const treesData = response.data.trees || response.data;
        setTrees(treesData);
        
        // Update center to the newest tree (last added)
        if (treesData.length > 0) {
          const newestTree = treesData[treesData.length - 1];
          setCenter([newestTree.location.latitude, newestTree.location.longitude]);
        }
      } catch (error) {
        console.error('Error fetching trees:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrees();
  };

  const handleTreeClick = (tree: Tree) => {
    setCenter([tree.location.latitude, tree.location.longitude]);
  };

  const getIconColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      case 'archived':
        return 'disabled';
      default:
        return 'primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      case 'archived':
        return 'default';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'En bonne santé';
      case 'warning':
        return 'À surveiller';
      case 'critical':
        return 'Critique';
      case 'archived':
        return 'Archivé';
      default:
        return status;
    }
  };

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

  const HolographicCard = styled(Card)(({ theme }) => ({
    background: `linear-gradient(135deg, 
      ${alpha(theme.palette.primary.main, 0.1)} 0%, 
      ${alpha(theme.palette.secondary.main, 0.1)} 50%, 
      ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    borderRadius: '16px',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s ease',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.1)}, transparent)`,
      transition: 'left 0.5s',
    },
    '&:hover::before': {
      left: '100%',
    },
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: `0 8px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  }));

  const CyberMapContainer = styled(Box)(({ theme }) => ({
    background: `linear-gradient(135deg, 
      ${alpha(theme.palette.background.paper, 0.9)} 0%, 
      ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
    borderRadius: '20px',
    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    backdropFilter: 'blur(15px)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: `
      0 10px 40px ${alpha(theme.palette.primary.main, 0.2)},
      inset 0 1px 0 ${alpha('#ffffff', 0.1)}
    `,
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%)`,
      pointerEvents: 'none',
      zIndex: 1000,
    },
  }));

  const NeonChip = styled(Chip)(({ theme }) => ({
    borderRadius: '16px',
    fontWeight: 'bold',
    textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.6)}`,
    boxShadow: `
      0 0 20px ${alpha(theme.palette.primary.main, 0.3)},
      inset 0 1px 0 ${alpha('#ffffff', 0.1)}
    `,
    animation: 'glow 2s ease-in-out infinite alternate',
    '@keyframes glow': {
      from: {
        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
      },
      to: {
        boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`,
      },
    },
  }));

  const FuturisticListItem = styled(ListItem)(({ theme }) => ({
    background: alpha(theme.palette.background.paper, 0.6),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    borderRadius: '12px',
    margin: '8px 0',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: `linear-gradient(45deg, 
        ${alpha(theme.palette.primary.main, 0.1)}, 
        ${alpha(theme.palette.secondary.main, 0.1)})`,
      transform: 'translateX(8px) scale(1.02)',
      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  }));

  const theme = useTheme();

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
                <MapIcon sx={{ fontSize: 32 }} />
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
                  🗺️ Carte Interactive
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: theme.palette.text.secondary,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                  Géolocalisation avancée des arbres urbains
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Tooltip title="Actualiser les données">
                <IconButton 
                  onClick={handleTreeAdded}
                  disabled={loading}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    color: 'white',
                    '&:hover': {
                      transform: 'scale(1.1) rotate(180deg)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={showTreesList ? "Masquer la liste" : "Afficher la liste"}>
                <IconButton 
                  onClick={() => setShowTreesList(!showTreesList)}
                  sx={{
                    background: showTreesList ? 
                      `linear-gradient(45deg, #00ff88, #00cc66)` : 
                      `linear-gradient(45deg, ${theme.palette.grey[600]}, ${theme.palette.grey[400]})`,
                    color: 'white',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Fade>
      
      {/* Afficher le formulaire d'ajout uniquement pour les admins */}
      {userRole === 'admin' && (
        <AddTreeForm onTreeAdded={handleTreeAdded} />
      )}

      {/* Statistiques ultra modernes */}
      <Fade in timeout={1200}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 56, 
                    height: 56, 
                    background: 'linear-gradient(45deg, #4CAF50, #81C784)' 
                  }}>
                    <NatureIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {trees.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Arbres Total
                    </Typography>
                  </Box>
                </CardContent>
              </HolographicCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 56, 
                    height: 56, 
                    background: 'linear-gradient(45deg, #4CAF50, #66BB6A)' 
                  }}>
                    <TrendingUpIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {trees.filter(t => t.status === 'healthy').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      En Santé
                    </Typography>
                  </Box>
                </CardContent>
              </HolographicCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 56, 
                    height: 56, 
                    background: 'linear-gradient(45deg, #FF9800, #FFB74D)' 
                  }}>
                    <DataUsageIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {trees.filter(t => t.status === 'warning').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      À Surveiller
                    </Typography>
                  </Box>
                </CardContent>
              </HolographicCard>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 56, 
                    height: 56, 
                    background: 'linear-gradient(45deg, #F44336, #EF5350)' 
                  }}>
                    <SatelliteIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {trees.filter(t => t.status === 'critical').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critiques
                    </Typography>
                  </Box>
                </CardContent>
              </HolographicCard>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      <Grid container spacing={3}>
        {/* Liste des arbres ultra moderne */}
        <Grid item xs={12} md={showTreesList ? 4 : 0}>
          <Collapse in={showTreesList} orientation="horizontal">
            <Zoom in={showTreesList} timeout={600}>
              <GlassmorphicPaper sx={{ 
                height: 'calc(100vh - 400px)', 
                overflowY: 'auto',
                p: 3
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  mb: 3,
                  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  pb: 2
                }}>
                  <Avatar sx={{ 
                    width: 48, 
                    height: 48, 
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}>
                    <NatureIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                      textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}>
                      🌳 Arbres Urbains
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {trees.length} arbres géolocalisés
                    </Typography>
                  </Box>
                </Box>
                {loading ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    py: 4,
                    gap: 2
                  }}>
                    <LinearProgress 
                      sx={{ 
                        width: '100%', 
                        borderRadius: 2,
                        height: 6,
                        background: alpha(theme.palette.primary.main, 0.1),
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }
                      }} 
                    />
                    <Typography variant="body2" color="text.secondary">
                      ⚡ Chargement des données...
                    </Typography>
                  </Box>
                ) : trees.length > 0 ? (
                  <List sx={{ p: 0 }}>
                    {trees.map((tree, index) => (
                      <Zoom 
                        key={tree._id} 
                        in 
                        timeout={800 + index * 100}
                        style={{ transitionDelay: `${index * 50}ms` }}
                      >
                        <FuturisticListItem 
                          onClick={() => handleTreeClick(tree)}
                          sx={{ 
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '4px',
                              height: '100%',
                              background: tree.status === 'healthy' ? '#4CAF50' : 
                                         tree.status === 'warning' ? '#FF9800' : 
                                         tree.status === 'critical' ? '#F44336' : '#9E9E9E',
                              boxShadow: `0 0 10px ${tree.status === 'healthy' ? '#4CAF50' : 
                                                    tree.status === 'warning' ? '#FF9800' : 
                                                    tree.status === 'critical' ? '#F44336' : '#9E9E9E'}`,
                            }
                          }}
                        >
                          <ListItemIcon sx={{ ml: 1 }}>
                            <Badge 
                              badgeContent={tree.fruits?.present ? '🍎' : ''}
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '12px',
                                  minWidth: '20px',
                                  height: '20px',
                                }
                              }}
                            >
                              <Avatar sx={{ 
                                width: 40, 
                                height: 40,
                                background: tree.status === 'healthy' ? 
                                  'linear-gradient(45deg, #4CAF50, #81C784)' : 
                                  tree.status === 'warning' ? 
                                  'linear-gradient(45deg, #FF9800, #FFB74D)' : 
                                  tree.status === 'critical' ?
                                  'linear-gradient(45deg, #F44336, #EF5350)' :
                                  'linear-gradient(45deg, #9E9E9E, #BDBDBD)',
                                fontSize: '20px'
                              }}>
                                {tree.treeType ? tree.treeType.charAt(0).toUpperCase() : '🌳'}
                              </Avatar>
                            </Badge>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ 
                                  fontWeight: 600,
                                  color: theme.palette.text.primary
                                }}>
                                  Arbre #{tree.treeId}
                                </Typography>
                                <NeonChip 
                                  label={getStatusLabel(tree.status)} 
                                  size="small" 
                                  color={getStatusColor(tree.status)}
                                  sx={{ fontSize: '10px', height: '20px' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="body2" sx={{ 
                                  color: theme.palette.text.secondary,
                                  fontWeight: 500
                                }}>
                                  🌿 {tree.treeType || 'Type non spécifié'}
                                </Typography>
                                <Typography variant="caption" sx={{ 
                                  color: alpha(theme.palette.text.secondary, 0.7),
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  mt: 0.5
                                }}>
                                  👤 {tree.ownerInfo ? 
                                    `${tree.ownerInfo.firstName || ''} ${tree.ownerInfo.lastName || ''}`.trim() || 
                                    tree.ownerInfo.email || 'Propriétaire inconnu' : 
                                    'Propriétaire inconnu'}
                                </Typography>
                                {tree.measurements && (
                                  <Typography variant="caption" sx={{ 
                                    color: alpha(theme.palette.primary.main, 0.8),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: 0.3
                                  }}>
                                    📏 {tree.measurements.height || 'N/A'}m × {tree.measurements.width || 'N/A'}m
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </FuturisticListItem>
                      </Zoom>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    py: 6,
                    gap: 2,
                    textAlign: 'center'
                  }}>
                    <Avatar sx={{ 
                      width: 64, 
                      height: 64, 
                      background: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontSize: '32px'
                    }}>
                      🌳
                    </Avatar>
                    <Typography variant="h6" color="text.secondary">
                      Aucun arbre trouvé
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Commencez par ajouter votre premier arbre !
                    </Typography>
                  </Box>
                )}
              </GlassmorphicPaper>
            </Zoom>
          </Collapse>
        </Grid>

        {/* Carte ultra moderne */}
        <Grid item xs={12} md={showTreesList ? 8 : 12}>
          <Fade in timeout={1000}>
            <CyberMapContainer sx={{ 
              height: 'calc(100vh - 400px)', 
              width: '100%',
              position: 'relative'
            }}>
              <MapContainer
                center={center}
                zoom={13}
                style={{ 
                  height: '100%', 
                  width: '100%', 
                  borderRadius: '18px',
                  overflow: 'hidden'
                }}
                key={`${center[0]}-${center[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {trees.map((tree) => (
                  <Marker
                    key={tree._id}
                    position={[tree.location.latitude, tree.location.longitude]}
                    icon={createCustomIcon(tree.status)}
                  >
                    <Popup>
                      <Box sx={{ 
                        minWidth: '300px',
                        background: `linear-gradient(135deg, 
                          ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                          ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                        backdropFilter: 'blur(10px)',
                        borderRadius: '12px',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        p: 2
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ 
                            width: 48, 
                            height: 48,
                            background: tree.status === 'healthy' ? 
                              'linear-gradient(45deg, #4CAF50, #81C784)' : 
                              tree.status === 'warning' ? 
                              'linear-gradient(45deg, #FF9800, #FFB74D)' : 
                              tree.status === 'critical' ?
                              'linear-gradient(45deg, #F44336, #EF5350)' :
                              'linear-gradient(45deg, #9E9E9E, #BDBDBD)'
                          }}>
                            {tree.treeType ? tree.treeType.charAt(0).toUpperCase() : '🌳'}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              🌳 Arbre #{tree.treeId}
                            </Typography>
                            <NeonChip 
                              label={getStatusLabel(tree.status)} 
                              size="small" 
                              color={getStatusColor(tree.status)}
                            />
                          </Box>
                        </Box>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              🌿 Type:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tree.treeType || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              👤 Propriétaire:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tree.ownerInfo ? 
                                `${tree.ownerInfo.firstName || ''} ${tree.ownerInfo.lastName || ''}`.trim() || 'N/A' : 
                                'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              📧 Email:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tree.ownerInfo?.email || tree.ownerId?.email || 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              📏 Dimensions:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tree.measurements?.height || 'N/A'}m × {tree.measurements?.width || 'N/A'}m
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              🍎 Fruits:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {tree.fruits?.present ? `${tree.fruits.estimatedQuantity} estimés` : 'Aucun'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              📅 Dernière MAJ:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(tree.lastUpdate).toLocaleDateString('fr-FR')}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <Box sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1001,
                display: 'flex',
                gap: 1
              }}>
                <Tooltip title="Satellite">
                  <IconButton sx={{
                    background: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    '&:hover': {
                      background: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}>
                    <SatelliteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <MapLegend />
            </CyberMapContainer>
          </Fade>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TreeMap;