import { useState, useEffect, useCallback } from 'react';
import { useFilters } from '../context/FilterContext';
import { getCars, searchCars } from '../services/api';
import { Car, ChartData } from '../types';

export const useCarData = () => {
  const { filters } = useFilters();
  const [cars, setCars] = useState<Car[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedCarId, setHighlightedCarId] = useState<number | null>(null);
  
  // Initialize with empty data to prevent undefined errors
  useEffect(() => {
    setCars([]);
    setChartData([]);
    console.log('Initial state set to prevent undefined errors');
  }, []);

  // Fetch car data based on filters and pagination
  const fetchCars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      
      // Use search API if search query is provided
      if (searchQuery.trim()) {
        response = await searchCars({
          query: searchQuery,
          skip: page * rowsPerPage,
          limit: rowsPerPage
        });
      } else {
        // In the new UI, we only allow one brand selection at a time
        // This simplifies the API call and filtering
        const brandToUse = filters.selectedBrands.length === 1 
          ? filters.selectedBrands[0] 
          : undefined;
          
        // We don't need to pass a limit if we're filtering by brand
        // The API will now handle returning all matching records for that brand
        
        // Regular API with filters
        response = await getCars(
          page * rowsPerPage,
          brandToUse ? undefined : rowsPerPage, // No limit when filtering by brand
          brandToUse, // Only filter by brand if exactly one is selected
          undefined, // model - we'll filter client-side 
          filters.selectedYears.length === 1 ? filters.selectedYears[0] : undefined,
          filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
          filters.priceRange[1] < 1000000 ? filters.priceRange[1] : undefined,
          filters.mileageRange[0] > 0 ? filters.mileageRange[0] : undefined,
          filters.mileageRange[1] < 50000 ? filters.mileageRange[1] : undefined
        );
      }
      
      // Process the response based on its format
      let allCars = [];
      
      if (Array.isArray(response)) {
        allCars = response;
      } else if (response && response.items && Array.isArray(response.items)) {
        allCars = response.items;
      } else if (response && typeof response === 'object') {
        // If we can't identify the format, try to extract cars data
        console.log('Extracting cars from response:', response);
        allCars = Object.values(response).filter(item => 
          item && typeof item === 'object' && 'id' in item
        );
      }
      
      console.log(`Received ${allCars.length} cars from API`);
      
      // Since we're only allowing single brand selection in the UI now,
      // we don't need to filter by brand again (API already did that)
      let filteredCars = allCars;
      
      // Apply model filtering based on selected models for each brand
      if (Object.keys(filters.selectedModels).length > 0) {
        filteredCars = filteredCars.filter(car => {
          // Only apply model filtering if this car's brand has models selected
          if (!filters.selectedModels[car.brand] || filters.selectedModels[car.brand].length === 0) {
            return true; // Keep all cars of this brand if no specific models are selected
          }
          // Keep only if car's model is in the selected models for this brand
          return filters.selectedModels[car.brand].includes(car.model);
        });
        console.log(`After model filtering: ${filteredCars.length} cars`);
      }
      
      // Apply year filtering if multiple years are selected
      if (filters.selectedYears.length > 1) {
        filteredCars = filteredCars.filter(car => 
          filters.selectedYears.includes(car.year)
        );
        console.log(`After year filtering: ${filteredCars.length} cars`);
      }
      
      // Set the filtered cars and total count
      setCars(filteredCars);
      setTotalCount(filteredCars.length);
      
    } catch (err) {
      console.error('Error fetching car data:', err);
      setError('Failed to fetch car data. Please try again later.');
      setCars([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, filters]);

  // Fetch filtered cars for chart data based on selected filters
  const fetchCarsForChart = useCallback(async () => {
    // Don't load chart data if no brands or years are selected
    if (filters.selectedBrands.length === 0 || filters.selectedYears.length === 0) {
      console.log('Skipping chart data load: No brands or years selected');
      setChartData([]);
      return;
    }

    console.log('Fetching chart data for filters:', filters);
    setChartLoading(true);
    setError(null);
    try {
      // For chart data, we always want all matching records
      // We'll apply all filtering client-side to get the most accurate charts
      
      // If we have exactly one brand selected, filter server-side for performance
      const brandToUse = filters.selectedBrands.length === 1 
        ? filters.selectedBrands[0] 
        : undefined;
      
      const response = await getCars(
        0, // skip
        undefined, // No limit - get all data
        brandToUse, // Apply brand filter on server if only one brand is selected
        undefined, // model - we'll filter client-side
        undefined, // year - we'll filter client-side
        filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
        filters.priceRange[1] < 1000000 ? filters.priceRange[1] : undefined,
        filters.mileageRange[0] > 0 ? filters.mileageRange[0] : undefined,
        filters.mileageRange[1] < 50000 ? filters.mileageRange[1] : undefined
      );
      
      // Extract cars from the response
      let allCars: Car[] = [];
      
      if (Array.isArray(response)) {
        allCars = response;
      } else if (response && response.items && Array.isArray(response.items)) {
        allCars = response.items;
      } else if (response && typeof response === 'object') {
        // If we can't identify the format, try to extract cars data
        allCars = Object.values(response).filter(item => 
          item && typeof item === 'object' && 'id' in item
        );
      }
      
      console.log(`Chart data: received ${allCars.length} cars from API`);
      
      // Apply all filtering client-side
      let filteredCars = allCars;
      
      // With single brand selection, API already filtered by brand
      // so we don't need to do it again if brand is selected
      if (filters.selectedBrands.length > 0) {
        console.log(`Chart data: brand already filtered by API: ${filters.selectedBrands[0]}`);
      }
      
      // Filter by models
      if (Object.keys(filters.selectedModels).length > 0) {
        filteredCars = filteredCars.filter(car => {
          // Skip if car has no brand
          if (!car.brand) return false;
          
          // If no models selected for this brand, keep all cars of this brand
          if (!filters.selectedModels[car.brand] || filters.selectedModels[car.brand].length === 0) {
            return true;
          }
          
          // Only keep if model is in the selected models for this brand
          return filters.selectedModels[car.brand].includes(car.model);
        });
        console.log(`Chart data: after model filtering: ${filteredCars.length} cars`);
      }
      
      // Filter by years
      if (filters.selectedYears.length > 0) {
        filteredCars = filteredCars.filter(car => 
          car.year && filters.selectedYears.includes(car.year)
        );
        console.log(`Chart data: after year filtering: ${filteredCars.length} cars`);
      }
      
      // Filter by price range
      filteredCars = filteredCars.filter(car => {
        const price = car.price !== null && car.price !== undefined ? car.price : 0;
        return price >= filters.priceRange[0] && price <= filters.priceRange[1];
      });
      console.log(`Chart data: after price filtering: ${filteredCars.length} cars`);
      
      // Filter by mileage range
      filteredCars = filteredCars.filter(car => {
        const mileage = car.mileage !== null && car.mileage !== undefined ? car.mileage : 0;
        return mileage >= filters.mileageRange[0] && mileage <= filters.mileageRange[1];
      });
      console.log(`Chart data: after mileage filtering: ${filteredCars.length} cars`);
      
      // Process the filtered data for the chart
      processChartData(filteredCars);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to fetch chart data. Please try again later.');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [filters]);

  // Process raw car data into chart format
  const processChartData = (cars: Car[]) => {
    // Only include years that are in the selected years filter
    const filteredCars = cars.filter(car => 
      filters.selectedYears.includes(car.year)
    );
    
    console.log('Processing chart data with', filteredCars.length, 'cars matching year filter');
    
    // Group cars by year
    const yearGroups: Record<number, Car[]> = {};
    
    filteredCars.forEach(car => {
      if (!car.year) return; // Skip cars with no year
      
      if (!yearGroups[car.year]) {
        yearGroups[car.year] = [];
      }
      
      yearGroups[car.year].push(car);
    });
    
    console.log('Year groups:', Object.keys(yearGroups).map(year => `${year}: ${yearGroups[parseInt(year)].length} cars`));
    
    // Convert to ChartData array
    const chartData: ChartData[] = Object.entries(yearGroups).map(([year, data]) => ({
      year: parseInt(year),
      data
    }));
    
    // Sort by year descending
    chartData.sort((a, b) => b.year - a.year);
    
    console.log('Final chart data:', chartData.map(d => `${d.year}: ${d.data.length} cars`));
    
    setChartData(chartData);
  };

  // Fetch data when filters or pagination changes
  useEffect(() => {
    fetchCars();
  }, [fetchCars]);
  
  // Fetch chart data separately when filters change
  useEffect(() => {
    fetchCarsForChart();
  }, [fetchCarsForChart]);

  // Handle page change
  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Reset to first page
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0); // Reset to first page
  };

  // Handle highlighting a car
  const handleHighlightCar = (carId: number) => {
    setHighlightedCarId(prevId => prevId === carId ? null : carId);
  };

  return {
    cars,
    chartData,
    loading: loading || chartLoading,
    error,
    totalCount,
    page,
    rowsPerPage,
    highlightedCarId,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearch,
    handleHighlightCar,
  };
};