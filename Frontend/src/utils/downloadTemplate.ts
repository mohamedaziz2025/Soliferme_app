// Utility to generate and trigger download of a CSV template for tree import
export function downloadTreeImportTemplate() {
  const headers = [
    '_id',
    'treeId',
    'treeType',
    'ownerEmail',
    'ownerFirstName',
    'ownerLastName',
    'ownerId (optional)',
    'latitude',
    'longitude',
    'height',
    'width',
    'approximateShape',
    'fruits_present',
    'fruits_estimatedQuantity',
    'fruits_lastAnalysisDate',
    'status',
    'isArchived',
    'archivedDate',
    'lastUpdate',
    'notes'
  ];

  const exampleRows = [
    // Update existing by _id
    [
      '60f7a2b9e1d3c4a5f6789012',
      'TR-1001',
      'Pommier',
      'jean@example.com',
      'Jean',
      'Dupont',
      '',
      '48.8566',
      '2.3522',
      '3.5',
      '1.2',
      'cylindrical',
      'TRUE',
      '120',
      '2024-06-01',
      'healthy',
      'FALSE',
      '',
      '2025-08-01',
      'Mise à jour: hauteur corrigée'
    ],
    // Create new
    [
      '',
      'TR-2005',
      'Poirier',
      'marie@example.com',
      'Marie',
      'Martin',
      '',
      '45.7640',
      '4.8357',
      '2.1',
      '0.9',
      'round',
      'FALSE',
      '0',
      '',
      'warning',
      'FALSE',
      '',
      '',
      'Nouvel arbre planté au verger sud'
    ]
  ];

  const csvLines = [headers.join(',')].concat(exampleRows.map(r => r.map(cell => {
    if (cell === null || cell === undefined) return '';
    // Escape quotes
    const s = String(cell).replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  }).join(',')));

  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tree_import_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default downloadTreeImportTemplate;
