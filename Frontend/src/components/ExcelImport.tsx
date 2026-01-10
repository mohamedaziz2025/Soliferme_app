import React, { useState } from 'react';
import {
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Upload } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import axios from 'axios';

interface ExcelImportProps {
  onImportSuccess: () => void;
}

interface ImportResults {
  total: number;
  created: number;
  updated: number;
  errors: number;
}

interface TreeData {
  treeId?: string;
  treeType: string;
  ownerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
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
}

interface ExcelRow {
  treeId?: string;
  treeType: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  latitude: string | number;
  longitude: string | number;
  height?: string | number;
  width?: string | number;
  shape?: string;
  hasFruits?: boolean | string | number;
  fruitQuantity?: string | number;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ onImportSuccess }) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<TreeData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  const cleanValue = (value: any): string => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  };

  const cleanNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    const cleaned = cleanValue(value).replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const processExcelFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(firstSheet);
          
          // Nettoyage et validation des données
          const cleanedData = jsonData.map((row): TreeData => ({
            treeId: cleanValue(row.treeId),
            treeType: cleanValue(row.treeType),
            ownerInfo: {
              firstName: cleanValue(row.ownerFirstName),
              lastName: cleanValue(row.ownerLastName),
              email: cleanValue(row.ownerEmail).toLowerCase(),
            },
            location: {
              latitude: cleanNumber(row.latitude),
              longitude: cleanNumber(row.longitude),
            },
            measurements: {
              height: cleanNumber(row.height),
              width: cleanNumber(row.width),
              approximateShape: cleanValue(row.shape),
            },
            fruits: {
              present: Boolean(row.hasFruits),
              estimatedQuantity: parseInt(cleanValue(row.fruitQuantity)) || 0,
            },
          }));

          // Vérifier si toutes les données requises sont valides
          const isValid = validateData(cleanedData);
          if (!isValid.valid) {
            setError(isValid.error || 'Format de données invalide');
            return;
          }

          setPreviewData(cleanedData);
          setShowPreview(true);
        } catch (err) {
          setError('Erreur lors de la lecture du fichier Excel');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Erreur lors du traitement du fichier');
      console.error(err);
    }
  };

  const validateData = (data: TreeData[]): { valid: boolean; error?: string } => {
    if (!Array.isArray(data) || data.length === 0) {
      return { valid: false, error: 'Le fichier est vide ou mal formaté' };
    }

    // Validation détaillée de chaque ligne
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const lineNumber = i + 1;

      if (!row.treeType) {
        return { valid: false, error: `Ligne ${lineNumber} : Type d'arbre manquant` };
      }

      if (!row.ownerInfo?.email) {
        return { valid: false, error: `Ligne ${lineNumber} : Email du propriétaire manquant` };
      }

      if (!row.location?.latitude || !row.location?.longitude || 
          isNaN(row.location.latitude) || isNaN(row.location.longitude)) {
        return { valid: false, error: `Ligne ${lineNumber} : Coordonnées géographiques invalides` };
      }

      // Validation du format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.ownerInfo.email)) {
        return { valid: false, error: `Ligne ${lineNumber} : Format d'email invalide` };
      }
    }

    return { valid: true };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setError('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés');
        return;
      }
      setError('');
      setSuccess(false);
      setResults(null);
      processExcelFile(file);
    }
  };

  const importData = async () => {
    setImporting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await axios.post<{ results: ImportResults }>(
        'http://localhost:5000/api/trees/bulk',
        { trees: previewData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResults(response.data.results);
      setSuccess(true);
      setShowPreview(false);
      onImportSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'importation');
      if (err.response?.data?.missingEmails) {
        setError(`Utilisateurs non trouvés : ${err.response.data.missingEmails.join(', ')}`);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box>
      <input
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        id="excel-import"
        onChange={handleFileSelect}
      />
      <label htmlFor="excel-import">
        <Button
          variant="contained"
          component="span"
          startIcon={<Upload />}
          disabled={importing}
        >
          Importer un fichier Excel
        </Button>
      </label>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {success && results && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Importation réussie ! 
          {` (${results.created} créés, ${results.updated} mis à jour, ${results.errors} erreurs)`}
        </Alert>
      )}

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Aperçu des données</DialogTitle>
        <DialogContent>
          {previewData.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                {previewData.length} arbres à importer
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type d'arbre</TableCell>
                      <TableCell>Propriétaire</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Localisation</TableCell>
                      <TableCell>Dimensions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((tree, index) => (
                      <TableRow key={index}>
                        <TableCell>{tree.treeType}</TableCell>
                        <TableCell>{`${tree.ownerInfo.firstName} ${tree.ownerInfo.lastName}`}</TableCell>
                        <TableCell>{tree.ownerInfo.email}</TableCell>
                        <TableCell>{`${tree.location.latitude}, ${tree.location.longitude}`}</TableCell>
                        <TableCell>{`${tree.measurements.height}m × ${tree.measurements.width}m`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Annuler</Button>
          <Button
            onClick={importData}
            variant="contained"
            color="primary"
            disabled={importing}
          >
            {importing ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Importation...
              </>
            ) : (
              'Confirmer l\'importation'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExcelImport;
