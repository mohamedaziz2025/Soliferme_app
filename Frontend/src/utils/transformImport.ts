// Utilities to parse CSV or XLSX exported by the machine and transform rows into payloads
// - Extract GPS lat/lon from a single `gps` cell if present
// - Convert decimal comma to point (e.g. "3,94" -> 3.94)
// - If a row has an `id` value, use it as `treeId`; otherwise generate a stable `treeId`
// - If fruits_count > 0 set fruits.present = true and fruits.estimatedQuantity = that value
// - Map disease -> status (Healthy, Suspected, Severe -> healthy, warning, critical)
// - Returns an array of payload objects ready for inspection or sending to the backend

// NOTE: For reliable parsing of .xlsx use the 'xlsx' package (SheetJS).
// Install: npm install xlsx

import { read, utils } from 'xlsx';

export type RawRow = { [k: string]: any };
export type TreePayload = {
  treeId: string;
  treeType?: string;
  ownerEmail?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  location?: { latitude?: number; longitude?: number };
  measurements?: { height?: number; width?: number; approximateShape?: string };
  fruits?: { present: boolean; estimatedQuantity: number | null; lastAnalysisDate?: string };
  status?: string;
  lastUpdate?: string;
  notes?: string;
  isArchived?: boolean;
  // original row reference
  __raw?: RawRow;
};

function toNumberFromString(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  // remove whitespace and replace comma decimal with dot
  const s = String(val).trim().replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseGpsCell(gps: any): { latitude?: number; longitude?: number } | null {
  if (!gps && gps !== 0) return null;
  if (typeof gps === 'object' && gps.latitude !== undefined && gps.longitude !== undefined) {
    return { 
      latitude: toNumberFromString(gps.latitude) ?? undefined, 
      longitude: toNumberFromString(gps.longitude) ?? undefined 
    };
  }
  const s = String(gps).trim();
  // accept separators: comma OR semicolon (common exports)
  const sep = s.includes(';') && !s.includes(',') ? ';' : ',';
  const parts = s.split(sep).map(p => p.trim()).filter(p => p !== '');
  if (parts.length < 2) return null;
  const lat = toNumberFromString(parts[0]);
  const lon = toNumberFromString(parts[1]);
  if (lat === null || lon === null) return null;
  return { latitude: lat, longitude: lon };
}

function mapDiseaseToStatus(d: any): string | undefined {
  if (!d && d !== 0) return undefined;
  const s = String(d).trim().toLowerCase();
  if (s === 'healthy' || s === 'h' || s === 'ok') return 'healthy';
  if (s === 'suspected' || s === 'susp' || s === 'sus') return 'warning';
  if (s === 'severe' || s === 'critical') return 'critical';
  // fallback keep original lowercased
  return s;
}

function generateTreeId(): string {
  // stable-ish but unique with 3-9 digits
  const now = Date.now();
  const randomPart = Math.floor(Math.random() * 1000000);
  const combined = String(now + randomPart);
  // Take last 7 digits to ensure it's between 3-9 digits
  return combined.slice(-7);
}

function validateTreeId(id: any): string | null {
  if (!id && id !== 0) return null;
  const idStr = String(id).trim();
  // Check if it's a number with 3-9 digits
  if (!/^\d{3,9}$/.test(idStr)) {
    return null; // Invalid ID format
  }
  return idStr;
}

// Transform a raw row (object from sheet_to_json) into TreePayload
export function transformRow(row: RawRow): TreePayload {
  // normalize field names (many exporters use different headers)
  // common headers observed in your sample: id, name, type, gps, height_m, diameter_m, fruits_count, disease, timestamp
  const id = row['id'] ?? row['ID'] ?? row['Id'] ?? row['_id'] ?? row['treeId'] ?? row['tree_id'];
  const name = row['name'] ?? row['Name'] ?? row['owner'] ?? row['ownerName'];
  const type = row['type'] ?? row['Type'] ?? row['treeType'];
  const gps = row['gps'] ?? row['GPS'] ?? row['location'];
  const height = row['height_m'] ?? row['height'] ?? row['height_meters'];
  const diameter = row['diameter_m'] ?? row['diameter'] ?? row['diameter_meters'] ?? row['diameter_nruits_count'];
  const fruits_count = row['fruits_count'] ?? row['fruits'] ?? row['fruit_count'] ?? row['fruits_count'] ?? row['diameter_nruits_count'];
  const disease = row['disease'] ?? row['Disease'] ?? row['status'];
  const timestamp = row['timestamp'] ?? row['date'] ?? row['lastUpdate'];
  const notes = row['notes'] ?? row['note'] ?? row['comment'];

  // Decide treeId: if id present and valid -> use as treeId, else generate
  const validatedId = validateTreeId(id);
  const treeId = validatedId || generateTreeId();

  // parse gps either from gps cell or from latitude/longitude columns
  let loc: { latitude?: number; longitude?: number } | null = null;
  const latCell = row['latitude'] ?? row['Latitude'];
  const lonCell = row['longitude'] ?? row['Longitude'];
  const parsedFromLatLon = (latCell !== undefined || lonCell !== undefined)
    ? {
        latitude: toNumberFromString(latCell) ?? undefined,
        longitude: toNumberFromString(lonCell) ?? undefined
      }
    : null;
  if (
    parsedFromLatLon &&
    parsedFromLatLon.latitude !== undefined &&
    parsedFromLatLon.longitude !== undefined
  ) {
    loc = parsedFromLatLon;
  } else if (gps) {
    const p = parseGpsCell(gps);
    if (p) loc = p;
  }

  const heightNum = toNumberFromString(height);
  const diameterNum = toNumberFromString(diameter);
  const fruitsNum = toNumberFromString(fruits_count);
  const fruits_present = (fruitsNum !== null && fruitsNum > 0) ? true : false;

  const status = mapDiseaseToStatus(disease) ?? undefined;

  const payload: TreePayload = {
    treeId,
    // If type is missing, use French default "Non spécifié"
    treeType: type ? String(type).trim() : 'Non spécifié',
    ownerEmail: undefined,
    ownerFirstName: undefined,
    ownerLastName: name ? String(name).trim() : undefined,
    location: loc || undefined,
    measurements: {
      height: heightNum ?? undefined,
      width: diameterNum ?? undefined,
    },
    fruits: {
      present: fruits_present,
      estimatedQuantity: fruitsNum !== null ? Math.round(fruitsNum) : 0,
      lastAnalysisDate: timestamp ? String(timestamp) : undefined,
    },
    status,
    lastUpdate: timestamp ? String(timestamp) : undefined,
    notes: notes ? String(notes) : undefined,
    isArchived: undefined,
    __raw: row,
  };

  return payload;
}

// Parse an uploaded .xlsx File (browser File) and return transformed payloads
export async function parseXlsxFile(file: File): Promise<TreePayload[]> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const raw: RawRow[] = utils.sheet_to_json(sheet, { defval: '' });
  const payloads = raw.map(transformRow);
  return payloads;
}

