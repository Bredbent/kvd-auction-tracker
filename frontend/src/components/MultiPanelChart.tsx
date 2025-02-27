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

    // Apply filters
    const filtered = data
      .filter(yearData => filters.selectedYears.includes(yearData.year))
      .map(yearData => {
        return {
          ...yearData,
          data: yearData.data.filter(car => {
            // First ensure the car and its required properties exist
            if (!car || !car.brand || car.year === undefined || car.year === null) {
              return false;
            }
            
            // Handle possible null values for price and mileage
            const price = car.price !== null && car.price !== undefined ? car.price : 0;
            const mileage = car.mileage !== null && car.mileage !== undefined ? car.mileage : 0;
            
            return filters.selectedBrands.includes(car.brand) &&
              price >= filters.priceRange[0] &&
              price <= filters.priceRange[1] &&
              mileage >= filters.mileageRange[0] &&
              mileage <= filters.mileageRange[1];
          })
        };
      });

    setFilteredData(filtered);
  }, [data, filters]);

  // Dynamically adjust chart height based on number of panels
  useEffect(() => {
    console.log('Filtered data changed:', filteredData);
    if (filteredData.length > 0) {
      console.log('Setting chart height for', filteredData.length, 'panels');
      setChartHeight(Math.max(400, filteredData.length * 300));
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

  // Assign colors to brands
  const getBrandData = () => {
    const allBrands = new Set<string>();
    
    // Collect all unique brands
    filteredData.forEach(yearData => {
      yearData.data.forEach(car => {
        allBrands.add(car.brand);
      });
    });
    
    // Assign colors
    Array.from(allBrands).forEach((brand, index) => {
      brandColors[brand] = colorPalette[index % colorPalette.length];
    });
    
    return { brandColors, allBrands };
  };

  const { brandColors: colors, allBrands } = getBrandData();

  // Format data for Plotly - Calculate trendlines for each brand
  const getPlotData = () => {
    // Group data by year
    const plotlyData: any[] = [];
    
    // Create a separate trace for each brand in each year panel
    filteredData.forEach(yearData => {
      const brandGroups: { [key: string]: Car[] } = {};
      
      // Group cars by brand
      yearData.data.forEach(car => {
        if (!brandGroups[car.brand]) {
          brandGroups[car.brand] = [];
        }
        brandGroups[car.brand].push(car);
      });
      
      // Create a trace for each brand
      Object.entries(brandGroups).forEach(([brand, cars]) => {
        // Skip if there aren't enough data points for a meaningful scatter plot
        if (cars.length < 2) return;
        
        // Extract mileage and price data, handling nulls
        const xValues = cars.map(car => car.mileage === null || car.mileage === undefined ? 0 : car.mileage);
        const yValues = cars.map(car => car.price === null || car.price === undefined ? 0 : car.price);
        
        // Create the scatter trace
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
            color: colors[brand],
            size: 10,
            opacity: 0.7,
            line: {
              color: 'white',
              width: 1
            }
          },
          type: 'scatter',
          name: brand,
          legendgroup: brand,
          xaxis: `x`,
          yaxis: `y${yearData.year - filteredData[0].year + 1}`,
          showlegend: yearData.year === filteredData[0].year,
          hovertemplate: '%{text}<extra></extra>'
        };
        
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
              name: `${brand} trendline`,
              line: {
                color: colors[brand],
                width: 2,
                dash: 'dash'
              },
              legendgroup: brand,
              xaxis: `x`,
              yaxis: `y${yearData.year - filteredData[0].year + 1}`,
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
                color: colors[brand],
                size: 15,
                opacity: 1,
                line: {
                  color: 'black',
                  width: 2
                }
              },
              type: 'scatter',
              name: `Highlighted: ${highlightedCar.brand} ${highlightedCar.model}`,
              legendgroup: brand,
              xaxis: `x`,
              yaxis: `y${yearData.year - filteredData[0].year + 1}`,
              showlegend: false,
              hoverinfo: 'skip'
            };
            
            plotlyData.push(highlightTrace);
          }
        }
      });
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
        roworder: 'top to bottom'
      },
      height: chartHeight,
      showlegend: true,
      autosize: true,
      responsive: true,
      legend: {
        traceorder: 'normal',
        orientation: 'h',
        y: 1.1,
        x: 0.5,
        xanchor: 'center'
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
      xaxis: {
        title: {
          text: 'Mileage (mil)',
          font: {
            size: 14
          }
        },
        rangemode: 'tozero',
        tickfont: {
          size: 12
        },
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: '#ddd',
        gridcolor: '#f5f5f5'
      },
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
  }, [filteredData.length, chartHeight]);
    
  // Add subplots for each year - separate function to avoid mixing with useMemo
  const completeLayout = () => {
    // Start with the base layout
    const layout = {...getLayout};
    
    // Add subplots for each year
    filteredData.forEach((yearData, i) => {
      const axisNum = i + 1;
      layout[`yaxis${axisNum === 1 ? '' : axisNum}`] = {
        title: {
          text: axisNum === 1 ? `Price (SEK) - ${yearData.year}` : `${yearData.year}`,
          font: {
            size: 14
          }
        },
        rangemode: 'tozero',
        tickfont: {
          size: 12
        },
        domain: [(filteredData.length - i - 1) / filteredData.length, (filteredData.length - i) / filteredData.length],
        zeroline: true,
        zerolinewidth: 1,
        zerolinecolor: '#ddd',
        gridcolor: '#f5f5f5'
      };
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
        <Typography variant="h6">KVD Auctions: Price vs. Mileage by Year</Typography>
        <Typography variant="body2" color="text.secondary">
          Each panel represents a different model year. Dashed lines show price trends. Hover over points for details.
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