import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChartFilters, FilterOptions } from '../types';
import { getMakes } from '../services/api';

interface FilterContextProps {
  filters: ChartFilters;
  filterOptions: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<ChartFilters>>;
  resetFilters: () => void;
  toggleBrand: (brand: string) => void;
  toggleYear: (year: number) => void;
  setPriceRange: (range: [number, number]) => void;
  setMileageRange: (range: [number, number]) => void;
  loading: boolean;
}

const initialFilters: ChartFilters = {
  selectedBrands: [],
  selectedYears: [],
  priceRange: [0, 1000000],
  mileageRange: [0, 50000],
};

const initialFilterOptions: FilterOptions = {
  brands: [],
  years: [],
};

const FilterContext = createContext<FilterContextProps | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<ChartFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);
  const [loading, setLoading] = useState(true);

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
        });
        
        console.log('Filter options loaded:', availableBrands.length, 'brands, years:', availableYears);
        
        // Start with some default selections to show data right away
        setFilters(prev => ({
          ...prev,
          // Select a few default brands and years to show data immediately
          selectedBrands: availableBrands.slice(0, 3),
          selectedYears: availableYears.slice(0, 3),
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
      selectedBrands: filterOptions.brands.slice(0, 3), // Limit to first 3 brands for better performance
      selectedYears: filterOptions.years.slice(0, 3),   // Limit to first 3 years for better performance
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

  return (
    <FilterContext.Provider 
      value={{ 
        filters, 
        filterOptions, 
        setFilters, 
        resetFilters, 
        toggleBrand,
        toggleYear,
        setPriceRange,
        setMileageRange,
        loading,
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