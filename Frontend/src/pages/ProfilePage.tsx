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
  Avatar,
  Card,
  CardContent,
  Divider,
  Fade,
  Zoom,
  useTheme,
  styled,
  alpha,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  Email as EmailIcon,
  AutoAwesome as AutoAwesomeIcon,
  AccountCircle as AccountIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { validation, validateFormField } from '../utils/validation';

interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: string;
  language: string;
}

// Styled Components for Ultra Modern Design
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
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
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

const CyberButton = styled(Button)(({ theme }) => ({
  borderRadius: '16px',
  padding: '12px 24px',
  fontWeight: 600,
  textTransform: 'none',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  boxShadow: `
    0 4px 20px ${alpha(theme.palette.primary.main, 0.3)},
    inset 0 1px 0 ${alpha('#ffffff', 0.1)}
  `,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: `
      0 8px 30px ${alpha(theme.palette.primary.main, 0.4)},
      inset 0 1px 0 ${alpha('#ffffff', 0.2)}
    `,
  },
}));

const NeonTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '& fieldset': {
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      transition: 'all 0.3s ease',
    },
    '&:hover fieldset': {
      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
      boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
    '&.Mui-focused fieldset': {
      border: `2px solid ${theme.palette.primary.main}`,
      boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.primary.main,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
}));

const ProfileCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(15px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: '20px',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '6px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: '20px 20px 0 0',
  },
}));

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
  const [loading, setLoading] = useState<boolean>(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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

      setSuccess('Profil mis à jour avec succès !');
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

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 25) return theme.palette.error.main;
    if (strength <= 50) return theme.palette.warning.main;
    if (strength <= 75) return theme.palette.info.main;
    return theme.palette.success.main;
  };

  const getStrengthLabel = (strength: number) => {
    if (strength <= 25) return 'Faible';
    if (strength <= 50) return 'Moyen';
    if (strength <= 75) return 'Fort';
    return 'Très fort';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          py: 8,
          gap: 2
        }}>
          <LinearProgress 
            sx={{ 
              width: 300, 
              borderRadius: 2,
              height: 6,
              background: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            ⚡ Chargement du profil...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Impossible de charger le profil utilisateur
        </Alert>
      </Container>
    );
  }

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
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
              <AccountIcon sx={{ fontSize: 32 }} />
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
                👤 Mon Profil
              </Typography>
              <Typography variant="h6" sx={{ 
                color: theme.palette.text.secondary,
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}>
                <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                Gestion personnalisée de votre compte
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Grid container spacing={4}>
        {/* Informations du profil */}
        <Grid item xs={12} md={4}>
          <Zoom in timeout={1200}>
            <ProfileCard>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ 
                  width: 120, 
                  height: 120, 
                  margin: '0 auto 16px',
                  background: profile.role === 'admin' ? 
                    'linear-gradient(45deg, #FF6B35, #F7931E)' : 
                    'linear-gradient(45deg, #4CAF50, #8BC34A)',
                  boxShadow: `0 0 30px ${alpha(
                    profile.role === 'admin' ? '#FF6B35' : '#4CAF50', 
                    0.4
                  )}`,
                  fontSize: '48px'
                }}>
                  {profile.name.charAt(0).toUpperCase()}
                </Avatar>
                
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {profile.name}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    icon={profile.role === 'admin' ? <SecurityIcon /> : <PersonIcon />}
                    label={profile.role === 'admin' ? '👑 Administrateur' : '👤 Utilisateur'}
                    color={profile.role === 'admin' ? 'secondary' : 'primary'}
                    sx={{
                      fontWeight: 600,
                      background: profile.role === 'admin' ? 
                        'linear-gradient(45deg, #FF6B35, #F7931E)' : 
                        'linear-gradient(45deg, #4CAF50, #8BC34A)',
                      color: 'white',
                    }}
                  />
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2,
                  mt: 3,
                  p: 2,
                  background: alpha(theme.palette.primary.main, 0.05),
                  borderRadius: '12px',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                    {profile.email}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary">
                      Langue
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {profile.language === 'fr' ? '🇫🇷 Français' : 
                     profile.language === 'en' ? '🇺🇸 English' : 
                     profile.language === 'ar' ? '🇹🇳 العربية' : profile.language}
                  </Typography>
                </Box>
              </CardContent>
            </ProfileCard>
          </Zoom>
        </Grid>

        {/* Formulaire de modification */}
        <Grid item xs={12} md={8}>
          <Fade in timeout={1400}>
            <GlassmorphicPaper sx={{ p: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                mb: 4,
                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                pb: 2
              }}>
                <EditIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  ✏️ Modifier le Profil
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  {/* Informations personnelles */}
                  <Grid item xs={12}>
                    <HolographicCard>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ 
                          mb: 3, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: theme.palette.primary.main,
                          fontWeight: 600
                        }}>
                          <PersonIcon />
                          👤 Informations Personnelles
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <NeonTextField
                              label="📧 Adresse Email"
                              value={profile.email}
                              disabled
                              fullWidth
                              variant="outlined"
                              InputProps={{
                                startAdornment: <EmailIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />,
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              L'email ne peut pas être modifié
                            </Typography>
                          </Grid>

                          <Grid item xs={12}>
                            <NeonTextField
                              label="👤 Nom Complet"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              fullWidth
                              required
                              error={!!errors.name}
                              helperText={errors.name}
                              InputProps={{
                                startAdornment: <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />,
                              }}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <NeonTextField
                              select
                              label="🌍 Langue Préférée"
                              name="language"
                              value={formData.language}
                              onChange={handleChange}
                              fullWidth
                              required
                              error={!!errors.language}
                              helperText={errors.language}
                              InputProps={{
                                startAdornment: <LanguageIcon sx={{ mr: 1, color: theme.palette.primary.main }} />,
                              }}
                            >
                              <MenuItem value="fr">🇫🇷 Français</MenuItem>
                              <MenuItem value="en">🇺🇸 English</MenuItem>
                              <MenuItem value="ar">🇹🇳 العربية</MenuItem>
                            </NeonTextField>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </HolographicCard>
                  </Grid>

                  {/* Sécurité et mot de passe */}
                  <Grid item xs={12}>
                    <HolographicCard>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ 
                          mb: 3, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: theme.palette.secondary.main,
                          fontWeight: 600
                        }}>
                          <LockIcon />
                          🔒 Sécurité & Mot de Passe
                        </Typography>
                        
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <NeonTextField
                              label="🔐 Mot de passe actuel"
                              name="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={formData.currentPassword}
                              onChange={handleChange}
                              fullWidth
                              error={!!errors.currentPassword}
                              helperText={errors.currentPassword || "Requis uniquement pour changer de mot de passe"}
                              InputProps={{
                                startAdornment: <LockIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />,
                                endAdornment: (
                                  <Tooltip title={showCurrentPassword ? "Masquer" : "Afficher"}>
                                    <IconButton
                                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                      edge="end"
                                      size="small"
                                    >
                                      {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                  </Tooltip>
                                ),
                              }}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <NeonTextField
                              label="🔑 Nouveau mot de passe"
                              name="newPassword"
                              type={showNewPassword ? 'text' : 'password'}
                              value={formData.newPassword}
                              onChange={handleChange}
                              fullWidth
                              error={!!errors.newPassword}
                              helperText={errors.newPassword}
                              InputProps={{
                                startAdornment: <SecurityIcon sx={{ mr: 1, color: theme.palette.secondary.main }} />,
                                endAdornment: (
                                  <Tooltip title={showNewPassword ? "Masquer" : "Afficher"}>
                                    <IconButton
                                      onClick={() => setShowNewPassword(!showNewPassword)}
                                      edge="end"
                                      size="small"
                                    >
                                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                  </Tooltip>
                                ),
                              }}
                            />
                            {formData.newPassword && (
                              <Box sx={{ mt: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Force du mot de passe:
                                  </Typography>
                                  <Chip
                                    label={getStrengthLabel(passwordStrength)}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: getStrengthColor(passwordStrength),
                                      color: 'white',
                                      fontSize: '10px'
                                    }}
                                  />
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={passwordStrength}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: alpha(theme.palette.grey[300], 0.3),
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: getStrengthColor(passwordStrength),
                                      borderRadius: 3,
                                    },
                                  }}
                                />
                              </Box>
                            )}
                          </Grid>

                          <Grid item xs={12}>
                            <NeonTextField
                              label="✅ Confirmer le nouveau mot de passe"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              fullWidth
                              error={!!errors.confirmPassword}
                              helperText={errors.confirmPassword}
                              InputProps={{
                                startAdornment: (
                                  <Box sx={{ mr: 1, color: formData.confirmPassword && formData.newPassword === formData.confirmPassword ? theme.palette.success.main : theme.palette.secondary.main }}>
                                    {formData.confirmPassword && formData.newPassword === formData.confirmPassword ? <CheckIcon /> : <WarningIcon />}
                                  </Box>
                                ),
                                endAdornment: (
                                  <Tooltip title={showConfirmPassword ? "Masquer" : "Afficher"}>
                                    <IconButton
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      edge="end"
                                      size="small"
                                    >
                                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                  </Tooltip>
                                ),
                              }}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </HolographicCard>
                  </Grid>

                  {/* Messages d'état */}
                  {error && (
                    <Grid item xs={12}>
                      <Alert 
                        severity="error" 
                        sx={{ 
                          background: alpha(theme.palette.error.main, 0.1),
                          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                          borderRadius: '12px'
                        }}
                      >
                        {error}
                      </Alert>
                    </Grid>
                  )}

                  {success && (
                    <Grid item xs={12}>
                      <Alert 
                        severity="success"
                        sx={{ 
                          background: alpha(theme.palette.success.main, 0.1),
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                          borderRadius: '12px'
                        }}
                      >
                        {success}
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <CyberButton
                        type="submit"
                        size="large"
                        startIcon={<SaveIcon />}
                        sx={{ 
                          minWidth: '200px',
                          fontSize: '16px',
                          py: 1.5
                        }}
                      >
                        💾 Mettre à jour le profil
                      </CyberButton>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </GlassmorphicPaper>
          </Fade>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
