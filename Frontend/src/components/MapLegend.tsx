import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip,
  Stack
} from '@mui/material';
import { 
  Circle as CircleIcon
} from '@mui/icons-material';

const MapLegend: React.FC = () => {
  const legendItems = [
    { status: 'healthy', label: 'En bonne santé', color: '#4CAF50' },
    { status: 'warning', label: 'À surveiller', color: '#FF9800' },
    { status: 'critical', label: 'Critique', color: '#F44336' },
    { status: 'archived', label: 'Archivé', color: '#9E9E9E' },
  ];

  return (
    <Paper 
      sx={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        p: 2, 
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Légende
      </Typography>
      <Stack spacing={1}>
        {legendItems.map((item) => (
          <Box 
            key={item.status} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1 
            }}
          >
            <CircleIcon 
              sx={{ 
                color: item.color, 
                fontSize: 16 
              }} 
            />
            <Typography variant="caption">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
};

export default MapLegend;
