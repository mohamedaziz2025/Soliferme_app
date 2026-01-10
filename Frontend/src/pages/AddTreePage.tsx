import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import AddTreeForm from '../components/AddTreeForm';
import { useNavigate } from 'react-router-dom';

const AddTreePage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role);
      
      // Rediriger les utilisateurs non-admin
      if (payload.role !== 'admin') {
        navigate('/trees');
      }
    }
  }, [navigate]);

  const handleTreeAdded = () => {
    navigate('/trees');
  };

  if (userRole !== 'admin') {
    return null; // Ne rien afficher pendant la redirection
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1">
          Ajouter un nouvel arbre
        </Typography>
      </Box>
      <AddTreeForm onTreeAdded={handleTreeAdded} />
    </Container>
  );
};

export default AddTreePage;