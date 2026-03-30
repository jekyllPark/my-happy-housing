export type HousingType = 'happy' | 'national' | 'permanent' | 'purchase' | 'jeonse' | 'public_support';
export type TargetGroup = 'all' | 'youth' | 'newlywed' | 'general' | 'student' | 'elderly' | 'beneficiary';
export type RecruitmentStatus = 'recruiting' | 'scheduled' | 'completed' | 'canceled';
export type Priority = 'priority1' | 'priority2' | 'general';

export interface SupplyUnit {
  id: string;
  area: number; // m²
  areaType: string; // e.g., "전용면적"
  deposit: number; // 보증금 (원)
  monthlyRent: number; // 월임대료 (원)
  minConversionDeposit?: number; // 최소전환보증금 (원)
  maxConversionDeposit?: number; // 최대전환보증금 (원)
  units: number; // 공급호수
  priority?: Priority;
}

export interface Eligibility {
  targetGroup: TargetGroup;
  ageMin?: number;
  ageMax?: number;
  incomeMax?: string;
  assetMax?: string;
  workingYears?: number;
  maritalStatus?: string;
  educationLevel?: string;
  criteria: string[];
  documents: string[];
  priority: Priority[];
}

export interface Recruitment {
  id: string;
  housingComplexId: string;
  status: RecruitmentStatus;
  announcementDate: string; // ISO date
  applicationStart: string;
  applicationEnd: string;
  resultAnnouncement?: string;
  supplyUnits: SupplyUnit[];
  eligibility: Eligibility[];
}

export interface HousingComplex {
  id: string;
  name: string;
  addressKor: string;
  addressEng: string;
  latitude: number;
  longitude: number;
  housingType: HousingType;
  totalUnits: number;
  completionYear?: number;
  operatorName?: string;
  operatorPhone?: string;
  nearestStation?: {
    name: string;
    distance: number; // meters
    line?: string;
  };
  supplyUnits: SupplyUnit[];
  recruitments: Recruitment[];
  imageUrl?: string;
  description?: string;
}

export interface SearchFilters {
  targetGroup: TargetGroup;
  housingTypes: HousingType[];
  status: RecruitmentStatus[];
  depositMin: number; // 만원 단위
  depositMax: number; // 만원 단위
  rentMin?: number;
  rentMax?: number;
  sort: SortOption;
  radius?: number; // meters (300 = 5min, 600 = 10min, 900 = 15min)
}

export type SortOption =
  | 'distance'
  | 'deposit-asc'
  | 'deposit-desc'
  | 'rent-asc'
  | 'rent-desc'
  | 'area-asc'
  | 'area-desc'
  | 'recent'
  | 'min-conversion-asc'
  | 'min-conversion-desc'
  | 'max-conversion-asc'
  | 'max-conversion-desc';

export interface SearchResponse {
  data: HousingComplex[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'targetGroup' | 'housingType' | 'status';
  value: string;
  color?: string;
  icon?: string;
}

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  origin: RouteStop;
  destination: RouteStop;
  distance: number; // meters
  duration: number; // seconds
  polyline: Array<[number, number]>; // lat, lng
  summary: string;
}
