import React, { useState, useEffect, useRef, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Paper, Typography, CircularProgress, useTheme, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import ViewDayIcon from '@mui/icons-material/ViewDay';
import { ChartData, Car, ChartFilters } from '../types';

interface MultiPanelChartProps {
  data: ChartData[];
  loading: boolean;
  filters: ChartFilters;
  onPointClick?: (carId: number) => void;
  highlightedCarId?: number | null;
}

interface BrandColor {
  [key: string]: string;
}

const MultiPanelChart: React.FC<MultiPanelChartProps> = ({
  data,
  loading,
  filters,
  onPointClick,
  highlightedCarId,
}) => {
  const theme = useTheme();
  const plotRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(500);
  const [filteredData, setFilteredData] = useState<ChartData[]>([]);
  const [plotRendered, setPlotRendered] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');

  // Generate a color map for brands
  const brandColors: BrandColor = {};
  const colorPalette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  ];

  // Filter the data based on the selected filters
  useEffect(() => {
    if (!data || data.length === 0) {
      setFilteredData([]);
      return;
    }

    console.log("Processing chart data for years:", filters.selectedYears);
    
    // First, create a structure for each selected year
    const yearDataMap: Record<number, ChartData> = {};
    
    // Initialize structure for each selected year
    filters.selectedYears.forEach(year => {
      yearDataMap[year] = {
        year,
        data: []
      };
    });
    
    // Go through all cars and put them in the right year bucket - first collect all matching cars
    const matchingCars: Car[] = [];
    
    data.forEach(yearData => {
      yearData.data.forEach(car => {
        // Skip cars that don't meet basic criteria
        if (!car || !car.brand || car.year === undefined || car.year === null) {
          return;
        }
        
        // Skip cars that don't match selected brands
        if (!filters.selectedBrands.includes(car.brand)) {
          return;
        }
        
        // Check if we need to filter by model
        const hasModelFilter = filters.selectedBrands.length === 1 && 
                              filters.selectedModels[filters.selectedBrands[0]]?.length > 0;
                              
        // If model filtering is active, check if this car matches a selected model
        if (hasModelFilter) {
          const brandModels = filters.selectedModels[filters.selectedBrands[0]] || [];
          if (!brandModels.includes(car.model)) {
            return; // Skip this car if its model isn't selected
          }
        }
        
        // Handle possible null values for price and mileage
        const price = car.price !== null && car.price !== undefined ? car.price : 0;
        const mileage = car.mileage !== null && car.mileage !== undefined ? car.mileage : 0;
        
        // Skip cars outside price/mileage range
        if (price < filters.priceRange[0] || price > filters.priceRange[1] ||
            mileage < filters.mileageRange[0] || mileage > filters.mileageRange[1]) {
          return;
        }
        
        // Add to the list of matching cars
        matchingCars.push(car);
      });
    });
    
    // After filtering, organize matching cars into their year buckets
    matchingCars.forEach(car => {
      // Create a bucket for this year if it doesn't exist yet
      if (!yearDataMap[car.year]) {
        yearDataMap[car.year] = {
          year: car.year,
          data: []
        };
      }
      yearDataMap[car.year].data.push(car);
    });
    
    // Filter out years with no data (only when model filtering is active)
    const hasModelFilter = filters.selectedBrands.length === 1 && 
                          filters.selectedModels[filters.selectedBrands[0]]?.length > 0;
    
    let filtered;
    if (hasModelFilter) {
      // When model filtering is active, only keep years with data
      filtered = Object.values(yearDataMap)
        .filter(yearData => yearData.data.length > 0)
        .sort((a, b) => b.year - a.year);
        
      console.log("With model filtering, keeping only years with data");
    } else {
      // Without model filtering, keep all years
      filtered = Object.values(yearDataMap)
        .sort((a, b) => b.year - a.year);
    }
      
    console.log("Years with data:", 
      filtered.map(y => `${y.year}: ${y.data.length} cars`).join(", "));
    
    setFilteredData(filtered);
  }, [data, filters]);

  // Dynamically adjust chart height based on number of panels and layout mode
  useEffect(() => {
    console.log('Filtered data changed:', filteredData);
    if (filteredData.length > 0) {
      // Count panels with actual data (not empty panels)
      const panelsWithData = filteredData.filter(yearData => yearData.data.length > 0).length;
      console.log(`Setting chart height for ${filteredData.length} panels (${panelsWithData} with data)`);
      
      if (layoutMode === 'vertical') {
        // Vertical layout: 400px per panel with data, minimum 500px
        const panelHeight = panelsWithData > 0 ? panelsWithData * 400 : filteredData.length * 400;
        setChartHeight(Math.max(500, panelHeight));
      } else {
        // Horizontal layout: fixed height, but taller to accommodate legend
        setChartHeight(800);
      }
      setPlotRendered(true);
    } else {
      console.log('No filtered data, setting plotRendered to false');
      setPlotRendered(false);
    }
  }, [filteredData, layoutMode]);
  
  // Force Plotly to re-render the plot when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (plotRef.current) {
        // Force redraw by toggling visibility
        const plot = plotRef.current;
        plot.style.display = 'none';
        setTimeout(() => {
          if (plot) {
            plot.style.display = 'block';
          }
        }, 10);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Assign colors to models when a single brand is selected, or to brands otherwise
  const getColorData = () => {
    // Check if we have a single brand selected
    const singleBrandMode = filters.selectedBrands.length === 1;
    const selectedBrand = singleBrandMode ? filters.selectedBrands[0] : null;
    
    // We'll either collect models (for single brand) or brands
    const modelColors: Record<string, string> = {};
    const allModels = new Set<string>();
    
    if (singleBrandMode) {
      console.log(`Color coding by model for brand: ${selectedBrand}`);
      
      // Collect all unique models for the selected brand
      filteredData.forEach(yearData => {
        yearData.data.forEach(car => {
          if (car.brand === selectedBrand) {
            allModels.add(car.model);
          }
        });
      });
      
      // Assign colors to models
      Array.from(allModels).sort().forEach((model, index) => {
        modelColors[model] = colorPalette[index % colorPalette.length];
      });
      
      console.log(`Assigned colors to ${allModels.size} models`);
      return { 
        colorMap: modelColors, 
        entities: Array.from(allModels), 
        colorBy: 'model',
        brandName: selectedBrand
      };
    } else {
      console.log('Color coding by brand (multiple brands selected)');
      
      // Collect all unique brands
      const allBrands = new Set<string>();
      filteredData.forEach(yearData => {
        yearData.data.forEach(car => {
          allBrands.add(car.brand);
        });
      });
      
      // Assign colors to brands
      const brandColors: Record<string, string> = {};
      Array.from(allBrands).sort().forEach((brand, index) => {
        brandColors[brand] = colorPalette[index % colorPalette.length];
      });
      
      return { 
        colorMap: brandColors, 
        entities: Array.from(allBrands),
        colorBy: 'brand',
        brandName: null
      };
    }
  };

  const { colorMap: colors, entities: colorEntities, colorBy, brandName } = getColorData();

  // Format data for Plotly - Calculate trendlines for each entity (brand or model)
  const getPlotData = () => {
    console.log(`Preparing plot data for ${filteredData.length} years, color by: ${colorBy}`);
    const plotlyData: any[] = [];
    
    // Track which entities have been added to the legend
    const addedToLegend = new Set<string>();
    const isHorizontal = layoutMode === 'horizontal';
    
    // Create a separate trace for each year panel
    filteredData.forEach((yearData, panelIndex) => {
      console.log(`Processing year ${yearData.year} (panel ${panelIndex+1}) with ${yearData.data.length} cars`);
      
      // Add a "No data" annotation if the year has no data
      if (yearData.data.length === 0) {
        // We'll still create an empty scatter plot to maintain the panel
        const emptyTrace = {
          x: [],
          y: [],
          mode: 'markers',
          type: 'scatter',
          name: `No data (${yearData.year})`,
          xaxis: `x${panelIndex+1}`,
          yaxis: `y${panelIndex+1}`,
          showlegend: false
        };
        plotlyData.push(emptyTrace);
        
        // Return early as there's no data to process for this year
        return;
      }
      
      // Group cars by either model (for single brand) or brand (for multiple brands)
      const groups: { [key: string]: Car[] } = {};
      
      if (colorBy === 'model') {
        // We're in single brand mode - group by model
        yearData.data.forEach(car => {
          if (car.brand !== brandName) return; // Safety check
          
          if (!groups[car.model]) {
            groups[car.model] = [];
          }
          groups[car.model].push(car);
        });
      } else {
        // We're in multi-brand mode - group by brand
        yearData.data.forEach(car => {
          if (!groups[car.brand]) {
            groups[car.brand] = [];
          }
          groups[car.brand].push(car);
        });
      }
      
      // Create a trace for each entity (model or brand) in this year panel
      Object.entries(groups).forEach(([entity, cars]) => {
        // Even with just 1 car, we want to show it now
        if (cars.length === 0) {
          console.log(`Skipping ${entity} in year ${yearData.year}: no cars`);
          return;
        }
        
        // Extract mileage and price data - back to original orientation
        const xValues = cars.map(car => car.mileage === null || car.mileage === undefined ? 0 : car.mileage);
        const yValues = cars.map(car => car.price === null || car.price === undefined ? 0 : car.price);
        
        // Modern styling for markers
        const markerStyle = {
          color: colors[entity],
          size: 10,
          opacity: 0.85,
          line: {
            color: 'white',
            width: 1
          },
          symbol: 'circle' // consistent circle shape
        };
        
        // Create the scatter trace - using panel index+1 for axis reference
        const trace = {
          x: xValues,
          y: yValues,
          text: cars.map(car => {
            const price = car.price === null || car.price === undefined ? '-' : `${car.price.toLocaleString()} kr`;
            const mileage = car.mileage === null || car.mileage === undefined ? '-' : `${car.mileage.toLocaleString()} mil`;
            return `<b>${car.brand} ${car.model}</b><br>` +
              `Year: ${car.year}<br>` +
              `Price: ${price}<br>` +
              `Mileage: ${mileage}`;
          }),
          customdata: cars.map(car => car.id),
          mode: 'markers',
          marker: markerStyle,
          type: 'scatter',
          name: colorBy === 'model' ? `${entity}` : entity, // Just model name if single brand selected
          legendgroup: entity,
          xaxis: `x${panelIndex+1}`,
          yaxis: `y${panelIndex+1}`,
          showlegend: !addedToLegend.has(entity), // Show in legend if not already added
          hovertemplate: '%{text}<extra></extra>'
        };
        
        // Mark this entity as added to the legend
        addedToLegend.add(entity);
        
        console.log(`Adding scatter trace for ${entity} in year ${yearData.year}: ${cars.length} cars`);
        plotlyData.push(trace);
        
        // Add trendline if we have enough points (at least 3)
        if (cars.length >= 3) {
          // Calculate simple linear regression
          // First, filter out any data points with null/undefined/zero values
          const validDataPoints = cars.filter(car => 
            car.mileage !== null && car.mileage !== undefined && car.mileage > 0 &&
            car.price !== null && car.price !== undefined && car.price > 0
          );
          
          if (validDataPoints.length >= 3) {
            // Back to original orientation
            const validX = validDataPoints.map(car => car.mileage as number);
            const validY = validDataPoints.map(car => car.price as number);
            
            // Calculate trendline with simple linear regression (with flipped axes)
            // y = mx + b
            const n = validX.length;
            const sumX = validX.reduce((a, b) => a + b, 0);
            const sumY = validY.reduce((a, b) => a + b, 0);
            const sumXY = validX.reduce((a, b, i) => a + b * validY[i], 0);
            const sumXX = validX.reduce((a, b) => a + b * b, 0);
            
            // Calculate slope and intercept for the regression line
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Create points for the trendline
            const minX = Math.min(...validX);
            const maxX = Math.max(...validX);
            
            const trendlineX = [minX, maxX];
            const trendlineY = trendlineX.map(x => slope * x + intercept);
            
            // Create the trendline trace
            const trendlineTrace = {
              x: trendlineX,
              y: trendlineY,
              mode: 'lines',
              type: 'scatter',
              name: `${entity} trendline`,
              line: {
                color: colors[entity],
                width: 2,
                dash: isHorizontal ? 'solid' : 'dash' // Solid for horizontal, dashed for vertical
              },
              legendgroup: entity,
              xaxis: `x${panelIndex+1}`,
              yaxis: `y${panelIndex+1}`,
              showlegend: false,
              hoverinfo: 'none'
            };
            
            plotlyData.push(trendlineTrace);
          }
        }
        
        // Add highlighted point if needed
        if (highlightedCarId !== null && highlightedCarId !== undefined) {
          const highlightedCar = cars.find(car => car.id === highlightedCarId);
          if (highlightedCar) {
            const highlightTrace = {
              // Back to original orientation
              x: [highlightedCar.mileage === null || highlightedCar.mileage === undefined ? 0 : highlightedCar.mileage],
              y: [highlightedCar.price === null || highlightedCar.price === undefined ? 0 : highlightedCar.price],
              customdata: [highlightedCar.id],
              mode: 'markers',
              marker: {
                color: colorBy === 'model' ? colors[highlightedCar.model] : colors[highlightedCar.brand],
                size: 16,
                opacity: 1,
                line: {
                  color: '#333',
                  width: 2
                },
                symbol: 'circle'
              },
              type: 'scatter',
              name: `Highlighted: ${highlightedCar.brand} ${highlightedCar.model}`,
              legendgroup: colorBy === 'model' ? highlightedCar.model : highlightedCar.brand,
              xaxis: `x${panelIndex+1}`,
              yaxis: `y${panelIndex+1}`,
              showlegend: false,
              hoverinfo: 'skip'
            };
            
            plotlyData.push(highlightTrace);
          }
        }
      });
      
      // Add "No data available" annotation if no traces were added for this year
      if (Object.keys(groups).length === 0) {
        const emptyTrace = {
          x: [],
          y: [],
          mode: 'markers',
          type: 'scatter',
          name: `No data (${yearData.year})`,
          xaxis: `x${panelIndex+1}`,
          yaxis: `y${panelIndex+1}`,
          showlegend: false
        };
        plotlyData.push(emptyTrace);
      }
    });
    
    return plotlyData;
  };

  // Generate layout for multi-panel chart
  const getLayout = useMemo(() => {
    // Basic layout that changes based on the layout mode
    const isVertical = layoutMode === 'vertical';
    
    // Define grid layout based on mode
    let gridConfig;
    if (isVertical) {
      // Vertical layout - one column, multiple rows
      gridConfig = {
        rows: filteredData.length,
        columns: 1,
        pattern: 'independent',
        roworder: 'top to bottom',
        ygap: 0.12, // Reduced gap for cleaner look
        xgap: 0.08,
        subplots: filteredData.map((_, i) => `x${i+1}y${i+1}`)
      };
    } else {
      // Horizontal layout - one row, multiple columns
      gridConfig = {
        rows: 1,
        columns: filteredData.length,
        pattern: 'independent',
        roworder: 'top to bottom',
        ygap: 0.12,
        xgap: 0.08,
        subplots: filteredData.map((_, i) => `x${i+1}y${i+1}`)
      };
    }
    
    // Determine legend configuration
    const legendConfig = {
      traceorder: 'normal',
      orientation: isVertical ? (colorEntities.length > 5 ? 'v' : 'h') : 'v',
      y: isVertical ? (colorEntities.length > 5 ? 1.0 : 1.07) : 1.0,
      x: isVertical ? (colorEntities.length > 5 ? 1.02 : 0.5) : 1.02,
      xanchor: isVertical ? (colorEntities.length > 5 ? 'left' : 'center') : 'left',
      yanchor: 'top',
      bgcolor: 'rgba(255, 255, 255, 0.9)',
      bordercolor: '#eaeaea',
      borderwidth: 1,
      font: {
        size: 12,
        family: '"Roboto", "Helvetica", "Arial", sans-serif'
      }
    };
    
    const layout: any = {
      grid: gridConfig,
      height: chartHeight, 
      width: isVertical ? undefined : Math.max(800, filteredData.length * 300),
      showlegend: true,
      autosize: isVertical, // Fixed width for horizontal to ensure adequate space
      responsive: true,
      legend: legendConfig,
      hoverlabel: {
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        font: {
          size: 12,
          color: '#333',
          family: '"Roboto", "Helvetica", "Arial", sans-serif'
        },
        bordercolor: '#eaeaea',
        align: 'left'
      },
      margin: {
        l: 60,
        r: isVertical ? 30 : 100, // More right margin for horizontal layout with legend
        t: 80,
        b: 60
      },
      paper_bgcolor: 'rgba(255, 255, 255, 0)',
      plot_bgcolor: 'rgba(255, 255, 255, 0)',
      hovermode: 'closest',
      // Main title
      title: {
        text: 'KVD Auctions: Price vs Mileage by Year',
        font: {
          size: 20,
          color: '#333',
          family: '"Roboto", "Helvetica", "Arial", sans-serif',
          weight: 500
        },
        x: 0.5,
        xanchor: 'center'
      },
      // Ensure plot stays visible
      datarevision: Date.now() // This forces a re-render
    };
    
    return layout;
  }, [filteredData.length, chartHeight, colorEntities.length, layoutMode]);
    
  // Add subplots for each year - separate function to avoid mixing with useMemo
  const completeLayout = () => {
    // Start with the base layout
    const layout = {...getLayout};
    
    const isVertical = layoutMode === 'vertical';
    
    // Calculate domain values based on layout mode
    let domains: { [key: string]: { x: [number, number], y: [number, number] } } = {};
    
    if (isVertical) {
      // Vertical layout - calculate domain for each row
      const panelHeight = 1.0 / filteredData.length;
      const padding = 0.03; // 3% padding between panels for cleaner look
      
      filteredData.forEach((yearData, i) => {
        const panelBottom = 1.0 - (i + 1) * panelHeight + (padding / 2);
        const panelTop = 1.0 - i * panelHeight - (padding / 2);
        domains[`panel${i+1}`] = {
          x: [0, 1],
          y: [panelBottom, panelTop]
        };
      });
    } else {
      // Horizontal layout - calculate domain for each column
      const panelWidth = 1.0 / filteredData.length;
      const padding = 0.03; // 3% padding between panels
      
      filteredData.forEach((yearData, i) => {
        const panelLeft = i * panelWidth + (padding / 2);
        const panelRight = (i + 1) * panelWidth - (padding / 2);
        domains[`panel${i+1}`] = {
          x: [panelLeft, panelRight],
          y: [0, 1]
        };
      });
    }
    
    // Calculate global min/max values for all data points to ensure consistent scaling
    let globalMaxMileage = 0;
    let globalMaxPrice = 0;
    
    // Find maximum values across all panels
    filteredData.forEach(yearData => {
      yearData.data.forEach(car => {
        if (car.mileage !== null && car.mileage !== undefined && car.mileage > globalMaxMileage) {
          globalMaxMileage = car.mileage;
        }
        if (car.price !== null && car.price !== undefined && car.price > globalMaxPrice) {
          globalMaxPrice = car.price;
        }
      });
    });
    
    // Add a buffer to make sure points are visible (not at the edge)
    globalMaxMileage = Math.ceil(globalMaxMileage * 1.1);
    globalMaxPrice = Math.ceil(globalMaxPrice * 1.1);
    
    // Format price axis with K for thousands
    const formatPrice = (val: number) => {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(0) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(0) + 'K';
      }
      return val.toString();
    };
    
    // Ensure we have reasonable minimum values for scales
    globalMaxMileage = Math.max(globalMaxMileage, 5000);
    globalMaxPrice = Math.max(globalMaxPrice, 100000);
    
    console.log(`Global max values for consistent scaling - Mileage: ${globalMaxMileage}, Price: ${globalMaxPrice}`);
    
    // Add subplots for each year
    filteredData.forEach((yearData, i) => {
      const axisNum = i + 1;
      const domain = domains[`panel${axisNum}`];
      
      // Get the domain coordinates based on layout mode
      console.log(`Panel ${axisNum} (${yearData.year}): domain = x:${domain.x}, y:${domain.y}`);
      
      // Shared styles for axes
      const axisStyles = {
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: 'rgba(221, 221, 221, 0.5)',
        gridcolor: 'rgba(245, 245, 245, 0.5)',
        linecolor: 'rgba(128, 128, 128, 0.2)',
        showgrid: true,
        fixedrange: false, // Allow zooming
        showline: true,
        mirror: true
      };
      
      // X-axis is Mileage
      layout[`xaxis${axisNum}`] = {
        ...axisStyles,
        title: {
          text: isVertical ? 'Mileage (mil)' : '',
          font: {
            size: 11,
            family: '"Roboto", "Helvetica", "Arial", sans-serif',
            color: '#555'
          },
          standoff: 5
        },
        range: [0, globalMaxMileage],
        rangemode: 'nonnegative',
        tickfont: {
          size: 10,
          family: '"Roboto", "Helvetica", "Arial", sans-serif',
          color: '#777'
        },
        tickformat: '.0f',
        tickmode: 'auto',
        nticks: 5,
        showticklabels: true,
        domain: domain.x,
        tickangle: 0
      };
      
      // Y-axis is Price
      layout[`yaxis${axisNum}`] = {
        ...axisStyles,
        title: {
          text: isVertical ? 
            `${yearData.year} - Price (SEK)` : 
            `Price (SEK)`,
          font: {
            size: isVertical ? 12 : 11,
            family: '"Roboto", "Helvetica", "Arial", sans-serif',
            weight: isVertical ? 'bold' : 'normal',
            color: '#555'
          },
          standoff: 5
        },
        range: [0, globalMaxPrice],
        rangemode: 'nonnegative',
        tickfont: {
          size: 10,
          family: '"Roboto", "Helvetica", "Arial", sans-serif',
          color: '#777'
        },
        tickformat: function(val: number) {
          if (val >= 1000000) return (val/1000000).toFixed(1) + 'M';
          if (val >= 1000) return (val/1000).toFixed(0) + 'K';
          return val.toString();
        },
        tickmode: 'auto',
        nticks: 5,
        showticklabels: true,
        domain: domain.y
      };
      
      // Add annotations - different positioning based on layout mode
      layout.annotations = layout.annotations || [];
      
      // Year annotation at the top center of each panel in horizontal mode
      // or as part of the y-axis title in vertical mode
      if (!isVertical) {
        layout.annotations.push({
          text: `${yearData.year}`,
          font: {
            size: 14,
            family: '"Roboto", "Helvetica", "Arial", sans-serif',
            weight: 'bold',
            color: '#333'
          },
          showarrow: false,
          x: (domain.x[0] + domain.x[1]) / 2,
          y: domain.y[1] + 0.02,
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'bottom'
        });
      }
      
      // Add "No data available" annotation if this year has no data
      if (yearData.data.length === 0) {
        layout.annotations.push({
          text: 'No Data Available',
          font: {
            size: 14,
            family: '"Roboto", "Helvetica", "Arial", sans-serif',
            color: '#888'
          },
          showarrow: false,
          x: (domain.x[0] + domain.x[1]) / 2,
          y: (domain.y[0] + domain.y[1]) / 2,
          xref: 'paper',
          yref: 'paper',
          xanchor: 'center',
          yanchor: 'middle'
        });
      }
    });
    
    return layout;
  };

  // Handle point click events
  const handlePointClick = (event: any) => {
    if (onPointClick && event.points && event.points[0]) {
      const carId = event.points[0].customdata;
      onPointClick(carId);
    }
  };

  if (loading) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 4,
          minHeight: 500
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading chart data...
        </Typography>
      </Paper>
    );
  }

  // Debug information to help diagnose the issue
  console.log('filteredData:', filteredData);
  console.log('filters:', filters);
  console.log('plotRendered:', plotRendered);
  
  // Check if we have valid data to render
  // At least one panel must have data, or we need to show "No data available"
  const hasFilteredData = filteredData && filteredData.length > 0;
  
  if (!hasFilteredData) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 4,
          minHeight: 500
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No data available for the selected filters
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          {filters.selectedBrands.length === 0 ? (
            "Select at least one brand from the filter panel"
          ) : filters.selectedYears.length === 0 ? (
            "Select at least one year from the filter panel"
          ) : (
            "Try adjusting your filters to see auction data"
          )}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {brandName ? 
              `${brandName} Models: Price vs. Mileage by Year` : 
              `KVD Auctions: Price vs. Mileage by Year`}
          </Typography>
          <ToggleButtonGroup
            value={layoutMode}
            exclusive
            onChange={(e, newMode) => newMode && setLayoutMode(newMode)}
            size="small"
            aria-label="chart layout"
          >
            <ToggleButton value="vertical" aria-label="vertical layout">
              <ViewDayIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="horizontal" aria-label="horizontal layout">
              <ViewAgendaIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {brandName ? 
            `Showing ${colorEntities.length} different models for ${brandName}. Each color represents a different model.` : 
            `Each panel represents a different model year. Colors indicate different brands.`}
          {" X-axis shows Mileage (mil), Y-axis shows Price (SEK). Dashed lines show trends. Hover over points for details."}
        </Typography>
      </Box>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <div ref={plotRef} style={{ width: '100%', minHeight: layoutMode === 'vertical' ? '600px' : '800px' }}>
          {/* Always render the Plot component, regardless of plotRendered state */}
          <Plot
            data={getPlotData()}
            layout={completeLayout()}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'select2d'],
              displaylogo: false,
              toImageButtonOptions: {
                format: 'png',
                filename: 'kvd_auction_chart',
                height: chartHeight,
                width: layoutMode === 'horizontal' ? Math.max(800, filteredData.length * 300) : 1200
              }
            }}
            onClick={handlePointClick}
            style={{ 
              width: '100%', 
              height: '100%', 
              minHeight: layoutMode === 'vertical' ? '600px' : '800px' 
            }}
            useResizeHandler={true}
            revision={Date.now()} // Force Plotly to re-render
          />
        </div>
      </Box>
    </Paper>
  );
};

export default MultiPanelChart;