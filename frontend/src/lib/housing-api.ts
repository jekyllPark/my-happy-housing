import { apiClient } from './api';
import type {
  HousingComplex,
  SearchResponse,
  SearchFilters,
  Category,
  Recruitment,
  Eligibility,
  SupplyUnit,
} from '@/types/housing';
import type { ApiResponse } from '@/types/api';

// Transform backend snake_case response to frontend camelCase types
function transformComplex(raw: any): HousingComplex {
  // Parse location coordinates from WKT format "SRID=4326;POINT (lng lat)"
  let latitude = 0;
  let longitude = 0;
  if (raw.location && typeof raw.location === 'string') {
    const match = raw.location.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/);
    if (match) {
      longitude = parseFloat(match[1]);
      latitude = parseFloat(match[2]);
    }
  }

  // Map backend status to frontend display
  const statusMap: Record<string, string> = {
    open: '모집중',
    upcoming: '모집예정',
    closed: '모집마감',
    archived: '과거이력',
  };

  const recruitmentStatus = raw.recruitment_status || null;
  const recruitmentStatusDisplay = raw.recruitment_status_display || statusMap[recruitmentStatus] || '';

  return {
    id: String(raw.id),
    name: raw.name || '',
    addressKor: raw.address || '',
    addressEng: raw.address_detail || '',
    latitude,
    longitude,
    housingType: raw.housing_type || 'happy',
    totalUnits: raw.total_units || 0,
    completionYear: raw.completion_date ? parseInt(raw.completion_date) : undefined,
    operatorName: raw.operator || '',
    imageUrl: raw.image_url || '',
    supplyUnits: [],
    recruitments: [],
    nearestStation: undefined,
    // Extra fields for list display
    recruitmentStatus,
    recruitmentStatusDisplay,
    applyStart: raw.apply_start || '',
    applyEnd: raw.apply_end || '',
    announcementUrl: raw.announcement_url || '',
    minDeposit: raw.min_deposit,
    maxDeposit: raw.max_deposit,
    minRent: raw.min_rent,
    maxRent: raw.max_rent,
  } as HousingComplex & Record<string, any>;
}

export async function searchHousing(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  filters: Partial<SearchFilters>,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    originLat: originLat.toString(),
    originLng: originLng.toString(),
    destinationLat: destinationLat.toString(),
    destinationLng: destinationLng.toString(),
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(filters.targetGroup && { targetGroup: filters.targetGroup }),
    ...(filters.housingTypes && filters.housingTypes.length > 0 && {
      housingTypes: filters.housingTypes.join(','),
    }),
    ...(filters.status && filters.status.length > 0 && {
      status: filters.status.join(','),
    }),
    ...(filters.depositMin !== undefined && {
      depositMin: filters.depositMin.toString(),
    }),
    ...(filters.depositMax !== undefined && {
      depositMax: filters.depositMax.toString(),
    }),
    ...(filters.rentMin !== undefined && {
      rentMin: filters.rentMin.toString(),
    }),
    ...(filters.rentMax !== undefined && {
      rentMax: filters.rentMax.toString(),
    }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.radius !== undefined && { radius: filters.radius.toString() }),
  });

  const response = await apiClient.get<any>(
    `/api/housing/search/?${params.toString()}`
  );

  const rawData = response.data || response;
  const items = rawData.data || [];

  return {
    data: items.map(transformComplex),
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || pageSize,
    totalPages: rawData.totalPages || 0,
  };
}

