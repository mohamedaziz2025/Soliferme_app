import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Alert,
} from '@mui/material';
import axios from 'axios';

interface AddTreeFormProps {
  onTreeAdded: () => void;
}

interface FormData {
  treeId: string;
  treeType: string;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  };
  location: {
    latitude: string;
    longitude: string;
  };
}

const AddTreeForm: React.FC<AddTreeFormProps> = ({ onTreeAdded }) => {
  const [formData, setFormData] = useState<FormData>({
    treeId: '',
    treeType: '',
    owner: {
      firstName: '',
      lastName: '',
      email: '',
    },
    location: {
      latitude: '',
      longitude: '',
    },
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.') as [keyof FormData, string];
      if (parent === 'owner' || parent === 'location') {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://backend:5000/api/trees',
        {
          ...formData,
          location: {
            latitude: parseFloat(formData.location.latitude),
            longitude: parseFloat(formData.location.longitude)
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSuccess('Arbre ajouté avec succès ! Il apparaît maintenant sur la carte.');
      setError('');
      setFormData({
        treeId: '',
        treeType: '',
        owner: {
          firstName: '',
          lastName: '',
          email: '',
        },
        location: {
          latitude: '',
          longitude: '',
        },
      });
      
      // Call the callback to refresh the tree list
      onTreeAdded();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error adding tree:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erreur lors de l\'ajout de l\'arbre. Veuillez réessayer.');
      }
      setSuccess('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Ajouter un nouvel arbre
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="ID de l'arbre"
              name="treeId"
              value={formData.treeId}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Type d'arbre"
              name="treeType"
              value={formData.treeType}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Prénom du propriétaire"
              name="owner.firstName"
              value={formData.owner.firstName}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Nom du propriétaire"
              name="owner.lastName"
              value={formData.owner.lastName}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Email du propriétaire"
              name="owner.email"
              type="email"
              value={formData.owner.email}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Latitude"
              name="location.latitude"
              type="number"
              value={formData.location.latitude}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Longitude"
              name="location.longitude"
              type="number"
              value={formData.location.longitude}
              onChange={handleChange}
              required
            />
          </Grid>
        </Grid>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Ajout en cours...' : 'Ajouter l\'arbre'}
        </Button>
      </Box>
    </Paper>
  );
};

export default AddTreeForm;
