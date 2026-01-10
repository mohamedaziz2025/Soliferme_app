import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  MenuItem,
  Alert,
  Card,
} from '@mui/material';
import axios from 'axios';

interface EditTreeFormProps {
  treeId: string;
  onTreeUpdated: () => void;
}

interface TreeData {
  treeId: string;
  treeType: string;
  status: 'healthy' | 'warning' | 'critical';
  location: {
    latitude: number;
    longitude: number;
  };
  measurements: {
    height: number;
    width: number;
    approximateShape: string;
  };
  fruits: {
    present: boolean;
    estimatedQuantity: number;
  };
  ownerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const EditTreeForm: React.FC<EditTreeFormProps> = ({ treeId, onTreeUpdated }) => {
  const [formData, setFormData] = useState<TreeData>({
    treeId: '',
    treeType: '',
    status: 'healthy',
    location: {
      latitude: 0,
      longitude: 0,
    },
    measurements: {
      height: 0,
      width: 0,
      approximateShape: '',
    },
    fruits: {
      present: false,
      estimatedQuantity: 0,
    },
    ownerInfo: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTreeData();
  }, [treeId]);

  const fetchTreeData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://backend:5000/api/trees/${treeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFormData({
        treeId: response.data.treeId || '',
        treeType: response.data.treeType || '',
        status: response.data.status || 'healthy',
        location: {
          latitude: Number(response.data.location?.latitude) || 0,
          longitude: Number(response.data.location?.longitude) || 0,
        },
        measurements: {
          height: Number(response.data.measurements?.height) || 0,
          width: Number(response.data.measurements?.width) || 0,
          approximateShape: response.data.measurements?.approximateShape || '',
        },
        fruits: {
          present: Boolean(response.data.fruits?.present),
          estimatedQuantity: Number(response.data.fruits?.estimatedQuantity) || 0,
        },
        ownerInfo: {
          firstName: response.data.ownerInfo?.firstName || '',
          lastName: response.data.ownerInfo?.lastName || '',
          email: response.data.ownerInfo?.email || '',
        },
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await axios.put(
        `http://backend:5000/api/trees/${treeId}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      onTreeUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: section === 'measurements' ? {
          ...prev.measurements,
          [field]: type === 'number' ? Number(value) : value
        } : section === 'fruits' ? {
          ...prev.fruits,
          [field]: type === 'number' ? Number(value) : value
        } : section === 'ownerInfo' ? {
          ...prev.ownerInfo,
          [field]: value
        } : section === 'location' ? {
          ...prev.location,
          [field]: type === 'number' ? Number(value) : value
        } : value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFruitsPresentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      fruits: {
        ...prev.fruits,
        present: e.target.checked,
        estimatedQuantity: e.target.checked ? prev.fruits.estimatedQuantity : 0
      }
    }));
  };

  if (loading) return <Typography>Chargement...</Typography>;

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Modifier les informations de l'arbre
            </Typography>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </Grid>
          )}

          {/* ID de l'arbre */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ID de l'arbre"
              name="treeId"
              value={formData.treeId}
              onChange={handleInputChange}
              required
              error={!formData.treeId}
              helperText={!formData.treeId ? 'L\'ID de l\'arbre est requis (3-9 chiffres)' : 'Format: nombre de 3 à 9 chiffres'}
              inputProps={{
                pattern: "\\d{3,9}",
                title: "L'ID doit être un nombre de 3 à 9 chiffres"
              }}
            />
          </Grid>

          {/* Coordonnées GPS */}
          <Grid item xs={12}>
            <Card sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Coordonnées GPS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    name="location.latitude"
                    type="number"
                    value={formData.location.latitude}
                    onChange={handleInputChange}
                    required
                    inputProps={{ 
                      min: -90, 
                      max: 90, 
                      step: "0.000001" 
                    }}
                    error={formData.location.latitude < -90 || formData.location.latitude > 90}
                    helperText={
                      formData.location.latitude < -90 || formData.location.latitude > 90 
                        ? 'La latitude doit être entre -90 et 90' 
                        : 'Coordonnée nord-sud (-90 à 90)'
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    name="location.longitude"
                    type="number"
                    value={formData.location.longitude}
                    onChange={handleInputChange}
                    required
                    inputProps={{ 
                      min: -180, 
                      max: 180, 
                      step: "0.000001" 
                    }}
                    error={formData.location.longitude < -180 || formData.location.longitude > 180}
                    helperText={
                      formData.location.longitude < -180 || formData.location.longitude > 180 
                        ? 'La longitude doit être entre -180 et 180' 
                        : 'Coordonnée est-ouest (-180 à 180)'
                    }
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Informations du propriétaire
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Prénom"
                    name="ownerInfo.firstName"
                    value={formData.ownerInfo.firstName}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Nom"
                    name="ownerInfo.lastName"
                    value={formData.ownerInfo.lastName}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="ownerInfo.email"
                    type="email"
                    value={formData.ownerInfo.email}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Type d'arbre"
              name="treeType"
              value={formData.treeType}
              onChange={handleInputChange}
              required
              error={!formData.treeType}
              helperText={!formData.treeType ? 'Le type d\'arbre est requis' : ''}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="État"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              <MenuItem value="healthy">En bonne santé</MenuItem>
              <MenuItem value="warning">À surveiller</MenuItem>
              <MenuItem value="critical">Critique</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Hauteur (m)"
              name="measurements.height"
              type="number"
              value={formData.measurements.height}
              onChange={handleInputChange}
              inputProps={{ min: 0, step: "0.1" }}
              required
              error={formData.measurements.height < 0}
              helperText={formData.measurements.height < 0 ? 'La hauteur doit être positive' : ''}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Largeur (m)"
              name="measurements.width"
              type="number"
              value={formData.measurements.width}
              onChange={handleInputChange}
              inputProps={{ min: 0, step: "0.1" }}
              required
              error={formData.measurements.width < 0}
              helperText={formData.measurements.width < 0 ? 'La largeur doit être positive' : ''}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Forme approximative"
              name="measurements.approximateShape"
              value={formData.measurements.approximateShape}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.fruits.present}
                  onChange={handleFruitsPresentChange}
                  name="fruits.present"
                />
              }
              label="Présence de fruits"
            />
          </Grid>

          {formData.fruits.present && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantité estimée de fruits"
                name="fruits.estimatedQuantity"
                type="number"
                value={formData.fruits.estimatedQuantity}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
                required
                error={formData.fruits.estimatedQuantity < 0}
                helperText={formData.fruits.estimatedQuantity < 0 ? 'La quantité doit être positive' : ''}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => onTreeUpdated()}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSaving}
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default EditTreeForm;
