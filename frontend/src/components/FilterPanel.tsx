import React from 'react';
import {
  Paper,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useFilters } from '../context/FilterContext';

const FilterPanel: React.FC = () => {
  const {
    filters,
    filterOptions,
    toggleBrand,
    toggleYear,
    setPriceRange,
    setMileageRange,
    resetFilters,
    loading,
  } = useFilters();

  // Handle price range changes
  const handlePriceChange = (_event: Event, newValue: number | number[]) => {
    setPriceRange(newValue as [number, number]);
  };

  // Handle mileage range changes
  const handleMileageChange = (_event: Event, newValue: number | number[]) => {
    setMileageRange(newValue as [number, number]);
  };

  const formatPrice = (value: number) => {
    return `${value.toLocaleString()} kr`;
  };

  const formatMileage = (value: number) => {
    return `${value.toLocaleString()} mil`;
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography>Loading filters...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" display="flex" alignItems="center">
          <FilterListIcon sx={{ mr: 1 }} /> Filters
        </Typography>
        <Button
          startIcon={<RestartAltIcon />}
          onClick={resetFilters}
          size="small"
          color="primary"
        >
          Reset All
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Price Range Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Price Range (SEK)
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <TextField
            size="small"
            value={filters.priceRange[0]}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                setPriceRange([value, filters.priceRange[1]]);
              }
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">kr</InputAdornment>,
            }}
            sx={{ width: '45%' }}
          />
          <TextField
            size="small"
            value={filters.priceRange[1]}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                setPriceRange([filters.priceRange[0], value]);
              }
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">kr</InputAdornment>,
            }}
            sx={{ width: '45%' }}
          />
        </Box>
        <Slider
          value={filters.priceRange}
          onChange={handlePriceChange}
          valueLabelDisplay="auto"
          min={0}
          max={1000000}
          step={10000}
          valueLabelFormat={formatPrice}
        />
      </Box>

      {/* Mileage Range Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Mileage Range (mil)
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <TextField
            size="small"
            value={filters.mileageRange[0]}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                setMileageRange([value, filters.mileageRange[1]]);
              }
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">mil</InputAdornment>,
            }}
            sx={{ width: '45%' }}
          />
          <TextField
            size="small"
            value={filters.mileageRange[1]}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) {
                setMileageRange([filters.mileageRange[0], value]);
              }
            }}
            InputProps={{
              endAdornment: <InputAdornment position="end">mil</InputAdornment>,
            }}
            sx={{ width: '45%' }}
          />
        </Box>
        <Slider
          value={filters.mileageRange}
          onChange={handleMileageChange}
          valueLabelDisplay="auto"
          min={0}
          max={50000}
          step={1000}
          valueLabelFormat={formatMileage}
        />
      </Box>

      {/* Brand Filter */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Brands ({filters.selectedBrands.length}/{filterOptions.brands.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {filterOptions.brands.length > 0 ? (
              filterOptions.brands.map((brand) => (
                <Chip
                  key={brand}
                  label={brand}
                  onClick={() => toggleBrand(brand)}
                  color={filters.selectedBrands.includes(brand) ? 'primary' : 'default'}
                  variant={filters.selectedBrands.includes(brand) ? 'filled' : 'outlined'}
                  sx={{ m: 0.5 }}
                />
              ))
            ) : (
              <Typography variant="body2">No brands available</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Year Filter */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Years ({filters.selectedYears.length}/{filterOptions.years.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {filterOptions.years.length > 0 ? (
              filterOptions.years.map((year) => (
                <Chip
                  key={year}
                  label={year}
                  onClick={() => toggleYear(year)}
                  color={filters.selectedYears.includes(year) ? 'primary' : 'default'}
                  variant={filters.selectedYears.includes(year) ? 'filled' : 'outlined'}
                  sx={{ m: 0.5 }}
                />
              ))
            ) : (
              <Typography variant="body2">No years available</Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default FilterPanel;