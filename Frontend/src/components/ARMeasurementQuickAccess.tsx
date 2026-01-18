import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  Grid,
  Chip,
  Divider,
  styled,
  alpha
} from '@mui/material';
import { 
  Straighten as MeasureIcon,
  Height,
  Straighten as WidthIcon,
  CameraAlt,
  CheckCircle,
  Info
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const GlowingCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.main, 0.15)} 0%, 
    ${alpha(theme.palette.secondary.main, 0.15)} 100%)`,
  backdropFilter: 'blur(10px)',
  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  borderRadius: '20px',
  position: 'relative',
  overflow: 'visible',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, 
      ${theme.palette.primary.main}, 
      ${theme.palette.secondary.main}, 
      ${theme.palette.primary.main})`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 3s linear infinite',
  },
  '@keyframes shimmer': {
    '0%': { backgroundPosition: '200% 0' },
    '100%': { backgroundPosition: '-200% 0' },
  },
}));

const ARMeasurementQuickAccess: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Height sx={{ fontSize: 30 }} />,
      title: 'Hauteur',
      description: 'Mesurez la hauteur de vos arbres',
      color: '#00e676'
    },
    {
      icon: <WidthIcon sx={{ fontSize: 30 }} />,
      title: 'Largeur',
      description: 'Diamètre de la couronne',
      color: '#4caf50'
    },
    {
      icon: <CameraAlt sx={{ fontSize: 30 }} />,
      title: 'Temps réel',
      description: 'Mesure instantanée avec AR',
      color: '#66bb6a'
    }
  ];

  return (
    <GlowingCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #00e676, #4caf50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)',
              }}
            >
              <MeasureIcon sx={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                📏 Mesure AR des Arbres
              </Typography>
              <Chip 
                label="Nouveau" 
                color="success" 
                size="small" 
                icon={<CheckCircle />}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" paragraph>
          Mesurez vos arbres en temps réel avec la technologie de Réalité Augmentée.
          Utilisez votre caméra pour obtenir des mesures précises de hauteur, largeur et circonférence.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(feature.color, 0.1),
                  border: `1px solid ${alpha(feature.color, 0.3)}`,
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(feature.color, 0.15),
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <Box sx={{ color: feature.color, mb: 1 }}>
                  {feature.icon}
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {feature.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ 
          bgcolor: alpha('#00e676', 0.1), 
          p: 2, 
          borderRadius: 2, 
          border: `1px solid ${alpha('#00e676', 0.3)}`,
          mb: 2 
        }}>
          <Box display="flex" alignItems="flex-start" gap={1}>
            <Info sx={{ fontSize: 20, color: '#00e676', mt: 0.3 }} />
            <Box>
              <Typography variant="body2" fontWeight="600" gutterBottom>
                Comment ça marche ?
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                1. Activez votre caméra<br />
                2. Positionnez-vous à 2-5m de l'arbre<br />
                3. Cliquez sur deux points pour mesurer<br />
                4. Enregistrez vos résultats
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<MeasureIcon />}
              onClick={() => navigate('/ar-measurement')}
              sx={{
                background: 'linear-gradient(45deg, #00e676, #4caf50)',
                color: '#fff',
                fontWeight: 'bold',
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #66ffa6, #81c784)',
                  boxShadow: '0 6px 30px rgba(0, 230, 118, 0.5)',
                },
              }}
            >
              Commencer à mesurer
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<Info />}
              onClick={() => window.open('/AR_MEASUREMENT_GUIDE.md', '_blank')}
              sx={{
                borderColor: '#00e676',
                color: '#00e676',
                fontWeight: 'bold',
                py: 1.5,
                borderRadius: 2,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  borderColor: '#4caf50',
                  bgcolor: alpha('#00e676', 0.05),
                },
              }}
            >
              Guide d'utilisation
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </GlowingCard>
  );
};

export default ARMeasurementQuickAccess;
