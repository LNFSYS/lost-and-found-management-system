import type { HandoverPoint } from "../services/api";

export type HandoverStatus = "active" | "closed";

export type CampusArea =
  | "Alpha"
  | "Beta"
  | "Gamma"
  | "Căng tin"
  | "KTX"
  | "Cổng chính"
  | "Cổng phụ"
  | "Khu để xe"
  | "Nhà võ"
  | "Khu thể thao"
  | "Nhà giữ xe cán bộ"
  | "Cổng nhà xe";

export interface HandoverPointView extends HandoverPoint {
  area: CampusArea;
  description: string;
  status: HandoverStatus;
  owner: string;
  storedItems: number;
  mapKey: string;
  mapImageUrl?: string | null;
  mapPosition: { x: number; y: number };
  routeHint: string;
}

export interface HandoverFilters {
  query: string;
  area: "all" | CampusArea;
  status: "all" | HandoverStatus;
}
