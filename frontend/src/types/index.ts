// API response types
export interface Car {
  id: number;
  kvd_id: string;
  brand: string;
  model: string;
  year: number;
  price: number | null;
  mileage: number | null;
  sale_date: string;
  url: string;
  created_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CarListResponse extends PaginatedResponse<Car> {}

export interface Statistics {
  count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_mileage: number;
  total_value: number;
  price_trend: number;
}

export interface MakeResponse {
  name: string;
  model_count: number;
}

export interface ModelResponse {
  name: string;
  auction_count: number;
}

export interface SearchParams {
  query: string;
  skip?: number;
  limit?: number;
}

export interface FilterOptions {
  brands: string[];
  years: number[];
  models: Record<string, string[]>;
  availableYearsByBrand?: Record<string, number[]>;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
}

export interface ChartFilters {
  selectedBrands: string[];
  selectedYears: number[];
  priceRange: [number, number];
  mileageRange: [number, number];
  selectedModels: Record<string, string[]>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChatResponse {
  response: string;
  sources?: Car[];
}

export interface ChartData {
  year: number;
  data: Car[];
}

export interface ChartPoint {
  x: number;
  y: number;
  brand: string;
  model: string;
  year: number;
  carId: number;
}