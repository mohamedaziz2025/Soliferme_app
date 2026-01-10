import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box,
  Menu,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material';
import { 
  Person, 
  ExitToApp, 
  Forest, 
  Map, 
  Dashboard, 
  Group,
  AccountCircle
} from '@mui/icons-material';

const menuItems = [
  { text: 'Tableau de bord', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Liste des arbres', icon: <Forest />, path: '/trees' },
  { text: 'Carte', icon: <Map />, path: '/map' },
];

interface LayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userRole?: string;
  onLogout: () => void;
}

const Layout = ({ children, isAuthenticated, userRole, onLogout }: LayoutProps) => {
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FruityTrack
          </Typography>
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  component={RouterLink}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{ color: location.pathname === item.path ? '#4caf50' : 'inherit' }}
                >
                  {item.text}
                </Button>
              ))}
              {userRole === 'admin' && (
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/users"
                  startIcon={<Group />}
                  sx={{ color: location.pathname === '/users' ? '#4caf50' : 'inherit' }}
                >
                  Utilisateurs
                </Button>
              )}
              
              <IconButton
                size="large"
                color="inherit"
                onClick={handleMenu}
                sx={{ ml: 2 }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem component={RouterLink} to="/profile" onClick={handleClose}>
                  <Person sx={{ mr: 1 }} />
                  Profil
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1 }} />
                  Déconnexion
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{ color: location.pathname === '/login' ? '#4caf50' : 'inherit' }}
              >
                Connexion
              </Button>
              <Button
                color="inherit"
                component={RouterLink}
                to="/register"
                sx={{ color: location.pathname === '/register' ? '#4caf50' : 'inherit' }}
              >
                Inscription
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>{children}</Container>
    </>
  );
};

export default Layout;