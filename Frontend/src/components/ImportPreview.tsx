import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Chip, 
  Box,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import { TreePayload, getProblemsForPayload } from '../utils/transformImport';

interface Props {
  open: boolean;
  onClose: () => void;
  payloads: TreePayload[];
  onImport: (payloads: TreePayload[]) => void;
}

const ImportPreview: React.FC<Props> = ({ open, onClose, payloads, onImport }) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{
        background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          📊 Aperçu de l'import - {payloads.length} ligne(s)
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>treeId</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Propriétaire</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Latitude</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Longitude</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Hauteur (m)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Largeur (m)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Fruits</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>Problèmes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payloads.map((p, idx) => {
              const problems = getProblemsForPayload(p);
              const hasProblems = problems.length > 0;
              
              return (
                <TableRow 
                  key={idx}
                  sx={{ 
                    backgroundColor: hasProblems ? alpha(theme.palette.warning.main, 0.05) : 'inherit',
                    '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.5) }
                  }}
                >
                  <TableCell sx={{ fontFamily: 'monospace' }}>{p.treeId}</TableCell>
                  <TableCell>
                    {p.treeType === 'Non spécifié' ? (
                      <Chip label={p.treeType} color="warning" size="small" />
                    ) : (
                      p.treeType || '-'
                    )}
                  </TableCell>
                  <TableCell>{p.ownerLastName ?? p.ownerFirstName ?? '-'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {p.location?.latitude?.toFixed(6) ?? '-'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {p.location?.longitude?.toFixed(6) ?? '-'}
                  </TableCell>
                  <TableCell>{p.measurements?.height ?? '-'}</TableCell>
                  <TableCell>{p.measurements?.width ?? '-'}</TableCell>
                  <TableCell>
                    {p.fruits?.present ? (
                      <Chip 
                        label={`${p.fruits.estimatedQuantity} fruits`} 
                        color="success" 
                        size="small" 
                      />
                    ) : (
                      <Chip label="Aucun" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {p.status && (
                      <Chip 
                        label={p.status} 
                        color={
                          p.status === 'healthy' ? 'success' :
                          p.status === 'warning' ? 'warning' :
                          p.status === 'critical' ? 'error' : 'default'
                        }
                        size="small" 
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {problems.length === 0 ? (
                        <Chip label="✅ OK" color="success" size="small" />
                      ) : (
                        problems.map((problem, i) => (
                          <Chip 
                            key={i} 
                            label={problem} 
                            color="warning" 
                            size="small"
                            sx={{ fontSize: '10px' }}
                          />
                        ))
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Annuler
        </Button>
        <Button 
          onClick={() => onImport(payloads)} 
          variant="contained" 
          color="primary"
          sx={{ borderRadius: '12px' }}
        >
          🚀 Importer {payloads.length} arbre(s)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportPreview;
