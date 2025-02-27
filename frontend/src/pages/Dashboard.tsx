import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import FilterPanel from '../components/FilterPanel';
import ChatBox from '../components/ChatBox';
import CarTable from '../components/CarTable';
import MultiPanelChart from '../components/MultiPanelChart';
import { useFilters } from '../context/FilterContext';
import { useCarData } from '../hooks/useCarData';

const Dashboard: React.FC = () => {
  const [componentLoaded, setComponentLoaded] = useState(false);
  const { filters } = useFilters();
  
  // Delay component rendering to ensure all resources are loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setComponentLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const {
    cars,
    chartData,
    loading,
    error,
    totalCount,
    page,
    rowsPerPage,
    highlightedCarId,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearch,
    handleHighlightCar,
  } = useCarData();

  // Show loading indicator while components initialize
  if (!componentLoaded) {
    return (
      <Container maxWidth="xl" sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          KVD Auction Explorer
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Explore used car auction data to make better buying and selling decisions
        </Typography>
      </Paper>

      {/* Error message if needed */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Filters Column */}
        <Grid item xs={12} md={3}>
          <FilterPanel />
        </Grid>

        {/* Main content */}
        <Grid item xs={12} md={9}>
          {/* Chart */}
          <MultiPanelChart
            data={chartData || []}
            loading={loading}
            filters={filters}
            onPointClick={handleHighlightCar}
            highlightedCarId={highlightedCarId}
          />

          {/* Data Table */}
          <Box sx={{ mt: 3 }}>
            <CarTable
              cars={cars || []}
              totalCount={totalCount}
              loading={loading}
              page={page}
              rowsPerPage={rowsPerPage}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
              onHighlightCar={handleHighlightCar}
              onSearch={handleSearch}
              highlightedCarId={highlightedCarId}
            />
          </Box>
        </Grid>
      </Grid>

      {/* Chat Box */}
      <ChatBox />
    </Container>
  );
};

export default Dashboard;