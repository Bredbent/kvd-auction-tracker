import React, { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  OutlinedInput,
  ListItemText,
  SelectChangeEvent,
  Skeleton,
  CircularProgress,
  FormControl,
  InputLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ClearIcon from '@mui/icons-material/Clear';
import { useFilters } from '../context/FilterContext';

// ITEM_HEIGHT is for dropdown menu items
const ITEM_HEIGHT = 48; 
// ITEM_PADDING_TOP is for dropdown menu padding
const ITEM_PADDING_TOP = 8;
// MenuProps is for dropdown configuration
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const FilterPanel: React.FC = () => {
  const {
    filters,
    filterOptions,
    setBrands,
    toggleBrand,
    toggleModel,
    toggleYear,
    setPriceRange,
    setMileageRange,
    resetFilters,
    loading,
    loadingModels,
    setFilters,
  } = useFilters();
  
  // Store expanded accordion state
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('brand');
  
  // Handle accordion expansion/collapse
  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

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

      {/* Brand & Model Filter */}
      <Accordion 
        expanded={expandedAccordion === 'brand'} 
        onChange={handleAccordionChange('brand')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Brands & Models ({filters.selectedBrands.length} brands selected)
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Brand Dropdown */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="brand-select-label">Select Brand(s)</InputLabel>
            <Select
              labelId="brand-select-label"
              multiple
              value={filters.selectedBrands}
              onChange={(event: SelectChangeEvent<string[]>) => {
                const value = event.target.value;
                setBrands(typeof value === 'string' ? [value] : value);
              }}
              input={<OutlinedInput label="Select Brand(s)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={value} 
                      onDelete={() => {
                        const newBrands = filters.selectedBrands.filter(brand => brand !== value);
                        setBrands(newBrands);
                      }}
                      deleteIcon={
                        <ClearIcon 
                          onMouseDown={(event) => event.stopPropagation()} 
                        />
                      }
                    />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
              size="small"
            >
              {filterOptions.brands.map((brand) => (
                <MenuItem key={brand} value={brand}>
                  <Checkbox checked={filters.selectedBrands.indexOf(brand) > -1} />
                  <ListItemText primary={brand} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Model Selection - Show models for each selected brand */}
          {filters.selectedBrands.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Filter by Model
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {filters.selectedBrands.map(brand => (
                <Box key={brand} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {brand} Models
                      {loadingModels[brand] && <CircularProgress size={12} sx={{ ml: 1 }} />}
                    </Typography>
                    
                    {/* Clear model selection for this brand */}
                    {filters.selectedModels[brand]?.length > 0 && (
                      <Button 
                        size="small" 
                        variant="text" 
                        startIcon={<ClearIcon />}
                        onClick={() => {
                          const newModels = { ...filters.selectedModels };
                          newModels[brand] = [];
                          toggleModel(brand, "");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                  
                  {loadingModels[brand] ? (
                    <Skeleton variant="rectangular" width="100%" height={100} />
                  ) : filterOptions.models[brand]?.length > 0 ? (
                    <>
                      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel id={`${brand}-model-select-label`}>Select {brand} Model(s)</InputLabel>
                        <Select
                          labelId={`${brand}-model-select-label`}
                          multiple
                          value={filters.selectedModels[brand] || []}
                          onChange={(event: SelectChangeEvent<string[]>) => {
                            const selectedModels = typeof event.target.value === 'string' 
                              ? [event.target.value] 
                              : event.target.value;
                            
                            const newModels = { ...filters.selectedModels };
                            newModels[brand] = selectedModels;
                            setFilters(prev => ({
                              ...prev,
                              selectedModels: newModels
                            }));
                          }}
                          input={<OutlinedInput label={`Select ${brand} Model(s)`} />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip 
                                  key={value} 
                                  label={value}
                                  size="small"
                                  onDelete={() => {
                                    const newModels = { ...filters.selectedModels };
                                    newModels[brand] = (newModels[brand] || []).filter(
                                      model => model !== value
                                    );
                                    setFilters(prev => ({
                                      ...prev,
                                      selectedModels: newModels
                                    }));
                                  }}
                                  deleteIcon={
                                    <ClearIcon 
                                      onMouseDown={(event) => event.stopPropagation()} 
                                    />
                                  }
                                />
                              ))}
                            </Box>
                          )}
                          MenuProps={MenuProps}
                        >
                          {filterOptions.models[brand].map((model) => (
                            <MenuItem key={model} value={model}>
                              <Checkbox checked={(filters.selectedModels[brand] || []).indexOf(model) > -1} />
                              <ListItemText primary={model} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {!filters.selectedModels[brand] || filters.selectedModels[brand].length === 0 
                          ? "All models selected" 
                          : `${filters.selectedModels[brand]?.length} of ${filterOptions.models[brand].length} models selected`}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2">No models available for {brand}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
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