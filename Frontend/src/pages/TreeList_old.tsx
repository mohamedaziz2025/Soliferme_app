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
  Divider,
  Fade,
  Zoom,
  Slide,
  Avatar,
  LinearProgress,
  Badge,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Edit,
  Add,
  RemoveRedEye,
  Archive,
  FilterList,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationOnIcon,
  DataUsage as DataUsageIcon,
  Nature as NatureIcon,
  Insights as InsightsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  Visibility as VisibilityIcon,
  Forest as ForestIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ExcelImport from '../components/ExcelImport';
import { styled } from '@mui/system';
import { alpha } from '@mui/material/styles';

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
  '&:active': {
    transform: 'translateY(0) scale(1.02)',
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

const CyberTableCell = styled(TableCell)(({ theme }) => ({
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  color: theme.palette.text.primary,
  fontWeight: 500,
  padding: '16px',
  background: alpha(theme.palette.background.paper, 0.5),
  transition: 'all 0.3s ease',
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.05),
    transform: 'scale(1.01)',
  },
}));

const DataQualityIndicator = styled(Box)(({ quality }: { quality: 'high' | 'medium' | 'low' }) => ({
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  background: quality === 'high' ? '#00ff88' : quality === 'medium' ? '#ffaa00' : '#ff4444',
  boxShadow: `0 0 10px ${quality === 'high' ? '#00ff88' : quality === 'medium' ? '#ffaa00' : '#ff4444'}`,
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.6 },
    '100%': { opacity: 1 },
  },
}));

interface TreeStats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  archived: number;
}

interface Owner {
  _id: string;
  name: string;
  email: string;
  language: string;
  role: string;
  createdAt: string;
}

interface Tree {
  _id: string;
  treeId: string;
  treeType?: string;
  ownerId?: Owner;
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

      console.log('Fetching trees from:', url);
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response data:', response.data);
      
      // Vérifier si la réponse a le bon format
      if (response.data && typeof response.data === 'object') {
        if (response.data.trees && Array.isArray(response.data.trees)) {
          setTrees(response.data.trees);
          setTreeStats(response.data.stats || null);
        } else if (Array.isArray(response.data)) {
          // Si la réponse est directement un tableau d'arbres
          setTrees(response.data);
          setTreeStats(null);
        } else {
          console.error('Format de réponse inattendu:', response.data);
          setError('Format de données inattendu du serveur');
        }
      } else {
        setError('Réponse vide du serveur');
      }
      
      setError(''); // Réinitialiser l'erreur si tout va bien
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
      // Réinitialiser les données en cas d'erreur
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
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const toggleTreeExpand = (treeId: string) => {
    setExpandedTree(expandedTree === treeId ? null : treeId);
  };

