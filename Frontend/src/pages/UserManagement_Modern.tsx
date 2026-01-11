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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Collapse,
  Chip,
  Select,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Avatar,
  Card,
  CardContent,
  Grid,
  Fade,
  Zoom,
  Badge,
  Tooltip,
  useTheme,
  styled,
  alpha,
  LinearProgress,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Add as AddIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Language as LanguageIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  AutoAwesome as AutoAwesomeIcon,
  Groups as GroupsIcon,
  SupervisorAccount as SupervisorIcon,
  PersonAdd as PersonAddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { message } from 'antd';
import downloadTreeImportTemplate from '../utils/downloadTemplate';
import { parseXlsxFile, parseCsvString, getProblemsForPayload, isPayloadValid, getValidPayloads, TreePayload } from '../utils/transformImport';
import ImportPreview from '../components/ImportPreview';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  language: string;
  createdAt: string;
  archived: boolean;
  trees?: Array<{
    treeId: string;
    status: string;
    type: string;
  }>;
}

interface ReassignModalProps {
  visible: boolean;
  fromUserId: string;
  onCancel: () => void;
  onSuccess: () => void;
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

const UserCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(15px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: '16px 16px 0 0',
  },
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const ReassignModal: React.FC<ReassignModalProps> = ({ visible, fromUserId, onCancel, onSuccess }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get<User[]>('http://72.62.71.97:35000/api/auth/users');
      setUsers(response.data.filter((user: User) => user._id !== fromUserId));
    } catch (error) {
      setError('Failed to fetch users');
    }
  };

  const handleReassign = async () => {
    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('http://72.62.71.97:35000/api/trees/reassign', {
        fromUserId,
        toUserId: selectedUserId
      });
      onSuccess();
    } catch (error) {
      setError('Failed to reassign trees');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={visible} 
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: '20px',
          boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
        }
      }}
    >
      <DialogTitle sx={{ 
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Avatar sx={{ 
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` 
        }}>
          <PersonAddIcon />
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          🔄 Réassigner les Arbres
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              background: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              borderRadius: '12px'
            }}
          >
            {error}
          </Alert>
        )}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel sx={{ color: theme.palette.primary.main }}>
            Sélectionner le nouveau propriétaire
          </InputLabel>
          <Select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            label="Sélectionner le nouveau propriétaire"
            sx={{
              borderRadius: '12px',
              background: alpha(theme.palette.background.paper, 0.8),
              '& .MuiOutlinedInput-notchedOutline': {
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            {users.map(user => (
              <MenuItem key={user._id} value={user._id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32,
                    background: user.role === 'admin' ? 
                      'linear-gradient(45deg, #FF6B35, #F7931E)' : 
                      'linear-gradient(45deg, #4CAF50, #8BC34A)'
                  }}>
                    {user.role === 'admin' ? <AdminIcon sx={{ fontSize: 16 }} /> : <PersonIcon sx={{ fontSize: 16 }} />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button 
          onClick={onCancel}
          sx={{
            borderRadius: '12px',
            color: theme.palette.text.secondary,
            border: `1px solid ${alpha(theme.palette.text.secondary, 0.2)}`,
            '&:hover': {
              background: alpha(theme.palette.text.secondary, 0.1),
            }
          }}
        >
          Annuler
        </Button>
        <CyberButton
          disabled={loading}
          onClick={handleReassign}
          startIcon={loading ? <AutoAwesomeIcon /> : <PersonAddIcon />}
        >
          {loading ? 'Réassignation...' : 'Réassigner'}
        </CyberButton>
      </DialogActions>
    </Dialog>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
  language: 'fr',
  archived: false
  });
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPayloads, setPreviewPayloads] = useState<TreePayload[]>([]);
  const theme = useTheme();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter]);

  const filterUsers = () => {
    let filtered = [...users];
    
    // Appliquer le filtre de recherche
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Appliquer le filtre de rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      const response = await axios.get('http://72.62.71.97:35000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Récupérer les arbres pour chaque utilisateur
      const usersWithTrees = await Promise.all(response.data.map(async (user: User) => {
        try {
          const treesResponse = await axios.get(
            `http://72.62.71.97:35000/api/trees/owner/${encodeURIComponent(user.email)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // Backend returns { trees: [...], stats: {...} } — ensure we store an array
          const treesData = Array.isArray(treesResponse.data)
            ? treesResponse.data
            : (treesResponse.data?.trees || []);
          return { ...user, trees: treesData };
        } catch (error) {
          return { ...user, trees: [] };
        }
      }));

      setUsers(usersWithTrees);
      setError('');
    } catch (error: any) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 403) {
        setError('Accès non autorisé. Seuls les administrateurs peuvent gérer les utilisateurs.');
      } else {
        setError('Erreur lors de la récupération des utilisateurs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (user?: User) => {
    setError('');
    if (user) {
      setEditUser(user);
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        role: user.role,
  language: user.language,
  archived: user.archived || false
      });
    } else {
      setEditUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
  language: 'fr',
  archived: false
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'user',
  language: 'fr',
  archived: false
    });
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editUser) {
        // Modifier un utilisateur existant (admin full update)
        const updates: any = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          language: formData.language,
          archived: formData.archived || false
        };
        if (formData.password) updates.password = formData.password;

        await axios.put(`http://72.62.71.97:35000/api/auth/users/${editUser._id}`, updates, {
          headers: { Authorization: `Bearer ${token}` }
        });
        message.success('Utilisateur modifié avec succès');
      } else {
        // Créer un nouvel utilisateur
        // Admin creation endpoint
        await axios.post('http://72.62.71.97:35000/api/auth/users', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        message.success('Utilisateur créé avec succès');
      }
      
      handleClose();
      fetchUsers();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.response?.data?.message || 'Une erreur est survenue');
    }
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const getTreeStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleArchiveUser = async (userId: string, archived: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://72.62.71.97:35000/api/auth/users/${userId}`, {
        archived
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success(archived ? 'Utilisateur archivé' : 'Utilisateur restauré');
      fetchUsers();
    } catch (error) {
      message.error('Erreur lors de la modification du statut');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://72.62.71.97:35000/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error) {
      message.error('Failed to delete user');
    }
  };

  const handleFileImport = async (file: File) => {
    try {
      let allPayloads: TreePayload[] = [];
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        allPayloads = parseCsvString(text);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        allPayloads = await parseXlsxFile(file);
      } else {
        message.error('Format de fichier non supporté. Utilisez CSV ou XLSX.');
        return;
      }
      
      // Filtrer les lignes valides et compter les rejetées
      const validPayloads = getValidPayloads(allPayloads);
      const rejectedCount = allPayloads.length - validPayloads.length;
      
      if (rejectedCount > 0) {
        message.warning(`${rejectedCount} ligne(s) rejetée(s) car données critiques manquantes (ID ou GPS invalides)`);
      }
      
      if (validPayloads.length === 0) {
        message.error('Aucune ligne valide trouvée dans le fichier. Vérifiez que les colonnes ID et GPS sont correctes.');
        return;
      }
      
      setPreviewPayloads(validPayloads);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Erreur lors du parsing du fichier:', error);
      message.error('Impossible de parser le fichier. Vérifiez le format.');
    }
  };

  const handleImport = async (payloads: TreePayload[]) => {
    try {
      const token = localStorage.getItem('token');
      
      // Envoyer les payloads à l'endpoint d'import du backend
      await axios.post('http://72.62.71.97:35000/api/import/trees', 
        { trees: payloads }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(`Import réussi: ${payloads.length} arbre(s) traité(s)`);
      setPreviewOpen(false);
      fetchUsers(); // Rafraîchir la liste des utilisateurs
    } catch (error: any) {
      console.error('Erreur lors de l\'import:', error);
      if (error.response?.status === 404) {
        message.error('Endpoint d\'import non disponible sur le backend');
      } else {
        message.error(`Erreur lors de l'import: ${error.response?.data?.message || error.message}`);
      }
    }
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
                <GroupsIcon sx={{ fontSize: 32 }} />
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
                  👥 Gestion des Utilisateurs
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: theme.palette.text.secondary,
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}>
                  <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                  Administration avancée des comptes utilisateurs
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <CyberButton
                startIcon={<PersonAddIcon />}
                onClick={() => handleOpen()}
                sx={{ fontSize: '16px', px: 3, py: 1.5 }}
              >
                ➕ Nouvel Utilisateur
              </CyberButton>

              <Button
                variant="outlined"
                onClick={() => downloadTreeImportTemplate()}
                sx={{
                  borderRadius: '12px',
                  px: 2,
                  py: 1,
                  color: theme.palette.primary.main,
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }}
              >
                ⬇️ Télécharger le modèle d'import (CSV)
              </Button>

              <input
                id="file-import-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileImport(file);
                    // Reset input pour permettre de sélectionner le même fichier
                    e.target.value = '';
                  }
                }}
              />
              <label htmlFor="file-import-input">
                <Button
                  component="span"
                  variant="contained"
                  sx={{
                    borderRadius: '12px',
                    px: 2,
                    py: 1,
                    background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  }}
                >
                  ⬆️ Importer un fichier
                </Button>
              </label>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Statistiques utilisateurs */}
      <Fade in timeout={1200}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <HolographicCard>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    width: 56, 
                    height: 56, 
                    background: 'linear-gradient(45deg, #2196F3, #21CBF3)' 
                  }}>
                    <GroupsIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {users.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Utilisateurs
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
                    background: 'linear-gradient(45deg, #FF6B35, #F7931E)' 
                  }}>
                    <SupervisorIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {users.filter(u => u.role === 'admin').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Administrateurs
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
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)' 
                  }}>
                    <PersonIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {users.filter(u => u.role === 'user').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Utilisateurs
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
                    background: 'linear-gradient(45deg, #9C27B0, #E91E63)' 
                  }}>
                    <ArchiveIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {users.filter(u => u.archived).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Archivés
                    </Typography>
                  </Box>
                </CardContent>
              </HolographicCard>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Barre de recherche et filtres */}
      <Fade in timeout={1400}>
        <GlassmorphicPaper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SearchIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                🔍 Recherche & Filtres
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher par nom ou email..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.primary.main }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              />
            </Box>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: theme.palette.primary.main }}>
                <FilterIcon sx={{ mr: 1, fontSize: 16 }} />
                Filtrer par rôle
              </InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                input={<OutlinedInput label="Filtrer par rôle" />}
                sx={{
                  borderRadius: '12px',
                  background: alpha(theme.palette.background.paper, 0.8),
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                <MenuItem value="all">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupsIcon sx={{ fontSize: 16 }} />
                    Tous les utilisateurs
                  </Box>
                </MenuItem>
                <MenuItem value="user">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                    Utilisateurs
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminIcon sx={{ fontSize: 16 }} />
                    Administrateurs
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </GlassmorphicPaper>
      </Fade>

      {error && (
        <Fade in timeout={1600}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              background: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              borderRadius: '12px'
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Liste des utilisateurs en cartes */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress 
              sx={{ 
                width: 300, 
                mb: 2,
                borderRadius: 2,
                height: 6,
                background: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              ⚡ Chargement des utilisateurs...
            </Typography>
          </Box>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredUsers.map((user, index) => (
            <Grid item xs={12} md={6} lg={4} key={user._id}>
              <Zoom 
                in 
                timeout={1000 + index * 100}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <UserCard sx={{ 
                  opacity: user.archived ? 0.6 : 1,
                  filter: user.archived ? 'grayscale(0.3)' : 'none'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Badge 
                        badgeContent={user.trees?.length || 0}
                        color="primary"
                        max={99}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '11px',
                            minWidth: '20px',
                            height: '20px',
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          }
                        }}
                      >
                        <Avatar sx={{ 
                          width: 64, 
                          height: 64,
                          background: user.role === 'admin' ? 
                            'linear-gradient(45deg, #FF6B35, #F7931E)' : 
                            'linear-gradient(45deg, #4CAF50, #8BC34A)',
                          boxShadow: `0 0 20px ${alpha(
                            user.role === 'admin' ? '#FF6B35' : '#4CAF50', 
                            0.4
                          )}`
                        }}>
                          {user.role === 'admin' ? (
                            <AdminIcon sx={{ fontSize: 28 }} />
                          ) : (
                            <PersonIcon sx={{ fontSize: 28 }} />
                          )}
                        </Avatar>
                      </Badge>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {user.name}
                          </Typography>
                          <NeonChip 
                            label={user.role === 'admin' ? '👑 Admin' : '👤 User'} 
                            size="small" 
                            color={user.role === 'admin' ? 'secondary' : 'primary'}
                            sx={{ fontSize: '10px', height: '20px' }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: theme.palette.text.secondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.5
                        }}>
                          <EmailIcon sx={{ fontSize: 14 }} />
                          {user.email}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: alpha(theme.palette.text.secondary, 0.7),
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}>
                          <CalendarIcon sx={{ fontSize: 12 }} />
                          Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<LanguageIcon />}
                        label={user.language.toUpperCase()}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          color: theme.palette.primary.main
                        }}
                      />
                      <Chip 
                        icon={<SecurityIcon />}
                        label={user.archived ? '📁 Archivé' : '✅ Actif'}
                        size="small"
                        color={user.archived ? 'default' : 'success'}
                      />
                    </Box>

                    <Collapse in={expandedUser === user._id}>
                      <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        background: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: '12px',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                      }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          🌳 Arbres associés ({user.trees?.length || 0})
                        </Typography>
                        {user.trees && user.trees.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {user.trees.slice(0, 3).map((tree: any, idx: number) => (
                              <Box key={idx} sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                p: 1,
                                background: alpha(theme.palette.background.paper, 0.6),
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}>
                                <Typography variant="caption">
                                  🌲 {tree.treeId || tree.type || 'Arbre'}
                                </Typography>
                                <NeonChip
                                  label={tree.status || 'N/A'}
                                  size="small"
                                  color={getTreeStatusColor(tree.status)}
                                  sx={{ fontSize: '9px', height: '16px' }}
                                />
                              </Box>
                            ))}
                            {user.trees.length > 3 && (
                              <Typography variant="caption" color="text.secondary">
                                ... et {user.trees.length - 3} autre(s)
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Aucun arbre associé
                          </Typography>
                        )}
                      </Box>
                    </Collapse>

                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mt: 2,
                      pt: 2,
                      borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}>
                      <Tooltip title={expandedUser === user._id ? "Masquer les détails" : "Voir les détails"}>
                        <IconButton
                          size="small"
                          onClick={() => toggleUserExpand(user._id)}
                          sx={{
                            background: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            '&:hover': {
                              background: alpha(theme.palette.primary.main, 0.2),
                              transform: 'scale(1.1)',
                            }
                          }}
                        >
                          {expandedUser === user._id ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </Tooltip>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={() => handleOpen(user)}
                            sx={{
                              background: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.main,
                              '&:hover': {
                                background: alpha(theme.palette.info.main, 0.2),
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={user.archived ? "Restaurer" : "Archiver"}>
                          <IconButton
                            size="small"
                            onClick={() => handleArchiveUser(user._id, !user.archived)}
                            sx={{
                              background: alpha(theme.palette.warning.main, 0.1),
                              color: theme.palette.warning.main,
                              '&:hover': {
                                background: alpha(theme.palette.warning.main, 0.2),
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            {user.archived ? (
                              <UnarchiveIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <ArchiveIcon sx={{ fontSize: 16 }} />
                            )}
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user._id)}
                            sx={{
                              background: alpha(theme.palette.error.main, 0.1),
                              color: theme.palette.error.main,
                              '&:hover': {
                                background: alpha(theme.palette.error.main, 0.2),
                                transform: 'scale(1.1)',
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </UserCard>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}

      {filteredUsers.length === 0 && !loading && (
        <Fade in timeout={1800}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            py: 8,
            gap: 2,
            textAlign: 'center'
          }}>
            <Avatar sx={{ 
              width: 80, 
              height: 80, 
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              fontSize: '40px'
            }}>
              👥
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Aucun utilisateur trouvé
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Aucun utilisateur ne correspond à vos critères de recherche.
            </Typography>
            <CyberButton
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpen()}
              sx={{ mt: 2 }}
            >
              Créer le premier utilisateur
            </CyberButton>
          </Box>
        </Fade>
      )}

      {/* Dialog ultra moderne pour créer/modifier un utilisateur */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: '20px',
            boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` 
          }}>
            {editUser ? <EditIcon /> : <PersonAddIcon />}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {editUser ? '✏️ Modifier l\'utilisateur' : '➕ Nouvel utilisateur'}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ p: 3 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  background: alpha(theme.palette.error.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  borderRadius: '12px'
                }}
              >
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 400 }}>
              {/* Show all editable fields when creating or editing a user. Password stays optional when editing. */}
              <TextField
                label="📧 Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required={!editUser}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              />
              <TextField
                label="🔒 Mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!editUser}
                helperText={editUser ? 'Laisser vide pour conserver le mot de passe actuel' : ''}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              />
              <TextField
                label="👤 Nom complet"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              />
              <TextField
                select
                label="🔑 Rôle"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              >
                <MenuItem value="user">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                    Utilisateur
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminIcon sx={{ fontSize: 16 }} />
                    Administrateur
                  </Box>
                </MenuItem>
              </TextField>
              <TextField
                select
                label="🌍 Langue"
                name="language"
                value={formData.language}
                onChange={handleChange}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                    '&:hover fieldset': {
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                  }
                }}
              >
                <MenuItem value="fr">🇫🇷 Français</MenuItem>
                <MenuItem value="en">🇺🇸 English</MenuItem>
                <MenuItem value="ar">🇹🇳 العربية</MenuItem>
              </TextField>

              {editUser && (
                <FormControlLabel
                  control={
                    <Checkbox
                      name="archived"
                      checked={!!formData.archived}
                      onChange={handleCheckboxChange}
                      sx={{ color: theme.palette.primary.main }}
                    />
                  }
                  label="Archivé"
                  sx={{ color: theme.palette.text.primary }}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={handleClose}
              sx={{
                borderRadius: '12px',
                color: theme.palette.text.secondary,
                border: `1px solid ${alpha(theme.palette.text.secondary, 0.2)}`,
                '&:hover': {
                  background: alpha(theme.palette.text.secondary, 0.1),
                }
              }}
            >
              Annuler
            </Button>
            <CyberButton
              type="submit"
              startIcon={editUser ? <EditIcon /> : <PersonAddIcon />}
            >
              {editUser ? '💾 Modifier' : '➕ Créer'}
            </CyberButton>
          </DialogActions>
        </form>
      </Dialog>

      <ReassignModal
        visible={reassignModalVisible}
        fromUserId={selectedUserId}
        onCancel={() => setReassignModalVisible(false)}
        onSuccess={() => {
          setReassignModalVisible(false);
          fetchUsers();
          message.success('Arbres réassignés avec succès');
        }}
      />

      <ImportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        payloads={previewPayloads}
        onImport={handleImport}
      />
    </Container>
  );
};

export default UserManagement;