// Simple CSV parser for small files (separator detection: comma/semicolon/tab)
export function parseCsvString(csv: string): TreePayload[] {
  // normalize line endings
  const text = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];
  const lines = text.split('\n').filter(Boolean);
  // detect separator using header line
  const headerLine = lines[0];
  let sep = ',';
  if (headerLine.includes('\t')) sep = '\t';
  else if (headerLine.includes(';')) sep = ';';

  const headers = headerLine.split(sep).map(h => h.trim());
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim());
    const obj: RawRow = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? '';
    }
    rows.push(obj);
  }

  return rows.map(transformRow);
}

// Return array of human-readable problem strings for a payload
export function getProblemsForPayload(p: TreePayload): string[] {
  const problems: string[] = [];
  
  // ID validation
  if (p.treeId && p.__raw) {
    const originalId = p.__raw['id'] ?? p.__raw['ID'] ?? p.__raw['Id'] ?? p.__raw['_id'] ?? p.__raw['treeId'] ?? p.__raw['tree_id'];
    if (originalId && !validateTreeId(originalId)) {
      problems.push(`ID invalide: "${originalId}" (doit être un nombre de 3-9 chiffres)`);
    }
  }
  
  // type check
  if (!p.treeType || p.treeType === '' || p.treeType === 'Non spécifié') {
    problems.push(`Type manquant (assigné: Non spécifié)`);
  }
  
  // gps check
  if (!p.location || p.location.latitude === undefined || p.location.longitude === undefined) {
    problems.push('GPS manquant ou invalide');
  }
  
  // measurements check
  if (!p.measurements || (!p.measurements.height && !p.measurements.width)) {
    problems.push('Mesures manquantes (hauteur et largeur)');
  }
  
  // owner info check
  if (!p.ownerFirstName && !p.ownerLastName && !p.ownerEmail) {
    problems.push('Informations propriétaire manquantes');
  }
  
  // fruits consistency
  if (p.fruits) {
    if (p.fruits.present && (!p.fruits.estimatedQuantity || p.fruits.estimatedQuantity === 0)) {
      problems.push('Présence de fruits indiquée mais quantité estimée à 0');
    }
  }
  
  return problems;
}

// Check if a payload has critical missing data that would prevent import
export function isPayloadValid(p: TreePayload): boolean {
  // At minimum, we need a treeId and GPS coordinates
  if (!p.treeId) return false;
  if (!p.location || p.location.latitude === undefined || p.location.longitude === undefined) return false;
  
  // Validate that GPS coordinates are reasonable
  const lat = p.location.latitude;
  const lon = p.location.longitude;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  
  return true;
}

// Filter payloads to only include valid ones
export function getValidPayloads(payloads: TreePayload[]): TreePayload[] {
  return payloads.filter(isPayloadValid);
}

// Example: usage in a React component
// import { parseXlsxFile } from '../utils/transformImport';
// async function onFileSelected(file: File) {
//   const payloads = await parseXlsxFile(file);
//   // inspect payloads in console
//   console.log(payloads);
//   // then send to backend (one-by-one or batch) depending on your API
// }

export default {
  transformRow,
  parseXlsxFile,
  parseCsvString,
};
