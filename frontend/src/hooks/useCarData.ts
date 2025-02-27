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
        // Regular API with filters
        response = await getCars(
          page * rowsPerPage,
          rowsPerPage,
          filters.selectedBrands.length > 0 && filters.selectedBrands.length < 5 
            ? filters.selectedBrands[0] 
            : undefined,
          undefined, // model - we'll filter client-side 
          filters.selectedYears.length === 1 ? filters.selectedYears[0] : undefined,
          filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
          filters.priceRange[1] < 1000000 ? filters.priceRange[1] : undefined,
          filters.mileageRange[0] > 0 ? filters.mileageRange[0] : undefined,
          filters.mileageRange[1] < 50000 ? filters.mileageRange[1] : undefined
        );
      }
      
      // Process the response based on its format
      if (Array.isArray(response)) {
        setCars(response);
        setTotalCount(response.length);
      } else if (response && response.items && Array.isArray(response.items)) {
        setCars(response.items);
        setTotalCount(response.total || response.items.length);
      } else {
        // If we can't identify the format, try to extract cars data
        console.log('Unexpected API response format:', response);
        const extractedCars = response ? Object.values(response).filter(item => 
          item && typeof item === 'object' && 'id' in item
        ) : [];
        setCars(extractedCars);
        setTotalCount(extractedCars.length);
      }
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
    // Don't load chart data if too many brands are selected or no brands/years are selected
    if (filters.selectedBrands.length === 0 || filters.selectedYears.length === 0) {
      console.log('Skipping chart data load: No brands or years selected');
      setChartData([]);
      return;
    }

    console.log('Fetching chart data for filters:', filters);
    setChartLoading(true);
    setError(null);
    try {
      // Only fetch data for specific brands and years that are selected
      // Don't use brandToFetch as server-side filtering - get all cars and filter client-side
      // This ensures we get all the data we need for different selections
      
      const response = await getCars(
        0, // skip
        500, // increased limit to get more data
        undefined, // get all brands and filter client-side
        undefined, // model
        undefined, // year - we'll filter client-side
        filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
        filters.priceRange[1] < 1000000 ? filters.priceRange[1] : undefined,
        filters.mileageRange[0] > 0 ? filters.mileageRange[0] : undefined,
        filters.mileageRange[1] < 50000 ? filters.mileageRange[1] : undefined
      );
      
      // Handle the API response which might not have the expected format
      let carsData: Car[] = [];
      if (Array.isArray(response)) {
        // If the response is already an array
        carsData = response;
      } else if (response && response.items && Array.isArray(response.items)) {
        // If the response has an items property that is an array
        carsData = response.items;
      } else if (response && Array.isArray(Object.values(response))) {
        // If the response is an object whose values form an array
        carsData = Object.values(response);
      } else {
        // Default to empty array if we can't find car data
        carsData = [];
      }
      
      // Client-side filtering for multiple brands and years
      const filteredCars = carsData.filter(car => {
        // First ensure the car and its required properties exist
        if (!car || !car.brand || car.year === undefined || car.year === null) {
          return false;
        }
        
        // Check if brand and year match filters
        const brandMatch = filters.selectedBrands.includes(car.brand);
        const yearMatch = filters.selectedYears.includes(car.year);
        
        // Handle possible null values for price and mileage
        const price = car.price !== null && car.price !== undefined ? car.price : 0;
        const mileage = car.mileage !== null && car.mileage !== undefined ? car.mileage : 0;
        
        // Check price and mileage ranges
        const priceMatch = price >= filters.priceRange[0] && price <= filters.priceRange[1];
        const mileageMatch = mileage >= filters.mileageRange[0] && mileage <= filters.mileageRange[1];
        
        return brandMatch && yearMatch && priceMatch && mileageMatch;
      });
      
      console.log('Filtered cars:', filteredCars.length, 'out of', carsData.length);
      
      // Process data for chart
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