import React, { useState, useEffect, useRef, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Paper, Typography, CircularProgress, useTheme } from '@mui/material';
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
    
    // Go through all cars and put them in the right year bucket
    data.forEach(yearData => {
      yearData.data.forEach(car => {
        // Skip cars that don't meet basic criteria
        if (!car || !car.brand || car.year === undefined || car.year === null) {
          return;
        }
        
        // Skip cars that don't match selected brands and years
        if (!filters.selectedBrands.includes(car.brand) || !filters.selectedYears.includes(car.year)) {
          return;
        }
        
        // Handle possible null values for price and mileage
        const price = car.price !== null && car.price !== undefined ? car.price : 0;
        const mileage = car.mileage !== null && car.mileage !== undefined ? car.mileage : 0;
        
        // Skip cars outside price/mileage range
        if (price < filters.priceRange[0] || price > filters.priceRange[1] ||
            mileage < filters.mileageRange[0] || mileage > filters.mileageRange[1]) {
          return;
        }
        
        // Add the car to its year bucket
        if (yearDataMap[car.year]) {
          yearDataMap[car.year].data.push(car);
        }
      });
    });
    
    // Convert to array and sort by year (descending)
    const filtered = Object.values(yearDataMap)
      // Keep all years, even empty ones
      .sort((a, b) => b.year - a.year);  // Sort by year descending
      
    console.log("Years with data:", 
      filtered.map(y => `${y.year}: ${y.data.length} cars`).join(", "));
    
    setFilteredData(filtered);
  }, [data, filters]);

  // Dynamically adjust chart height based on number of panels
  useEffect(() => {
    console.log('Filtered data changed:', filteredData);
    if (filteredData.length > 0) {
      console.log('Setting chart height for', filteredData.length, 'panels');
      // 350px per panel, minimum 400px
      setChartHeight(Math.max(400, filteredData.length * 350));
      setPlotRendered(true);
    } else {
      console.log('No filtered data, setting plotRendered to false');
      setPlotRendered(false);
    }
  }, [filteredData]);
  
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
        
        // Extract mileage and price data, handling nulls
        const xValues = cars.map(car => car.mileage === null || car.mileage === undefined ? 0 : car.mileage);
        const yValues = cars.map(car => car.price === null || car.price === undefined ? 0 : car.price);
        
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
          marker: {
            color: colors[entity],
            size: 10,
            opacity: 0.7,
            line: {
              color: 'white',
              width: 1
            }
          },
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
            const validX = validDataPoints.map(car => car.mileage as number);
            const validY = validDataPoints.map(car => car.price as number);
            
            // Calculate trendline with simple linear regression
            // y = mx + b
            const n = validX.length;
            const sumX = validX.reduce((a, b) => a + b, 0);
            const sumY = validY.reduce((a, b) => a + b, 0);
            const sumXY = validX.reduce((a, b, i) => a + b * validY[i], 0);
            const sumXX = validX.reduce((a, b) => a + b * b, 0);
            
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
                dash: 'dash'
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
              x: [highlightedCar.mileage === null || highlightedCar.mileage === undefined ? 0 : highlightedCar.mileage],
              y: [highlightedCar.price === null || highlightedCar.price === undefined ? 0 : highlightedCar.price],
              customdata: [highlightedCar.id],
              mode: 'markers',
              marker: {
                color: colorBy === 'model' ? colors[highlightedCar.model] : colors[highlightedCar.brand],
                size: 15,
                opacity: 1,
                line: {
                  color: 'black',
                  width: 2
                }
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
    // Basic layout - only build this when filtered data changes
    const layout: any = {
      grid: {
        rows: filteredData.length,
        columns: 1,
        pattern: 'independent',
        roworder: 'top to bottom',
        ygap: 0.2,
        xgap: 0.1,
        subplots: filteredData.map((_, i) => `x${i+1}y${i+1}`)
      },
      height: chartHeight,
      showlegend: true,
      autosize: true,
      responsive: true,
      legend: {
        traceorder: 'normal',
        orientation: colorEntities.length > 6 ? 'v' : 'h', // Vertical legend if many models
        y: colorEntities.length > 6 ? 1.0 : 1.1,
        x: colorEntities.length > 6 ? 1.02 : 0.5,
        xanchor: colorEntities.length > 6 ? 'left' : 'center',
        yanchor: 'top',
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: '#ccc',
        borderwidth: 1,
        font: {
          size: 12
        }
      },
      hoverlabel: {
        bgcolor: '#FFF',
        font: {
          size: 12,
          color: '#000'
        },
        bordercolor: '#DDD',
        align: 'left'
      },
      margin: {
        l: 60,
        r: 20,
        t: 80,
        b: 60
      },
      hovermode: 'closest',
      // The xaxis properties will be added for each subplot
      // Main title
      title: {
        text: 'KVD Auctions: Price vs Mileage by Year',
        font: {
          size: 18,
          color: '#333'
        }
      },
      // Ensure plot stays visible
      datarevision: Date.now() // This forces a re-render
    };
    
    return layout;
  }, [filteredData.length, chartHeight, colorEntities.length]);
    
  // Add subplots for each year - separate function to avoid mixing with useMemo
  const completeLayout = () => {
    // Start with the base layout
    const layout = {...getLayout};
    
    // Calculate domain values for each panel
    const panelHeight = 1.0 / filteredData.length;
    const padding = 0.05; // 5% padding between panels
    
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
    
    // Ensure we have reasonable minimum values for scales
    globalMaxMileage = Math.max(globalMaxMileage, 5000);
    globalMaxPrice = Math.max(globalMaxPrice, 100000);
    
    console.log(`Global max values for consistent scaling - Mileage: ${globalMaxMileage}, Price: ${globalMaxPrice}`);
    
    // Add subplots for each year
    filteredData.forEach((yearData, i) => {
      const axisNum = i + 1;
      
      // Calculate the domain for this panel
      const panelBottom = 1.0 - (i + 1) * panelHeight + (padding / 2);
      const panelTop = 1.0 - i * panelHeight - (padding / 2);
      
      console.log(`Panel ${axisNum} (${yearData.year}): domain = [${panelBottom}, ${panelTop}]`);
      
      // Add x-axis for each subplot with consistent range
      layout[`xaxis${axisNum}`] = {
        title: {
          text: 'Mileage (mil)',
          font: {
            size: 12
          }
        },
        range: [0, globalMaxMileage], // Set consistent range
        rangemode: 'nonnegative',
        tickfont: {
          size: 10
        },
        showticklabels: true,
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: '#ddd',
        gridcolor: '#f5f5f5',
        fixedrange: false // Allow zooming
      };
      
      // Add y-axis for each subplot with clear year label and consistent range
      layout[`yaxis${axisNum}`] = {
        title: {
          text: `${yearData.year} - Price (SEK)`,
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        range: [0, globalMaxPrice], // Set consistent range
        rangemode: 'nonnegative',
        tickfont: {
          size: 10
        },
        domain: [panelBottom, panelTop],
        showticklabels: true,
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: '#ddd',
        gridcolor: '#f5f5f5',
        fixedrange: false // Allow zooming
      };
      
      // Add annotation for each panel to clearly show the year
      layout.annotations = layout.annotations || [];
      layout.annotations.push({
        text: `${yearData.year}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        showarrow: false,
        x: 0.02, // Position at left side
        y: (panelBottom + panelTop) / 2,
        xref: 'paper',
        yref: 'paper',
        xanchor: 'left',
        yanchor: 'middle'
      });
      
      // Add "No data available" annotation if this year has no data
      if (yearData.data.length === 0) {
        layout.annotations.push({
          text: 'No Data Available',
          font: {
            size: 14,
            color: '#888'
          },
          showarrow: false,
          x: 0.5, // Center of panel
          y: (panelBottom + panelTop) / 2,
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
  const hasFilteredData = filteredData && filteredData.length > 0 && filteredData.some(d => d.data && d.data.length > 0);
  
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
        <Typography variant="h6">
          {brandName ? 
            `${brandName} Models: Price vs. Mileage by Year` : 
            `KVD Auctions: Price vs. Mileage by Year`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {brandName ? 
            `Showing ${colorEntities.length} different models for ${brandName}. Each color represents a different model.` : 
            `Each panel represents a different model year. Colors indicate different brands.`}
          {" Dashed lines show price trends. Hover over points for details."}
        </Typography>
      </Box>
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <div ref={plotRef} style={{ width: '100%', minHeight: '500px' }}>
          {/* Always render the Plot component, regardless of plotRendered state */}
          <Plot
            data={getPlotData()}
            layout={completeLayout()}
            config={{
              responsive: true,
              displayModeBar: true,
              modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'select2d'],
              displaylogo: false
            }}
            onClick={handlePointClick}
            style={{ width: '100%', height: '100%', minHeight: '500px' }}
            useResizeHandler={true}
            revision={Date.now()} // Force Plotly to re-render
          />
        </div>
      </Box>
    </Paper>
  );
};

export default MultiPanelChart;