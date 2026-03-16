export interface SaleRecord {
  id: string;
  buyerUserId: string;
  buyerName?: string;
  dateTime: Date;
  location: string;
  locationId: string;
  universeId: string;
  universe: string;
  assetId: string;
  assetName: string;
  assetType: string;
  holdStatus: string;
  revenue: number;
  price?: number;
}

export interface SavedProfile {
  id: string;
  name: string;
  groupId: string;
  cookie: string;
  iconUrl?: string;
}
