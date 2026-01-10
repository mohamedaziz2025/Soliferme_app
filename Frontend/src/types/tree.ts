export interface TreeData {
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

export interface ExcelRow {
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

export interface ImportResults {
  total: number;
  created: number;
  updated: number;
  errors: number;
}
