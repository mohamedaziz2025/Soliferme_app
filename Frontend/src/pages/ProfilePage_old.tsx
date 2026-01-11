import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Grid,
  MenuItem,
} from '@mui/material';
import axios from 'axios';
import { validation, validateFormField } from '../utils/validation';

interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: string;
  language: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    language: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const response = await axios.get('http://72.62.71.97:35000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setFormData(prev => ({
        ...prev,
        name: response.data.name,
        language: response.data.language,
      }));
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError('Erreur lors de la récupération du profil');
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    const nameError = validateFormField(formData.name, validation.name);
    if (nameError) newErrors.name = nameError;

    const languageError = validateFormField(formData.language, validation.language);
    if (languageError) newErrors.language = languageError;

    // Validate password only if a new password is being set
    if (formData.newPassword) {
      const currentPasswordError = validateFormField(formData.currentPassword, validation.currentPassword);
      if (currentPasswordError) newErrors.currentPassword = currentPasswordError;

      const newPasswordError = validateFormField(formData.newPassword, validation.password);
      if (newPasswordError) newErrors.newPassword = newPasswordError;

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const updateData = {
        name: formData.name,
        language: formData.language,
        ...(formData.newPassword && {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      };

      await axios.put(
        'http://72.62.71.97:35000/api/auth/profile',
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Profil mis à jour avec succès');
      // Réinitialiser les champs de mot de passe
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      fetchProfile(); // Recharger les données du profil
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Erreur lors de la mise à jour du profil');
      }
    }
  };

  if (!profile) {
    return (
      <Container maxWidth="sm">
        <Typography>Chargement du profil...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Mon Profil
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Email"
                value={profile.email}
                disabled
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Nom"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                label="Langue"
                name="language"
                value={formData.language}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.language}
                helperText={errors.language}
              >
                <MenuItem value="fr">Français</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">العربية</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Changer le mot de passe
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Mot de passe actuel"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                fullWidth
                error={!!errors.currentPassword}
                helperText={errors.currentPassword}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Nouveau mot de passe"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                fullWidth
                error={!!errors.newPassword}
                helperText={errors.newPassword}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Confirmer le nouveau mot de passe"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
              />
            </Grid>

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}

            {success && (
              <Grid item xs={12}>
                <Alert severity="success">{success}</Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
              >
                Mettre à jour le profil
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;