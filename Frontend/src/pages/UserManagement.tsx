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

const FuturisticTableCell = styled(TableCell)(({ theme }) => ({
  border: 'none',
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  background: alpha(theme.palette.background.paper, 0.6),
  backdropFilter: 'blur(10px)',
  fontWeight: 500,
  '&.MuiTableCell-head': {
    background: `linear-gradient(45deg, 
      ${alpha(theme.palette.primary.main, 0.1)}, 
      ${alpha(theme.palette.secondary.main, 0.1)})`,
    fontWeight: 700,
    color: theme.palette.primary.main,
    textShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.3)}`,
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
      const response = await axios.get<User[]>('http://localhost:5000/api/auth/users');
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
      await axios.post('http://localhost:5000/api/trees/reassign', {
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
                      'linear-gradient(45deg, #66BB6A, #81C784)' : 
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
    language: 'fr'
  });
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
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

      const response = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Récupérer les arbres pour chaque utilisateur
      const usersWithTrees = await Promise.all(response.data.map(async (user: User) => {
        try {
          const treesResponse = await axios.get(
            `http://localhost:5000/api/trees/owner/${encodeURIComponent(user.email)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return { ...user, trees: treesResponse.data };
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
        language: user.language
      });
    } else {
      setEditUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'user',
        language: 'fr'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditUser(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      if (editUser) {
        await axios.put(
          `http://localhost:5000/api/auth/users/${editUser._id}/role`,
          { role: formData.role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        if (!formData.password) {
          setError('Le mot de passe est requis pour créer un utilisateur');
          return;
        }
        await axios.post(
          'http://localhost:5000/api/auth/users',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchUsers();
      handleClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 403) {
        setError('Accès non autorisé. Seuls les administrateurs peuvent gérer les utilisateurs.');
      } else {
        setError('Erreur lors de la sauvegarde de l\'utilisateur');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleUserExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
    }
  };

  const getTreeStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const handleArchiveUser = async (userId: string, currentArchiveStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        return;
      }

      await axios.put(
        `http://localhost:5000/api/auth/users/${userId}/archive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mettre à jour la liste des utilisateurs
      fetchUsers();
    } catch (error: any) {
      console.error('Error archiving user:', error);
      if (error.response?.status === 403) {
        setError('Accès non autorisé. Seuls les administrateurs peuvent archiver les utilisateurs.');
      } else {
        setError('Erreur lors de l\'archivage de l\'utilisateur');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setSelectedUserId(userId);
    setReassignModalVisible(true);
  };

  const handleReassignSuccess = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/auth/users/${selectedUserId}`);
      message.success('User deleted and trees reassigned successfully');
      setReassignModalVisible(false);
      fetchUsers(); // Refresh user list
    } catch (error) {
      message.error('Failed to delete user');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Gestion des utilisateurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Nouvel utilisateur
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Rechercher un utilisateur..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filtrer par rôle</InputLabel>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            input={<OutlinedInput label="Filtrer par rôle" />}
          >
            <MenuItem value="all">Tous les utilisateurs</MenuItem>
            <MenuItem value="user">Utilisateurs</MenuItem>
            <MenuItem value="admin">Administrateurs</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Nom</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Langue</TableCell>
              <TableCell>Date de création</TableCell>
              <TableCell>Arbres</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <React.Fragment key={user._id}>
                <TableRow sx={user.archived ? { backgroundColor: 'rgba(0, 0, 0, 0.04)' } : {}}>
                  <TableCell padding="checkbox">
                    <IconButton
                      size="small"
                      onClick={() => toggleUserExpand(user._id)}
                    >
                      {expandedUser === user._id ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.language}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{user.trees?.length || 0} arbres</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.archived ? 'Archivé' : 'Actif'}
                      color={user.archived ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton onClick={() => handleOpen(user)}>
                        <EditIcon />
                      </IconButton>
                      {user.role !== 'admin' && (
                        <>
                          <IconButton 
                            onClick={() => handleArchiveUser(user._id, user.archived)}
                            color={user.archived ? 'primary' : 'default'}
                          >
                            {user.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDeleteUser(user._id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
                    <Collapse in={expandedUser === user._id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="h6" gutterBottom component="div">
                          Liste des arbres
                        </Typography>
                        {user.trees && user.trees.length > 0 ? (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>État</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {user.trees.map((tree) => (
                                <TableRow key={tree.treeId}>
                                  <TableCell>{tree.treeId}</TableCell>
                                  <TableCell>{tree.type}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={tree.status}
                                      color={getTreeStatusColor(tree.status)}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography color="textSecondary">
                            Aucun arbre associé
                          </Typography>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
              {!editUser && (
                <>
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <TextField
                    label="Mot de passe"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editUser}
                  />
                  <TextField
                    label="Nom"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </>
              )}
              <TextField
                select
                label="Rôle"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <MenuItem value="user">Utilisateur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </TextField>
              {!editUser && (
                <TextField
                  select
                  label="Langue"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ar">العربية</MenuItem>
                </TextField>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained">
              {editUser ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ReassignModal
        visible={reassignModalVisible}
        fromUserId={selectedUserId}
        onCancel={() => setReassignModalVisible(false)}
        onSuccess={handleReassignSuccess}
      />
    </Container>
  );
};

export default UserManagement;