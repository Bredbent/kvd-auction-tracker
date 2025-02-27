import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Car } from '../types';

type Order = 'asc' | 'desc';
type OrderByKey = keyof Car | '';

interface CarTableProps {
  cars: Car[];
  totalCount: number;
  loading: boolean;
  page: number;
  rowsPerPage: number;
  onChangePage: (newPage: number) => void;
  onChangeRowsPerPage: (rowsPerPage: number) => void;
  onHighlightCar?: (carId: number) => void;
  onSearch: (query: string) => void;
  highlightedCarId?: number | null;
}

const CarTable: React.FC<CarTableProps> = ({
  cars,
  totalCount,
  loading,
  page,
  rowsPerPage,
  onChangePage,
  onChangeRowsPerPage,
  onHighlightCar,
  onSearch,
  highlightedCarId,
}) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderByKey>('sale_date');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRequestSort = (property: OrderByKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    
    // Debounce search input
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString()} kr`;
  };

  const formatMileage = (mileage: number | null) => {
    if (mileage === null || mileage === undefined) return '-';
    return `${mileage.toLocaleString()} mil`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Sort function for table data
  const sortedCars = useMemo(() => {
    // Safe guard against undefined values
    if (!cars) {
      return [];
    }
    
    // If no sort order, just return the original array safely
    if (!orderBy) {
      return cars;
    }
    
    try {
      // Create a safe copy
      const carsCopy = [...cars];
      
      // Sort the copy
      return carsCopy.sort((a, b) => {
        // Safe check for objects
        if (!a || !b) {
          return 0;
        }
        
        // Safe property access
        const aValue = a[orderBy as keyof Car];
        const bValue = b[orderBy as keyof Car];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) {
          return order === 'asc' ? -1 : 1;
        }
        if (bValue === null || bValue === undefined) {
          return order === 'asc' ? 1 : -1;
        }
        
        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return order === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        // Numeric comparison
        if (aValue < bValue) {
          return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === 'asc' ? 1 : -1;
        }
        
        return 0;
      });
    } catch (error) {
      console.error('Error sorting cars:', error);
      return cars;
    }
  }, [cars, order, orderBy]);

  // Table header cell component
  const TableHeadCell = (props: { 
    id: OrderByKey; 
    label: string; 
    numeric?: boolean;
    disableSort?: boolean;
  }) => {
    const { id, label, numeric = false, disableSort = false } = props;

    return (
      <TableCell
        key={id}
        align={numeric ? 'right' : 'left'}
        sortDirection={orderBy === id ? order : false}
        sx={{ fontWeight: 'bold' }}
      >
        {disableSort ? (
          label
        ) : (
          <TableSortLabel
            active={orderBy === id}
            direction={orderBy === id ? order : 'asc'}
            onClick={() => handleRequestSort(id)}
          >
            {label}
          </TableSortLabel>
        )}
      </TableCell>
    );
  };

  return (
    <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Auction Results</Typography>
        <TextField
          placeholder="Search auctions..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>
      
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableHeadCell id="brand" label="Brand" />
              <TableHeadCell id="model" label="Model" />
              <TableHeadCell id="year" label="Year" numeric />
              <TableHeadCell id="price" label="Price (SEK)" numeric />
              <TableHeadCell id="mileage" label="Mileage (mil)" numeric />
              <TableHeadCell id="sale_date" label="Sale Date" />
              <TableHeadCell id="" label="Actions" disableSort />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    Loading auction data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedCars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1">
                    No auction data found matching your criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedCars.map((car) => (
                <TableRow 
                  key={car.id}
                  hover
                  onClick={() => onHighlightCar && onHighlightCar(car.id)}
                  sx={{ 
                    cursor: onHighlightCar ? 'pointer' : 'default',
                    bgcolor: highlightedCarId === car.id ? 'rgba(25, 118, 210, 0.12)' : 'inherit',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {car.brand}
                    </Typography>
                  </TableCell>
                  <TableCell>{car.model}</TableCell>
                  <TableCell align="right">{car.year || '-'}</TableCell>
                  <TableCell align="right">{formatPrice(car.price)}</TableCell>
                  <TableCell align="right">{formatMileage(car.mileage)}</TableCell>
                  <TableCell>{formatDate(car.sale_date)}</TableCell>
                  <TableCell>
                    <Tooltip title="View auction details">
                      <Chip
                        label="View"
                        size="small"
                        color="primary"
                        variant="outlined"
                        component="a"
                        href={car.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        clickable
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => onChangePage(newPage)}
        onRowsPerPageChange={(e) => onChangeRowsPerPage(parseInt(e.target.value, 10))}
      />
    </Paper>
  );
};

export default CarTable;