import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  alpha,
  styled,
  Fade,
  Zoom,
  Avatar,
  LinearProgress,
  Chip,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Streetview as TreeIcon,
  LocalFlorist,
  Warning,
  Analytics,
  People,
  AdminPanelSettings,
  Archive,
  Assessment,
  TrendingUp,
  Nature,
  CheckCircle,
  ErrorOutline,
  Insights as InsightsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  DataUsage as DataUsageIcon,
  Visibility as VisibilityIcon,
  Forest as ForestIcon,
  Dashboard as DashboardIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  CategoryScale,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

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

const CyberChart = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.background.paper, 0.9)} 0%, 
    ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
  borderRadius: '16px',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  backdropFilter: 'blur(10px)',
  overflow: 'hidden',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
}));

interface TreeStats {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  archived: number;
  incomplete?: number;
  complete?: number;
}

interface UserStats {
  total: number;
  admin: number;
  user: number;
}

interface DashboardData {
  trees: TreeStats;
  users: UserStats;
  recentActivities: any[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const theme = useTheme();

  useEffect(() => {
    const fetchUserData = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token manquant');
      }

      const response = await axios.get('http://localhost:5000/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setData(response.data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (!data) return null;

  // Configuration des graphiques
  const pieChartData = {
    labels: ['En bonne santé', 'À surveiller', 'Critique', 'Archivés'],
    datasets: [
      {
        data: [data.trees.healthy, data.trees.warning, data.trees.critical, data.trees.archived],
        backgroundColor: [
          alpha('#00E676', 0.8),
          alpha('#4CAF50', 0.8),
          alpha('#66BB6A', 0.8),
          alpha(theme.palette.grey[400], 0.8),
        ],
        borderColor: [
          '#00E676',
          '#4CAF50',
          '#66BB6A',
          theme.palette.grey[400],
        ],
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    },
  };

  const lineChartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Arbres ajoutés',
        data: [12, 19, 15, 25, 22, 30],
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: theme.palette.primary.main,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const calculateCompletionRate = () => {
    const complete = data.trees.complete || 0;
    const incomplete = data.trees.incomplete || 0;
    const total = complete + incomplete;
    return total > 0 ? Math.round((complete / total) * 100) : 0;
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ 
              width: 64, 
              height: 64, 
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`
            }}>
              <DashboardIcon sx={{ fontSize: 32 }} />
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
                📊 Tableau de Bord
              </Typography>
              <Typography variant="h6" sx={{ 
                color: theme.palette.text.secondary,
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}>
                <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                Surveillance intelligente en temps réel
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Grid container spacing={4}>
        {/* Statistiques principales */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {[
              { 
                title: 'Total Arbres',
                value: data.trees.total,
                icon: DataUsageIcon,
                color: theme.palette.primary.main,
                trend: '+12%'
              },
              { 
                title: 'En Santé',
                value: data.trees.healthy,
                icon: CheckCircle,
                color: '#00E676',
                trend: '+8%'
              },
              { 
                title: 'À Surveiller',
                value: data.trees.warning,
                icon: VisibilityIcon,
                color: '#4CAF50',
                trend: '-3%'
              },
              { 
                title: 'Critiques',
                value: data.trees.critical,
                icon: ErrorOutline,
                color: '#66BB6A',
                trend: '-15%'
              }
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Zoom in timeout={1000 + index * 200}>
                  <HolographicCard>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{
                          bgcolor: stat.color,
                          width: 56,
                          height: 56,
                          boxShadow: `0 0 20px ${alpha(stat.color, 0.5)}`
                        }}>
                          <stat.icon sx={{ fontSize: 28 }} />
                        </Avatar>
                        <Chip 
                          label={stat.trend}
                          size="small"
                          sx={{
                            background: stat.trend.startsWith('+') ? alpha('#00E676', 0.2) : alpha('#4CAF50', 0.2),
                            color: stat.trend.startsWith('+') ? '#00E676' : '#4CAF50',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      
                      <Typography variant="h4" sx={{
                        fontWeight: 700,
                        color: stat.color,
                        textShadow: `0 0 10px ${alpha(stat.color, 0.3)}`,
                        mb: 1
                      }}>
                        {stat.value}
                      </Typography>
                      
                      <Typography color="textSecondary" sx={{ fontWeight: 500, mb: 2 }}>
                        {stat.title}
                      </Typography>
                      
                      <LinearProgress
                        value={data.trees.total > 0 ? (stat.value / data.trees.total) * 100 : 0}
                        variant="determinate"
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: alpha(stat.color, 0.2),
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(45deg, ${stat.color}, ${alpha(stat.color, 0.8)})`,
                            borderRadius: 4,
                          }
                        }}
                      />
                    </CardContent>
                  </HolographicCard>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Qualité des données */}
        {userRole === 'admin' && (data.trees.complete !== undefined || data.trees.incomplete !== undefined) && (
          <Grid item xs={12} md={6}>
            <Fade in timeout={1800}>
              <GlassmorphicPaper sx={{ p: 3, height: 350 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <InsightsIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Qualité des Données
                  </Typography>
                  <Badge 
                    badgeContent={`${calculateCompletionRate()}%`} 
                    color={calculateCompletionRate() > 80 ? 'success' : calculateCompletionRate() > 60 ? 'warning' : 'error'}
                    sx={{ ml: 'auto' }}
                  >
                    <DataUsageIcon sx={{ color: theme.palette.primary.main }} />
                  </Badge>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <HolographicCard sx={{ textAlign: 'center', p: 2 }}>
                      <Avatar sx={{
                        bgcolor: '#00E676',
                        width: 48,
                        height: 48,
                        margin: '0 auto 8px',
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)'
                      }}>
                        <CheckCircle />
                      </Avatar>
                      <Typography variant="h5" sx={{ color: '#00E676', fontWeight: 700 }}>
                        {data.trees.complete || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Données Complètes
                      </Typography>
                    </HolographicCard>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <HolographicCard sx={{ textAlign: 'center', p: 2 }}>
                      <Avatar sx={{
                        bgcolor: '#4CAF50',
                        width: 48,
                        height: 48,
                        margin: '0 auto 8px',
                        boxShadow: '0 0 20px rgba(255, 170, 0, 0.5)'
                      }}>
                        <ErrorOutline />
                      </Avatar>
                      <Typography variant="h5" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                        {data.trees.incomplete || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Données Incomplètes
                      </Typography>
                    </HolographicCard>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Taux de Complétude: {calculateCompletionRate()}%
                  </Typography>
                  <LinearProgress
                    value={calculateCompletionRate()}
                    variant="determinate"
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(45deg, #00E676, #4CAF50)`,
                        borderRadius: 6,
                      }
                    }}
                  />
                </Box>
              </GlassmorphicPaper>
            </Fade>
          </Grid>
        )}

        {/* Graphique en secteurs */}
        <Grid item xs={12} md={userRole === 'admin' && (data.trees.complete !== undefined || data.trees.incomplete !== undefined) ? 6 : 6}>
          <Fade in timeout={2000}>
            <CyberChart sx={{ p: 3, height: 350 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Assessment sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Répartition des États
                </Typography>
              </Box>
              <Box sx={{ height: 250, position: 'relative', zIndex: 2 }}>
                <Pie data={pieChartData} options={chartOptions} />
              </Box>
            </CyberChart>
          </Fade>
        </Grid>

        {/* Graphique de tendance */}
        <Grid item xs={12} md={6}>
          <Fade in timeout={2200}>
            <CyberChart sx={{ p: 3, height: 350 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TrendingUp sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Évolution Mensuelle
                </Typography>
              </Box>
              <Box sx={{ height: 250, position: 'relative', zIndex: 2 }}>
                <Line data={lineChartData} options={chartOptions} />
              </Box>
            </CyberChart>
          </Fade>
        </Grid>

        {/* Statistiques utilisateurs (admin seulement) */}
        {userRole === 'admin' && (
          <Grid item xs={12} md={6}>
            <Fade in timeout={2400}>
              <GlassmorphicPaper sx={{ p: 3, height: 350 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <People sx={{ color: theme.palette.secondary.main, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Gestion des Utilisateurs
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <HolographicCard sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            <People />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {data.users.total}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Total Utilisateurs
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label="Actif" color="success" />
                      </Box>
                    </HolographicCard>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <HolographicCard sx={{ textAlign: 'center', p: 2 }}>
                      <Avatar sx={{
                        bgcolor: theme.palette.secondary.main,
                        width: 40,
                        height: 40,
                        margin: '0 auto 8px'
                      }}>
                        <AdminPanelSettings sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.users.admin}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Administrateurs
                      </Typography>
                    </HolographicCard>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <HolographicCard sx={{ textAlign: 'center', p: 2 }}>
                      <Avatar sx={{
                        bgcolor: theme.palette.info.main,
                        width: 40,
                        height: 40,
                        margin: '0 auto 8px'
                      }}>
                        <People sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {data.users.user}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Utilisateurs
                      </Typography>
                    </HolographicCard>
                  </Grid>
                </Grid>
              </GlassmorphicPaper>
            </Fade>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
