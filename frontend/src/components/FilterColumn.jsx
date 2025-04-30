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
    onFilterChange('maxCost', 1000);
    onFilterChange('minSize', 0);
    onFilterChange('maxSize', 1000);
    onFilterChange('maxDistance', 10);
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
          max={1000}
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
          max={1000}
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
          max={10}
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