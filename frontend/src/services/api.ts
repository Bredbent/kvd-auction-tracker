import axios from 'axios';
import { 
  Car, 
  CarListResponse, 
  Statistics, 
  MakeResponse, 
  ModelResponse,
  SearchParams,
  AIChatResponse
} from '../types';

const API_URL = '/api/v1';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Car API functions
export const getCars = async (
  skip = 0, 
  limit = 20,
  brand?: string,
  model?: string,
  year?: number,
  minPrice?: number,
  maxPrice?: number,
  minMileage?: number,
  maxMileage?: number
): Promise<CarListResponse> => {
  const params = { 
    skip, 
    limit,
    ...(brand && { brand }),
    ...(model && { model }),
    ...(year && { year }),
    ...(minPrice && { min_price: minPrice }),
    ...(maxPrice && { max_price: maxPrice }),
    ...(minMileage && { min_mileage: minMileage }),
    ...(maxMileage && { max_mileage: maxMileage })
  };
  
  const response = await api.get<CarListResponse>('/cars', { params });
  return response.data;
};

export const getCarById = async (id: number): Promise<Car> => {
  const response = await api.get<Car>(`/cars/${id}`);
  return response.data;
};

export const searchCars = async (searchParams: SearchParams): Promise<CarListResponse> => {
  const response = await api.post<CarListResponse>('/cars/search', searchParams);
  return response.data;
};

// Statistics API functions
export const getStatistics = async (): Promise<Statistics> => {
  const response = await api.get<Statistics>('/stats');
  return response.data;
};

export const getModelStatistics = async (
  brand: string, 
  model: string
): Promise<Statistics> => {
  const response = await api.get<Statistics>(`/stats/${brand}/${model}`);
  return response.data;
};

// Makes and models API functions
export const getMakes = async (): Promise<MakeResponse[]> => {
  const response = await api.get<MakeResponse[]>('/makes');
  return response.data;
};

export const getModels = async (make: string): Promise<ModelResponse[]> => {
  const response = await api.get<ModelResponse[]>(`/makes/${make}/models`);
  return response.data;
};

// AI Chat API function
export const sendChatQuery = async (query: string): Promise<AIChatResponse> => {
  const response = await api.post<AIChatResponse>('/chat', { query });
  return response.data;
};

export default api;