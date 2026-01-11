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
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Collapse,
  styled,
  alpha,
} from '@mui/material';
import { 
  Person, 
  ExitToApp, 
  Forest, 
  Map, 
  Dashboard, 
  Group,
  AccountCircle,
  Menu as MenuIcon,
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  AdminPanelSettings as AdminIcon,
  History as HistoryIcon,
  ExpandLess,
  ExpandMore,
  LocalFlorist as TreeManageIcon,
} from '@mui/icons-material';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 2px 20px rgba(0, 230, 118, 0.1)',
  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
}));

const NavButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.1),
    transform: 'translateY(-2px)',
  },
}));

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { text: 'Tableau de bord', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Liste des arbres', icon: <Forest />, path: '/trees' },
  { text: 'Carte', icon: <Map />, path: '/map' },
  { text: 'Scanner', icon: <CameraIcon />, path: '/analysis/scan' },
];

const adminMenuItems: MenuItem[] = [
  { text: 'Gestion utilisateurs', icon: <Group />, path: '/users', adminOnly: true },
  { text: 'Gestion arbres', icon: <TreeManageIcon />, path: '/admin/trees', adminOnly: true },
  { text: 'Historique analyses', icon: <HistoryIcon />, path: '/analysis-history', adminOnly: true },
];

interface LayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userRole?: string;
  onLogout: () => void;
}

const Layout = ({ children, isAuthenticated, userRole, onLogout }: LayoutProps) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    setDrawerOpen(false);
    onLogout();
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const isActivePath = (path: string) => location.pathname === path;

  const renderDesktopMenu = () => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {menuItems.map((item) => (
        <NavButton
          key={item.text}
          color="inherit"
          component={RouterLink}
          to={item.path}
          startIcon={item.icon}
          sx={{ 
            color: isActivePath(item.path) 
              ? theme.palette.primary.main 
              : theme.palette.text.primary,
            fontWeight: isActivePath(item.path) ? 700 : 600,
          }}
        >
          {item.text}
        </NavButton>
      ))}
      
      {userRole === 'admin' && (
        <>
          <NavButton
            color="inherit"
            onClick={handleMenu}
            endIcon={Boolean(anchorEl) ? <ExpandLess /> : <ExpandMore />}
            startIcon={<AdminIcon />}
            sx={{ 
              color: adminMenuItems.some(item => isActivePath(item.path))
                ? theme.palette.primary.main 
                : theme.palette.text.primary,
            }}
          >
            Admin
          </NavButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                borderRadius: 2,
                mt: 1,
                minWidth: 200,
              }
            }}
          >
            {adminMenuItems.map((item) => (
              <MenuItem 
                key={item.text}
                component={RouterLink} 
                to={item.path} 
                onClick={handleClose}
                selected={isActivePath(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText>{item.text}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      <IconButton
        size="large"
        color="inherit"
        onClick={handleMenu}
        sx={{ ml: 2, color: theme.palette.text.primary }}
      >
        <AccountCircle />
      </IconButton>
    </Box>
  );

  const renderMobileDrawer = () => (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={toggleDrawer}
      PaperProps={{
        sx: {
          width: 280,
          background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%)',
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
          Menu
        </Typography>
        <IconButton onClick={toggleDrawer}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              onClick={toggleDrawer}
              selected={isActivePath(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                '&.Mui-selected': {
                  background: alpha(theme.palette.primary.main, 0.15),
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.2),
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: isActivePath(item.path) ? theme.palette.primary.main : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{
                  fontWeight: isActivePath(item.path) ? 700 : 500,
                  color: isActivePath(item.path) ? theme.palette.primary.main : 'inherit',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

        {userRole === 'admin' && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
              >
                <ListItemIcon>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Administration" 
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {adminMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminMenuItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      component={RouterLink}
                      to={item.path}
                      onClick={toggleDrawer}
                      selected={isActivePath(item.path)}
                      sx={{
                        pl: 4,
                        borderRadius: 2,
                        mx: 1,
                        my: 0.5,
                        '&.Mui-selected': {
                          background: alpha(theme.palette.primary.main, 0.15),
                        }
                      }}
                    >
                      <ListItemIcon sx={{ color: isActivePath(item.path) ? theme.palette.primary.main : 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          fontWeight: isActivePath(item.path) ? 700 : 500,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            component={RouterLink}
            to="/profile"
            onClick={toggleDrawer}
            selected={isActivePath('/profile')}
            sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
          >
            <ListItemIcon>
              <Person />
            </ListItemIcon>
            <ListItemText primary="Profil" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, mx: 1, my: 0.5 }}>
            <ListItemIcon>
              <ExitToApp />
            </ListItemIcon>
            <ListItemText primary="Déconnexion" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );

  return (
    <>
      <StyledAppBar position="sticky">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography 
            variant="h6" 
            component={RouterLink}
            to="/"
            sx={{ 
              flexGrow: 0,
              textDecoration: 'none',
              background: 'linear-gradient(45deg, #00e676, #4caf50)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
            }}
          >
            🌳 FruityTrack
          </Typography>
          
          {isAuthenticated ? (
            isMobile ? (
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer}
                sx={{ color: theme.palette.text.primary }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              renderDesktopMenu()
            )
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <NavButton
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{ 
                  color: isActivePath('/login') 
                    ? theme.palette.primary.main 
                    : theme.palette.text.primary 
                }}
              >
                Connexion
              </NavButton>
              <NavButton
                variant="contained"
                component={RouterLink}
                to="/register"
                sx={{
                  background: 'linear-gradient(45deg, #00e676, #4caf50)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #66ffa6, #81c784)',
                  }
                }}
              >
                Inscription
              </NavButton>
            </Box>
          )}
        </Toolbar>
      </StyledAppBar>

      {isAuthenticated && isMobile && renderMobileDrawer()}

      <Container 
        maxWidth={false}
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1, sm: 2, md: 3 },
          maxWidth: '1920px',
        }}
      >
        {children}
      </Container>

      {/* Profile Menu for Desktop */}
      {isAuthenticated && !isMobile && (
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
          PaperProps={{
            sx: {
              borderRadius: 2,
              mt: 1,
              minWidth: 180,
            }
          }}
        >
          <MenuItem component={RouterLink} to="/profile" onClick={handleClose}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Profil
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <ExitToApp fontSize="small" />
            </ListItemIcon>
            Déconnexion
          </MenuItem>
        </Menu>
      )}
    </>
  );
};

export default Layout;