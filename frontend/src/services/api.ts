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
  limit?: number,
  brand?: string,
  model?: string,
  year?: number,
  minPrice?: number,
  maxPrice?: number,
  minMileage?: number,
  maxMileage?: number
): Promise<CarListResponse> => {
  // Build params object, only including defined parameters
  const params: Record<string, any> = { skip };
  
  // Only add limit if it's defined
  if (limit !== undefined) {
    params.limit = limit;
  }
  
  // Add optional filter parameters if they exist
  if (brand) params.brand = brand;
  if (model) params.model = model;
  if (year) params.year = year;
  if (minPrice !== undefined) params.min_price = minPrice;
  if (maxPrice !== undefined) params.max_price = maxPrice;
  if (minMileage !== undefined) params.min_mileage = minMileage;
  if (maxMileage !== undefined) params.max_mileage = maxMileage;
  
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
  try {
    // Send request to the new AI assistant endpoint
    const response = await api.post<AIChatResponse>('/chat', { query });
    return response.data;
  } catch (error) {
    console.error('Error sending chat query:', error);
    // Return a friendly error message if the AI service is unavailable
    return {
      response: "I'm sorry, I'm having trouble connecting to the database right now. Please try again in a moment."
    };
  }
};

export default api;