  const theme = useTheme();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header futuriste */}
      <Fade in timeout={1000}>
        <Box sx={{ 
          mb: 6, 
          position: 'relative',
          overflow: 'hidden',
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
            alignItems: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Zoom in timeout={1200}>
                <Avatar sx={{ 
                  width: 64, 
                  height: 64, 
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`
                }}>
                  <ForestIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Zoom>
              <Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.3)}`,
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
              <Slide direction="left" in timeout={1500}>
                <FuturisticButton
                  startIcon={<Add />}
                  onClick={() => navigate('/trees/new')}
                >
                  Ajouter un arbre
                </FuturisticButton>
              </Slide>
            )}
          </Box>
          
          {/* Effet de particules en arrière-plan */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
            zIndex: 1,
          }} />
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

      {/* Statistiques améliorées */}
      {treeStats && (
        <Slide direction="up" in timeout={1000}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: theme.palette.primary.main,
                      width: 56,
                      height: 56,
                      boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`
                    }}>
                      <DataUsageIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700,
                    color: theme.palette.primary.main,
                    textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}>
                    {treeStats.total}
                  </Typography>
                  <Typography color="textSecondary" sx={{ fontWeight: 500 }}>
                    Total des arbres
                  </Typography>
                  <LinearProgress 
                    value={100} 
                    variant="determinate" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: '10px',
                      height: '8px',
                      background: alpha(theme.palette.primary.main, 0.2),
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        borderRadius: '10px',
                      }
                    }} 
                  />
                </CardContent>
              </HolographicCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Badge badgeContent={<NatureIcon sx={{ fontSize: 12 }} />} color="success">
                      <Avatar sx={{ 
                        bgcolor: '#00ff88',
                        width: 56,
                        height: 56,
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)'
                      }}>
                        <TrendingUpIcon sx={{ fontSize: 28 }} />
                      </Avatar>
                    </Badge>
                  </Box>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700,
                    color: '#00ff88',
                    textShadow: '0 0 10px rgba(0, 255, 136, 0.3)'
                  }}>
                    {treeStats.healthy}
                  </Typography>
                  <Typography color="textSecondary" sx={{ fontWeight: 500 }}>
                    En bonne santé
                  </Typography>
                  <LinearProgress 
                    value={(treeStats.healthy / treeStats.total) * 100} 
                    variant="determinate" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: '10px',
                      height: '8px',
                      background: alpha('#00ff88', 0.2),
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(45deg, #00ff88, #00cc66)',
                        borderRadius: '10px',
                      }
                    }} 
                  />
                </CardContent>
              </HolographicCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: '#ffaa00',
                      width: 56,
                      height: 56,
                      boxShadow: '0 0 20px rgba(255, 170, 0, 0.5)'
                    }}>
                      <VisibilityIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700,
                    color: '#ffaa00',
                    textShadow: '0 0 10px rgba(255, 170, 0, 0.3)'
                  }}>
                    {treeStats.warning}
                  </Typography>
                  <Typography color="textSecondary" sx={{ fontWeight: 500 }}>
                    À surveiller
                  </Typography>
                  <LinearProgress 
                    value={(treeStats.warning / treeStats.total) * 100} 
                    variant="determinate" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: '10px',
                      height: '8px',
                      background: alpha('#ffaa00', 0.2),
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(45deg, #ffaa00, #ff8800)',
                        borderRadius: '10px',
                      }
                    }} 
                  />
                </CardContent>
              </HolographicCard>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: '#ff4444',
                      width: 56,
                      height: 56,
                      boxShadow: '0 0 20px rgba(255, 68, 68, 0.5)'
                    }}>
                      <SpeedIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                  </Box>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700,
                    color: '#ff4444',
                    textShadow: '0 0 10px rgba(255, 68, 68, 0.3)'
                  }}>
                    {treeStats.critical}
                  </Typography>
                  <Typography color="textSecondary" sx={{ fontWeight: 500 }}>
                    Critique
                  </Typography>
                  <LinearProgress 
                    value={(treeStats.critical / treeStats.total) * 100} 
                    variant="determinate" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: '10px',
                      height: '8px',
                      background: alpha('#ff4444', 0.2),
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(45deg, #ff4444, #cc0000)',
                        borderRadius: '10px',
                      }
                    }} 
                  />
                </CardContent>
              </HolographicCard>
            </Grid>
          </Grid>
        </Slide>
      )}

      {/* Import Excel pour admin */}
      {treeStats && userRole === 'admin' && (
        <Fade in timeout={1200}>
          <GlassmorphicPaper sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <InsightsIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Importer des données
              </Typography>
            </Box>
            <ExcelImport onImportSuccess={fetchTrees} />
          </GlassmorphicPaper>
        </Fade>
      )}

      {/* Filtres et contrôles */}
      <Fade in timeout={1400}>
        <GlassmorphicPaper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: theme.palette.primary.main }}>Filtrer par état</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Filtrer par état"
                sx={{
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                  },
                }}
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
                sx={{ minWidth: 180 }}
              >
                {showArchived ? 'Masquer archivés' : 'Voir archivés'}
              </FuturisticButton>
            )}
          </Box>
        </GlassmorphicPaper>
      </Fade>

      {/* Table principale */}
      <Fade in timeout={1600}>
        <GlassmorphicPaper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  background: `linear-gradient(45deg, 
                    ${alpha(theme.palette.primary.main, 0.1)}, 
                    ${alpha(theme.palette.secondary.main, 0.1)})`,
                }}>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DataQualityIndicator quality="high" />
                      Détails
                    </Box>
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    🆔 ID
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    🌲 Type
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    👤 Propriétaire
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    📊 État
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    📏 Hauteur
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    📐 Largeur
                  </CyberTableCell>
                  <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    🍎 Fruits
                  </CyberTableCell>
                  {userRole === 'admin' && (
                    <CyberTableCell sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      ⚙️ Actions
                    </CyberTableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
            {filteredTrees.map((tree, index) => {
              // Calcul de la qualité des données pour chaque arbre
              let dataQuality: 'high' | 'medium' | 'low' = 'high';
              let missingData = 0;
              
              if (!tree.treeType) missingData++;
              if (!tree.ownerInfo?.firstName && !tree.ownerInfo?.lastName) missingData++;
              if (!tree.measurements?.height) missingData++;
              if (!tree.location?.latitude || !tree.location?.longitude) missingData++;
              
              if (missingData > 2) dataQuality = 'low';
              else if (missingData > 0) dataQuality = 'medium';

              return (
                <React.Fragment key={tree.treeId}>
                  <TableRow
                    hover
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(10px)',
                      borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        cursor: 'pointer',
                        background: `linear-gradient(45deg, 
                          ${alpha(theme.palette.primary.main, 0.1)}, 
                          ${alpha(theme.palette.secondary.main, 0.1)})`,
                        transform: 'scale(1.01)',
                        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                      },
                      ...(tree.isArchived === true && {
                        opacity: 0.7,
                        background: alpha(theme.palette.action.disabled, 0.1),
                      }),
                    }}
                    onClick={() => toggleTreeExpand(tree.treeId)}
                  >
                      <CyberTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <IconButton 
                            size="small"
                            sx={{
                              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                              color: 'white',
                              width: 32,
                              height: 32,
                              '&:hover': {
                                transform: 'rotate(180deg)',
                                transition: 'transform 0.3s ease',
                              },
                            }}
                          >
                            {expandedTree === tree.treeId ? (
                              <ExpandLessIcon sx={{ fontSize: 20 }} />
                            ) : (
                              <ExpandMoreIcon sx={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                          <Tooltip title={`Qualité des données: ${dataQuality === 'high' ? 'Excellente' : dataQuality === 'medium' ? 'Bonne' : 'À améliorer'}`}>
                            <DataQualityIndicator quality={dataQuality} />
                          </Tooltip>
                        </Box>
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <NeonChip 
                          label={tree.treeId} 
                          size="small"
                          sx={{ 
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            color: 'white',
                          }}
                        />
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NatureIcon sx={{ color: tree.treeType ? theme.palette.success.main : theme.palette.warning.main }} />
                          <Typography sx={{ fontWeight: 500 }}>
                            {tree.treeType || 'Non spécifié'}
                          </Typography>
                        </Box>
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: (tree.ownerInfo?.firstName || tree.ownerInfo?.lastName) ? theme.palette.primary.main : theme.palette.grey[400],
                            fontSize: '0.875rem'
                          }}>
                            {(tree.ownerInfo?.firstName || tree.ownerInfo?.lastName) 
                              ? (tree.ownerInfo?.firstName?.charAt(0) || tree.ownerInfo?.lastName?.charAt(0) || '?').toUpperCase() 
                              : '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {`${tree.ownerInfo?.firstName || 'Propriétaire'} ${tree.ownerInfo?.lastName || 'non spécifié'}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tree.ownerInfo?.email || 'Email non spécifié'}
                            </Typography>
                          </Box>
                        </Box>
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <NeonChip
                          label={tree.status || 'unknown'}
                          size="small"
                          color={getStatusColor(tree.status || 'unknown')}
                          sx={{
                            fontWeight: 'bold',
                            minWidth: 100,
                            '& .MuiChip-label': {
                              textTransform: 'capitalize',
                            },
                          }}
                        />
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TrendingUpIcon sx={{ color: theme.palette.info.main, fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 500 }}>
                            {tree.measurements?.height || 0}m
                          </Typography>
                        </Box>
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SpeedIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                          <Typography sx={{ fontWeight: 500 }}>
                            {tree.measurements?.width || 0}cm
                          </Typography>
                        </Box>
                      </CyberTableCell>
                      
                      <CyberTableCell>
                        {tree.fruits?.present ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NatureIcon sx={{ color: '#00ff88', fontSize: 20 }} />
                            <Typography sx={{ color: '#00ff88', fontWeight: 600 }}>
                              Oui ({tree.fruits?.estimatedQuantity || 0})
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NatureIcon sx={{ color: theme.palette.grey[400], fontSize: 20 }} />
                            <Typography sx={{ color: theme.palette.text.secondary }}>
                              Non
                            </Typography>
                          </Box>
                        )}
                      </CyberTableCell>
                      
                      {userRole === 'admin' && (
                        <CyberTableCell>
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
                                  '&:hover': {
                                    background: alpha(theme.palette.primary.main, 0.2),
                                    transform: 'scale(1.1)',
                                  },
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
                                  '&:hover': {
                                    background: alpha(theme.palette.info.main, 0.2),
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                <Edit sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Archiver">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Logique d'archivage à implémenter
                                }}
                                sx={{
                                  background: alpha(theme.palette.warning.main, 0.1),
                                  color: theme.palette.warning.main,
                                  '&:hover': {
                                    background: alpha(theme.palette.warning.main, 0.2),
                                    transform: 'scale(1.1)',
                                  },
                                }}
                              >
                                <Archive sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CyberTableCell>
                      )}
                    </TableRow>
                  
                  {/* Section détails étendus */}
                  <TableRow>
                    <CyberTableCell sx={{ py: 0 }} colSpan={userRole === 'admin' ? 9 : 8}>
                      <Collapse in={expandedTree === tree.treeId} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 3 }}>
                          <HolographicCard sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ 
                              mb: 3,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              fontWeight: 600,
                              color: theme.palette.primary.main
                            }}>
                              <InsightsIcon />
                              Détails complets - Arbre {tree.treeId}
                            </Typography>
                            
                            <Grid container spacing={3}>
                              <Grid item xs={12} md={6}>
                                <Card sx={{ 
                                  background: alpha(theme.palette.primary.main, 0.05),
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                  borderRadius: '12px'
                                }}>
                                  <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <LocationOnIcon sx={{ color: theme.palette.primary.main }} />
                                      Informations générales
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      <Typography variant="body2">
                                        <strong>Type d'arbre:</strong> {tree.treeType || 'Non spécifié'}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>ID Arbre:</strong> {tree.treeId || 'N/A'}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>État:</strong> {tree.status || 'Non évalué'}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Forme approximative:</strong> {tree.measurements?.approximateShape || 'Non spécifiée'}
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
                                <Card sx={{ 
                                  background: alpha(theme.palette.secondary.main, 0.05),
                                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                  borderRadius: '12px'
                                }}>
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
                                    
                                    {tree.isArchived === true && (
                                      <Box sx={{ mt: 2, p: 2, borderRadius: '8px', background: alpha(theme.palette.warning.main, 0.1) }}>
                                        <Typography variant="body2" sx={{ color: theme.palette.warning.main, fontWeight: 600 }}>
                                          📦 Arbre archivé
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Date:</strong> {new Date(tree.lastUpdate || '').toLocaleDateString()}
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
                    </CyberTableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
                
                {/* Message si aucun arbre */}
            {filteredTrees.length === 0 && (
              <TableRow>
                <CyberTableCell colSpan={userRole === 'admin' ? 9 : 8} align="center">
                  <Fade in timeout={2000}>
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
                  </Fade>
                </CyberTableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassmorphicPaper>
  </Fade>
</Container>
  );
};

export default TreeList;