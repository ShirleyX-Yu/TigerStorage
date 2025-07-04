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
    let value = event.target.value;
    // Remove leading zeros (except for '0')
    if (typeof value === 'string' && value.length > 1 && value[0] === '0' && value[1] !== '.') {
      value = value.replace(/^0+/, '');
    }
    // Convert to number (if empty, treat as 0)
    value = value === '' ? 0 : Number(value);
    // Clamp to allowed ranges
    if (key === 'minCost') {
      value = Math.max(0, Math.min(200, value));
      if (value > filters.maxCost) {
        onFilterChange('minCost', value);
        onFilterChange('maxCost', value);
        return;
      }
    }
    if (key === 'maxCost') {
      value = Math.max(0, Math.min(200, value));
      if (value < filters.minCost) value = filters.minCost;
    }
    if (key === 'minSize') {
      value = Math.max(0, Math.min(1000, value));
      if (value > filters.maxSize) {
        onFilterChange('minSize', value);
        onFilterChange('maxSize', value);
        return;
      }
    }
    if (key === 'maxSize') {
      value = Math.max(0, Math.min(1000, value));
      if (value < filters.minSize) value = filters.minSize;
    }
    onFilterChange(key, value);
  };

  const handleReset = () => {
    onFilterChange('minCost', 0);
    onFilterChange('maxCost', 200);
    onFilterChange('minSize', 0);
    onFilterChange('maxSize', 1000);
    onFilterChange('minDistance', 0);
    onFilterChange('maxDistance', 50);
    onFilterChange('minRating', 0);
  };

  // If filters are undefined, set default values to max
  const defaultFilters = {
    minCost: 200,
    maxCost: 200,
    minSize: 0,
    maxSize: 1000,
    maxDistance: 50,
    minRating: 0,
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
            inputProps={{ min: 0, max: 200 }}
          />
          <TextField
            label="Max"
            type="number"
            value={mergedFilters.maxCost}
            onChange={handleInputChange('maxCost')}
            size="small"
            fullWidth
            inputProps={{ min: 0, max: 200 }}
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
            inputProps={{ min: 0, max: 1000 }}
          />
          <TextField
            label="Max"
            type="number"
            value={mergedFilters.maxSize}
            onChange={handleInputChange('maxSize')}
            size="small"
            fullWidth
            inputProps={{ min: 0, max: 1000 }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Distance from Campus (miles)</Typography>
        <Slider
          value={
            filters.maxDistance === ''
              ? 0
              : (filters.maxDistance === '50+' ? 50 : (Number(filters.maxDistance) >= 50 ? 50 : Number(filters.maxDistance) || 0))
          }
          onChange={(_, newValue) => {
            let val = Array.isArray(newValue) ? newValue[0] : newValue;
            if (val >= 50) val = 50;
            if (val < 0) val = 0;
            onFilterChange('maxDistance', val);
          }}
          valueLabelDisplay="auto"
          min={0}
          max={50}
          step={0.1}
          marks={[{ value: 0, label: '0' }, { value: 50, label: '50+' }]}
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
            value={
              filters.maxDistance === '' ? '' : (Number(filters.maxDistance) >= 50 ? '50+' : filters.maxDistance)
            }
            onChange={e => {
              let val = e.target.value;
              if (val === '' || val === undefined) {
                onFilterChange('maxDistance', '');
                return;
              }
              if (val === '50+') {
                onFilterChange('maxDistance', 50);
                return;
              }
              val = Number(val);
              if (isNaN(val) || val < 0) val = 0;
              if (val >= 50) val = 50;
              onFilterChange('maxDistance', val);
            }}
            size="small"
            fullWidth
            inputProps={{ min: 0, max: 50 }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 3, width: '100%' }}>
        <Typography gutterBottom>Minimum Lender Rating</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, mt: 1 }}>
          <Box>
            {[1,2,3,4,5].map(star => (
              <span
                key={star}
                onClick={() => onFilterChange('minRating', (filters.minRating || 0) === star ? 0 : star)}
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
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onFilterChange('minRating', (filters.minRating || 0) === star ? 0 : star); }}
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