export async function getComplex(id: string): Promise<HousingComplex> {
  const raw = await apiClient.get<any>(`/api/housing/complex/${id}/`);

  // Backend returns raw object (not wrapped in ApiResponse)
  const data = raw.data || raw;

  const complex = transformComplex(data);

  // Transform nested recruitments and supply units
  complex.recruitments = (data.recruitments || []).map((r: any) => ({
    id: String(r.id),
    housingComplexId: String(data.id),
    status: r.status === 'open' ? 'recruiting' : r.status === 'upcoming' ? 'scheduled' : r.status === 'closed' ? 'completed' : 'canceled',
    announcementDate: r.announcement_date || '',
    announcementUrl: r.announcement_url || '',
    applicationStart: r.apply_start || '',
    applicationEnd: r.apply_end || '',
    schedule: r.schedule || null,
    supplyUnits: (r.supply_units || []).map((u: any) => ({
      id: String(u.id),
      area: parseFloat(u.exclusive_area) || 0,
      areaType: u.unit_type || '',
      complexName: u.unit_name || '',
      deposit: u.deposit_base || 0,
      monthlyRent: u.monthly_rent || 0,
      minConversionDeposit: u.deposit_min || 0,
      maxConversionDeposit: u.deposit_max || 0,
      rentAtMinDeposit: u.rent_at_max || 0,
      rentAtMaxDeposit: u.rent_at_min || 0,
      units: u.total_units || 0,
      supplyCount: u.supply_count || 0,
      depositNote: u.deposit_note || '',
      complexAddress: u.complex_address || '',
      complexLat: u.complex_lat || 0,
      complexLng: u.complex_lng || 0,
    })),
    eligibility: (r.supply_units || []).flatMap((u: any) =>
      (u.eligibilities || []).map((e: any) => ({
        targetGroup: e.target_group,
        ageMin: e.age_min,
        ageMax: e.age_max,
        incomeMax: e.income_limit_percentage ? `${e.income_limit_percentage}%` : undefined,
        assetMax: e.asset_limit ? String(e.asset_limit) : undefined,
        criteria: e.special_conditions || [],
        documents: e.required_documents || [],
        priority: [],
      }))
    ),
  }));

  // Also populate top-level supplyUnits from first recruitment
  if (complex.recruitments.length > 0) {
    complex.supplyUnits = complex.recruitments[0].supplyUnits;
  }

  complex.operatorName = data.operator || '';
  complex.operatorPhone = data.phone || '';

  return complex;
}

export async function getRecruitment(
  complexId: string,
  recruitmentId: string
): Promise<Recruitment> {
  const response = await apiClient.get<ApiResponse<Recruitment>>(
    `/api/housing/complex/${complexId}/recruitment/${recruitmentId}`
  );

  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<ApiResponse<Category[]>>(
    '/api/housing/categories'
  );

  return response.data;
}

export async function getEligibility(
  complexId: string,
  recruitmentId: string
): Promise<Eligibility[]> {
  const response = await apiClient.get<ApiResponse<Eligibility[]>>(
    `/api/housing/complex/${complexId}/recruitment/${recruitmentId}/eligibility`
  );

  return response.data;
}

export async function getSupplyUnits(
  complexId: string,
  recruitmentId: string
): Promise<SupplyUnit[]> {
  const response = await apiClient.get<ApiResponse<SupplyUnit[]>>(
    `/api/housing/complex/${complexId}/recruitment/${recruitmentId}/supply-units`
  );

  return response.data;
}

export async function searchByRegion(
  query: string,
  page: number = 1,
  pageSize: number = 20,
  status: string = ''
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (status) params.set('status', status);

  const response = await apiClient.get<any>(
    `/api/housing/region/?${params.toString()}`
  );

  const rawData = response.data || response;
  const items = rawData.data || [];

  return {
    data: items.map(transformComplex),
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || pageSize,
    totalPages: rawData.totalPages || 0,
  };
}

export async function searchByCommute(
  lat: number,
  lng: number,
  minutes: number,
  page: number = 1,
  pageSize: number = 20,
  status: string = ''
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    minutes: minutes.toString(),
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (status) params.set('status', status);

  const response = await apiClient.get<any>(
    `/api/housing/commute/?${params.toString()}`
  );

  const rawData = response.data || response;
  const items = rawData.data || [];

  return {
    data: items.map(transformComplex),
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || pageSize,
    totalPages: rawData.totalPages || 0,
  };
}

export async function searchAddressByKeyword(
  keyword: string
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  const params = new URLSearchParams({ keyword });
  const response = await apiClient.get<
    ApiResponse<Array<{ name: string; lat: number; lng: number }>>
  >(`/api/address/search?${params.toString()}`);

  return response.data;
}
