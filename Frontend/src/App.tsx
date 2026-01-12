import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';


// Layout components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Dashboard from './pages/Dashboard_final';
import TreeMap from './pages/TreeMap';
import TreeList from './pages/TreeList_final';
import TreeDetails from './pages/TreeDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import AddTreePage from './pages/AddTreePage';
import UserManagement from './pages/UserManagement_Modern';
import ProfilePage from './pages/ProfilePage_Modern';
import AnalysisHistory from './pages/AnalysisHistory';
import TreeAnalysisReports from './pages/TreeAnalysisReports';
import AdminTreeManagement from './pages/AdminTreeManagement';
import TreeAnalysisScreen from './pages/TreeAnalysisScreen';
import TokenDebugPage from './pages/TokenDebugPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00e676', // Vert néon futuriste
      light: '#66ffa6',
      dark: '#00b248',
    },
    secondary: {
      main: '#4caf50', // Vert classique
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#f8fffe', // Blanc très léger avec teinte verte
      paper: '#ffffff',
    },
    text: {
      primary: '#1b5e20', // Vert foncé pour le texte
      secondary: '#388e3c',
    },
    success: {
      main: '#00e676',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5e8 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 230, 118, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #00e676, #4caf50)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(45deg, #66ffa6, #81c784)',
          },
        },
        outlined: {
          borderColor: '#00e676',
          color: '#00e676',
          '&:hover': {
            borderColor: '#4caf50',
            backgroundColor: 'rgba(0, 230, 118, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 230, 118, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 230, 118, 0.1)',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 230, 118, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0, 230, 118, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 230, 118, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 230, 118, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          color: '#00b248',
          border: '1px solid rgba(0, 230, 118, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: 'rgba(0, 230, 118, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#00e676',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00e676',
              boxShadow: '0 0 0 3px rgba(0, 230, 118, 0.1)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1b5e20',
          boxShadow: '0 2px 10px rgba(0, 230, 118, 0.1)',
          borderBottom: '1px solid rgba(0, 230, 118, 0.1)',
        },
      },
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1b5e20',
      background: 'linear-gradient(45deg, #00e676, #4caf50)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#1b5e20',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1b5e20',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1b5e20',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1b5e20',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#1b5e20',
    },
    body1: {
      color: '#2e7d32',
    },
    body2: {
      color: '#388e3c',
    },
  },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role;
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout isAuthenticated={isAuthenticated} userRole={userRole} onLogout={handleLogout}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? (
                  <Login onLogin={(token) => {
                    setIsAuthenticated(true);
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setUserRole(payload.role);
                  }} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            <Route 
              path="/register" 
              element={
                !isAuthenticated ? (
                  <Register />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />

            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route path="/trees">
              <Route 
                index 
                element={
                  <PrivateRoute isAuthenticated={isAuthenticated}>
                    <TreeList />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="new" 
                element={
                  <PrivateRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                    <AddTreePage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path=":id" 
                element={
                  <PrivateRoute isAuthenticated={isAuthenticated}>
                    <TreeDetails />
                  </PrivateRoute>
                } 
              />
              <Route 
                path=":id/edit" 
                element={
                  <PrivateRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                    <TreeDetails />
                  </PrivateRoute>
                } 
              />
            </Route>
            <Route 
              path="/map" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TreeMap />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <UserManagement />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <ProfilePage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/analysis-history" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <AnalysisHistory />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/trees/:treeId/analyses" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TreeAnalysisReports />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/trees" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <AdminTreeManagement />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/analysis/scan" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TreeAnalysisScreen />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/debug-token" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <TokenDebugPage />
                </PrivateRoute>
              } 
            />

            {/* Default route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
};

export default App;