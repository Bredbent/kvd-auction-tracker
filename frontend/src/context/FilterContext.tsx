import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChartFilters, FilterOptions } from '../types';
import { getMakes, getModels } from '../services/api';

interface FilterContextProps {
  filters: ChartFilters;
  filterOptions: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<ChartFilters>>;
  resetFilters: () => void;
  toggleBrand: (brand: string) => void;
  toggleModel: (brand: string, model: string) => void;
  toggleYear: (year: number) => void;
  setPriceRange: (range: [number, number]) => void;
  setMileageRange: (range: [number, number]) => void;
  setBrands: (brands: string[]) => void;
  loading: boolean;
  loadingModels: Record<string, boolean>;
}

const initialFilters: ChartFilters = {
  selectedBrands: [],
  selectedYears: [],
  priceRange: [0, 1000000],
  mileageRange: [0, 50000],
  selectedModels: {},
};

const initialFilterOptions: FilterOptions = {
  brands: [],
  years: [],
  models: {},
  availableYearsByBrand: {},
};

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<ChartFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(true);
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});

  // Load filter options from API
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // Get available brands
        const makes = await getMakes();
        const availableBrands = makes.map(make => make.name);
        
        // Generate years (last 10 years)
        const currentYear = new Date().getFullYear();
        const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);
        
        setFilterOptions({
          brands: availableBrands,
          years: availableYears,
          models: {}, // Initialize with empty models object
        });
        
        console.log('Filter options loaded:', availableBrands.length, 'brands, years:', availableYears);
        
        // Start with all years selected by default, but no brands
        setFilters(prev => ({
          ...prev,
          // Don't pre-select brands, let user choose
          selectedBrands: [],
          // Select all years by default
          selectedYears: availableYears,
        }));
        
        console.log('Default filters set');
      } catch (error) {
        console.error('Error loading filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, []);

  const resetFilters = () => {
    setFilters({
      ...initialFilters,
      selectedBrands: [], // No brands selected by default
      selectedYears: filterOptions.years, // All years selected by default
    });
  };

  // Function to filter years based on available data
  const fetchYearsForBrand = async (brand: string): Promise<void> => {
    try {
      // For now, we'll use getCars with a high limit to get all cars for a brand
      // In a production environment, you might want a dedicated API endpoint for this
      const response = await fetch(`/api/v1/cars?brand=${brand}&limit=1000`);
      const data = await response.json();
      
      // Extract unique years from the response
      const availableYears = new Set<number>();
      
      if (Array.isArray(data)) {
        data.forEach(car => {
          if (car.year) {
            availableYears.add(car.year);
          }
        });
      }
      
      // Sort years in descending order
      const sortedYears = Array.from(availableYears).sort((a, b) => b - a);
      
      console.log(`Available years for ${brand}:`, sortedYears);
      
      // Update filter options with years available for this brand
      setFilterOptions(prev => ({
        ...prev,
        availableYearsByBrand: {
          ...prev.availableYearsByBrand || {},
          [brand]: sortedYears
        }
      }));
      
      // Update selected years to only include available years
      setFilters(prev => {
        const updatedYears = prev.selectedYears.filter(year => sortedYears.includes(year));
        return {
          ...prev,
          selectedYears: updatedYears.length > 0 ? updatedYears : sortedYears.slice(0, 3) // Default to most recent 3 years if none match
        };
      });
      
    } catch (error) {
      console.error(`Error fetching years for ${brand}:`, error);
    }
  };

  const setBrands = (brands: string[]) => {
    setFilters(prev => ({
      ...prev,
      selectedBrands: brands,
      // Clear model selection when brand changes
      selectedModels: brands.length === 0 ? {} : 
        Object.fromEntries(
          Object.entries(prev.selectedModels)
            .filter(([brand]) => brands.includes(brand))
        )
    }));
    
    // If no brands selected, reset to all years
    if (brands.length === 0) {
      setFilters(prev => ({
        ...prev,
        selectedYears: filterOptions.years
      }));
      return;
    }
    
    // If one brand selected, fetch years for that brand
    if (brands.length === 1) {
      fetchYearsForBrand(brands[0]);
    }
    
    // Load models for each selected brand
    brands.forEach(async (brand) => {
      // Check if we already have models for this brand
      if (filterOptions.models[brand]?.length > 0) {
        return; // Skip if we already have models
      }
      
      try {
        setLoadingModels(prev => ({ ...prev, [brand]: true }));
        const models = await getModels(brand);
        const modelNames = models.map(model => model.name);
        
        // Update filter options with these models
        setFilterOptions(prev => ({
          ...prev,
          models: {
            ...prev.models,
            [brand]: modelNames
          }
        }));
      } catch (error) {
        console.error(`Error loading models for ${brand}:`, error);
      } finally {
        setLoadingModels(prev => ({ ...prev, [brand]: false }));
      }
    });
  };

  const toggleBrand = (brand: string) => {
    setFilters(prev => {
      if (prev.selectedBrands.includes(brand)) {
        return {
          ...prev,
          selectedBrands: prev.selectedBrands.filter(b => b !== brand),
        };
      } else {
        return {
          ...prev,
          selectedBrands: [...prev.selectedBrands, brand],
        };
      }
    });
  };

  const toggleYear = (year: number) => {
    setFilters(prev => {
      if (prev.selectedYears.includes(year)) {
        return {
          ...prev,
          selectedYears: prev.selectedYears.filter(y => y !== year),
        };
      } else {
        return {
          ...prev,
          selectedYears: [...prev.selectedYears, year],
        };
      }
    });
  };

  const setPriceRange = (range: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      priceRange: range,
    }));
  };

  const setMileageRange = (range: [number, number]) => {
    setFilters(prev => ({
      ...prev,
      mileageRange: range,
    }));
  };
  
  const toggleModel = (brand: string, model: string) => {
    setFilters(prev => {
      // Make a copy of the selectedModels object
      const newSelectedModels = { ...prev.selectedModels };
      
      // Initialize the array for this brand if it doesn't exist
      if (!newSelectedModels[brand]) {
        newSelectedModels[brand] = [];
      }
      
      if (newSelectedModels[brand].includes(model)) {
        // If model is already selected, remove it
        newSelectedModels[brand] = newSelectedModels[brand].filter(m => m !== model);
      } else {
        // If model is not selected, add it
        newSelectedModels[brand] = [...newSelectedModels[brand], model];
      }
      
      return {
        ...prev,
        selectedModels: newSelectedModels,
      };
    });
  };

  return (
    <FilterContext.Provider 
      value={{ 
        filters, 
        filterOptions, 
        setFilters, 
        resetFilters, 
        toggleBrand,
        toggleModel,
        toggleYear,
        setPriceRange,
        setMileageRange,
        setBrands,
        loading,
        loadingModels,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};