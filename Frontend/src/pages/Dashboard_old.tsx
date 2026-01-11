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
  Divider,
  useTheme,
  alpha,
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
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  // CategoryScale, (removed as it may not exist in the installed version)
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
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
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardStats {
  totalTrees: number;
  treesWithFruits: number;
  healthyTrees: number;
  needsAttention: number;
  warningTrees?: number;
  criticalTrees?: number;
  archivedTrees?: number;
  monthlyGrowth: {
    labels: string[];
    data: number[];
  };
  healthDistribution: {
    labels: string[];
    data: number[];
  };
  platformStats?: {
    totalUsers: number;
    totalAdmins: number;
    regularUsers: number;
    totalTreesEverCreated: number;
    archivedTrees: number;
    incompleteDataTrees: number;
    completeDataTrees: number;
  };
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const theme = useTheme();

  useEffect(() => {
    // Récupérer le rôle et le nom de l'utilisateur
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role);
      setUserName(payload.name || payload.email);
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const [treesResponse, healthResponse] = await Promise.all([
          axios.get('http://72.62.71.97:35000/api/trees/stats', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://72.62.71.97:35000/api/trees/health-distribution', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const trees = treesResponse.data;
        const health = healthResponse.data;

        // Mock data for monthly growth
        const monthlyGrowth = {
          labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
          data: [12, 19, 15, 25, 22, 30]
        };

        let platformStats = {};
        
        // Fetch platform stats for admin users
        if (userRole === 'admin') {
          try {
            const platformResponse = await axios.get('http://72.62.71.97:35000/api/platform/stats', {
              headers: { Authorization: `Bearer ${token}` }
            });
            platformStats = platformResponse.data;
          } catch (error) {
            console.warn('Platform stats not available:', error);
          }
        }

        setStats({
          totalTrees: trees.total || 0,
          treesWithFruits: trees.withFruits || 0,
          healthyTrees: trees.healthy || 0,
          needsAttention: trees.needsAttention || 0,
          warningTrees: trees.warning || 0,
          criticalTrees: trees.critical || 0,
          archivedTrees: trees.archived || 0,
          monthlyGrowth,
          healthDistribution: health,
          platformStats: Object.keys(platformStats).length > 0 ? platformStats as DashboardStats['platformStats'] : undefined
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchStats();
    }
  }, [userRole]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (!stats) {
    return (
      <Container>
        <Typography variant="h6" color="error">
          Erreur lors du chargement des statistiques
        </Typography>
      </Container>
    );
  }

  // Configuration des graphiques
  const pieChartData = {
    labels: stats.healthDistribution.labels,
    datasets: [
      {
        data: stats.healthDistribution.data,
        backgroundColor: [
          alpha(theme.palette.success.main, 0.8),
          alpha(theme.palette.warning.main, 0.8),
          alpha(theme.palette.error.main, 0.8),
          alpha(theme.palette.grey[500], 0.8),
        ],
        borderColor: [
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.error.main,
          theme.palette.grey[500],
        ],
        borderWidth: 2,
      },
    ],
  };

  const lineChartData = {
    labels: stats.monthlyGrowth.labels,
    datasets: [
      {
        label: 'Arbres ajoutés',
        data: stats.monthlyGrowth.data,
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
        borderWidth: 2,
        fill: true,
        tension: 0.3,
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
        },
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.palette.text.secondary,
        },
        grid: {
          color: alpha(theme.palette.divider, 0.3),
        },
      },
      x: {
        ticks: {
          color: theme.palette.text.secondary,
        },
        grid: {
          color: alpha(theme.palette.divider, 0.3),
        },
      },
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
          📊 Tableau de Bord
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Vue d'ensemble de votre jardin urbain • Bonjour {userName}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Statistiques principales */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <TreeIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 1 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 1 }}>
                  {stats.totalTrees}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total des arbres
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <CheckCircle sx={{ fontSize: 40, color: theme.palette.success.main, mr: 1 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.success.main, mb: 1 }}>
                  {stats.healthyTrees}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  En bonne santé
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <Warning sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 1 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.warning.main, mb: 1 }}>
                  {stats.needsAttention}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Nécessite attention
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <LocalFlorist sx={{ fontSize: 40, color: theme.palette.secondary.main, mr: 1 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main, mb: 1 }}>
                  {stats.treesWithFruits}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Avec fruits
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Graphiques */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Assessment sx={{ mr: 1, color: theme.palette.primary.main }} />
              Répartition de la santé
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={pieChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TrendingUp sx={{ mr: 1, color: theme.palette.primary.main }} />
              Évolution mensuelle
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={lineChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Statistiques avancées pour admin */}
        {userRole === 'admin' && stats.platformStats && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                  📈 Statistiques Plateforme (Admin)
                </Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <People sx={{ fontSize: 40, color: theme.palette.info.main }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.info.main, mb: 1 }}>
                  {stats.platformStats.totalUsers}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Utilisateurs Total
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <AdminPanelSettings sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.secondary.main, mb: 1 }}>
                  {stats.platformStats.totalAdmins}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Administrateurs
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <Nature sx={{ fontSize: 40, color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.success.main, mb: 1 }}>
                  {stats.platformStats.completeDataTrees || 0}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Données Complètes
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <ErrorOutline sx={{ fontSize: 40, color: theme.palette.warning.main }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.warning.main, mb: 1 }}>
                  {stats.platformStats.incompleteDataTrees || 0}
                </Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  Données Incomplètes
                </Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
