import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import { axiosInstance } from '../utils/auth';

const ReservationModal = ({
  open,
  onClose,
  onSubmit,
  maxSpace = 0,
  defaultSpace = '',
  loading = false,
  error = '',
  mode: initialMode = 'full', // 'full' or 'partial'
}) => {
  const [mode, setMode] = useState(initialMode);
  const [space, setSpace] = useState(defaultSpace);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setSpace(defaultSpace);
    setLocalError('');
  }, [open, initialMode, defaultSpace]);

  const handleModeChange = (event, newMode) => {
    if (newMode) {
      setMode(newMode);
      if (newMode === 'full') setSpace(maxSpace);
      else setSpace('');
      setLocalError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let sp = mode === 'full' ? maxSpace : Number(space);
    if (mode === 'partial') {
      if (!space || isNaN(space) || sp <= 0 || sp > maxSpace) {
        setLocalError(`Please enter a valid storage space between 1 and ${maxSpace} sq ft.`);
        return;
      }
    }
    setLocalError('');
    onSubmit({ space: sp, mode });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{ style: { boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 16, background: '#fff8f1' } }}
      BackdropProps={{ style: { backgroundColor: 'transparent' } }}
    >
      <DialogTitle style={{ background: '#FF6B00', color: 'white', fontWeight: 700, letterSpacing: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 24px' }}>Reserve Space</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent style={{ padding: 24, background: '#fff8f1' }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            style={{ marginBottom: 16 }}
            fullWidth
          >
            <ToggleButton value="full" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Full ({maxSpace} sq ft)</ToggleButton>
            <ToggleButton value="partial" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Partial</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Space (sq ft)"
            type="number"
            fullWidth
            variant="outlined"
            value={mode === 'full' ? maxSpace : space}
            onChange={e => setSpace(e.target.value)}
            disabled={mode === 'full' || loading}
            inputProps={{ min: 0.1, max: maxSpace, step: 0.1 }}
            style={{ marginBottom: 12, background: 'white', borderRadius: 6 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Max available: {maxSpace} sq ft
          </div>
          {(localError || error) && <Alert severity="error" style={{ marginBottom: 8 }}>{localError || (error ? error.replace(/Error:\s*/, '') : '')}</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button onClick={onClose} disabled={loading} style={{ color: '#888', fontWeight: 600 }}>Cancel</Button>
          <Button type="submit" variant="contained" style={{ background: '#FF6B00', color: 'white', fontWeight: 700 }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReservationModal; 