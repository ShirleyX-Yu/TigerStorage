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
    onFilterChange('maxCost', 200);
    onFilterChange('minSize', 0);
    onFilterChange('maxSize', 1000);
    onFilterChange('minDistance', 0);
    onFilterChange('maxDistance', 50);
    onFilterChange('minRating', 1);
  };

  // If filters are undefined, set default values to max
  const defaultFilters = {
    minCost: 200,
    maxCost: 200,
    minSize: 0,
    maxSize: 1000,
    maxDistance: 50,
    minRating: 1,
    includeUnrated: false,
  };
  const mergedFilters = { ...defaultFilters, ...filters };

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
          value={[mergedFilters.minCost, mergedFilters.maxCost]}
          onChange={handleSliderChange('price')}
          valueLabelDisplay="auto"
          min={0}
          max={200}
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
            value={mergedFilters.minCost}
            onChange={handleInputChange('minCost')}
            size="small"
            fullWidth
          />
          <TextField
            label="Max"
            type="number"
            value={mergedFilters.maxCost}
            onChange={handleInputChange('maxCost')}
            size="small"
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Size Range (sq ft)</Typography>
        <Slider
          value={[mergedFilters.minSize, mergedFilters.maxSize]}
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
            value={mergedFilters.minSize}
            onChange={handleInputChange('minSize')}
            size="small"
            fullWidth
          />
          <TextField
            label="Max"
            type="number"
            value={mergedFilters.maxSize}
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
            type="text"
            value={filters.maxDistance === 50 ? '50+' : (filters.maxDistance ?? '')}
            onChange={e => {
              let val = e.target.value;
              if (val === '50+') val = 50;
              else if (val === '') val = '';
              else val = Number(val);
              onFilterChange('maxDistance', val);
            }}
            size="small"
            fullWidth
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Minimum Lender Rating</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, mt: 1 }}>
          <Box>
            <span
              key={0}
              onClick={() => onFilterChange('minRating', 0)}
              style={{
                color: (filters.minRating || 0) === 0 ? '#fbc02d' : '#ccc',
                fontSize: 28,
                cursor: 'pointer',
                transition: 'color 0.15s',
                userSelect: 'none',
                marginRight: 4
              }}
              role="button"
              aria-label="Set minimum rating to 0 stars"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onFilterChange('minRating', 0); }}
            >☆</span>
            {[1,2,3,4,5].map(star => (
              <span
                key={star}
                onClick={() => onFilterChange('minRating', star)}
                style={{
                  color: (filters.minRating || 0) >= star ? '#fbc02d' : '#ccc',
                  fontSize: 28,
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  userSelect: 'none'
                }}
                role="button"
                aria-label={`Set minimum rating to ${star} star${star > 1 ? 's' : ''}`}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onFilterChange('minRating', star); }}
              >★</span>
            ))}
          </Box>
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