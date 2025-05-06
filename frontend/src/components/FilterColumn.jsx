import React from 'react';
import { Box, Typography, Slider, TextField, Button } from '@mui/material';

const FilterColumn = ({ filters, onFilterChange, onReset }) => {
  const handleSliderChange = (key) => (event, newValue) => {
    if (key === 'price') {
      onFilterChange('minCost', newValue[0]);
      onFilterChange('maxCost', newValue[1]);
    } else if (key === 'size') {
      onFilterChange('minSize', newValue[0]);
      onFilterChange('maxSize', newValue[1]);
    } else if (key === 'distance') {
      onFilterChange('maxDistance', newValue);
    }
  };

  const handleInputChange = (key) => (event) => {
    onFilterChange(key, event.target.value);
  };

  const handleReset = () => {
    onFilterChange('minCost', 0);
    onFilterChange('maxCost', 100);
    onFilterChange('minSize', 0);
    onFilterChange('maxSize', 500);
    onFilterChange('minDistance', 0);
    onFilterChange('maxDistance', 50);
  };

  return (
    <Box sx={{ 
      width: '100%',
      p: 2,
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Price Range ($/month)</Typography>
        <Slider
          value={[filters.minCost || 0, filters.maxCost || 0]}
          onChange={handleSliderChange('price')}
          valueLabelDisplay="auto"
          min={0}
          max={100}
          step={1}
          sx={{
            color: '#FF6B00',
            width: '100%',
            '& .MuiSlider-thumb': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#FFF3E6',
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 1, width: '100%' }}>
          <TextField
            label="Min"
            type="number"
            value={filters.minCost ?? ''}
            onChange={handleInputChange('minCost')}
            size="small"
            fullWidth
          />
          <TextField
            label="Max"
            type="number"
            value={filters.maxCost ?? ''}
            onChange={handleInputChange('maxCost')}
            size="small"
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Size Range (sq ft)</Typography>
        <Slider
          value={[filters.minSize || 0, filters.maxSize || 0]}
          onChange={handleSliderChange('size')}
          valueLabelDisplay="auto"
          min={0}
          max={500}
          step={1}
          sx={{
            color: '#FF6B00',
            width: '100%',
            '& .MuiSlider-thumb': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#FFF3E6',
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 1, width: '100%' }}>
          <TextField
            label="Min"
            type="number"
            value={filters.minSize ?? ''}
            onChange={handleInputChange('minSize')}
            size="small"
            fullWidth
          />
          <TextField
            label="Max"
            type="number"
            value={filters.maxSize ?? ''}
            onChange={handleInputChange('maxSize')}
            size="small"
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Distance from Campus (miles)</Typography>
        <Slider
          value={filters.maxDistance || 0}
          onChange={handleSliderChange('distance')}
          valueLabelDisplay="auto"
          min={0}
          max={50}
          step={0.1}
          sx={{
            color: '#FF6B00',
            width: '100%',
            '& .MuiSlider-thumb': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#FFF3E6',
            },
          }}
        />
        <Box sx={{ mt: 1, width: '100%' }}>
          <TextField
            label="Max Distance"
            type="number"
            value={filters.maxDistance ?? ''}
            onChange={handleInputChange('maxDistance')}
            size="small"
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Minimum Lender Rating</Typography>
        <Slider
          value={filters.minRating || 1}
          onChange={(_, newValue) => onFilterChange('minRating', newValue)}
          valueLabelDisplay="auto"
          min={1}
          max={5}
          step={1}
          marks={[{value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'},{value:4,label:'4'},{value:5,label:'5'}]}
          sx={{
            color: '#FF6B00',
            width: '100%',
            '& .MuiSlider-thumb': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-track': {
              backgroundColor: '#FF6B00',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#FFF3E6',
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          {[1,2,3,4,5].map(star => (
            <span key={star} style={{ color: (filters.minRating || 1) >= star ? '#fbc02d' : '#ccc', fontSize: 22 }}>★</span>
          ))}
          <span style={{ marginLeft: 8 }}>{filters.minRating || 1} star{(filters.minRating || 1) > 1 ? 's' : ''} & up</span>
        </Box>
      </Box>

      <Button 
        variant="outlined" 
        onClick={handleReset}
        fullWidth
        sx={{
          borderColor: '#FF6B00',
          color: '#FF6B00',
          width: '100%',
          '&:hover': {
            borderColor: '#FF6B00',
            backgroundColor: '#FFF3E6'
          }
        }}
      >
        Reset Filters
      </Button>
    </Box>
  );
};

export default FilterColumn; 