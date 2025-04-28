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

const ReservationModal = ({
  open,
  onClose,
  onSubmit,
  maxVolume = 0,
  defaultVolume = '',
  loading = false,
  error = '',
  mode: initialMode = 'full', // 'full' or 'partial'
}) => {
  const [mode, setMode] = useState(initialMode);
  const [volume, setVolume] = useState(defaultVolume);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setVolume(defaultVolume);
    setLocalError('');
  }, [open, initialMode, defaultVolume]);

  const handleModeChange = (event, newMode) => {
    if (newMode) {
      setMode(newMode);
      if (newMode === 'full') setVolume(maxVolume);
      else setVolume('');
      setLocalError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let vol = mode === 'full' ? maxVolume : Number(volume);
    if (mode === 'partial') {
      if (!volume || isNaN(volume) || vol <= 0 || vol > maxVolume) {
        setLocalError(`Enter a valid volume (0 < volume ≤ ${maxVolume})`);
        return;
      }
    }
    setLocalError('');
    onSubmit && onSubmit({ volume: vol, mode });
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
            <ToggleButton value="full" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Full ({maxVolume} cu ft)</ToggleButton>
            <ToggleButton value="partial" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Partial</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label="Volume (sq ft)"
            type="number"
            fullWidth
            variant="outlined"
            value={mode === 'full' ? maxVolume : volume}
            onChange={e => setVolume(e.target.value)}
            disabled={mode === 'full' || loading}
            inputProps={{ min: 0.1, max: maxVolume, step: 0.1 }}
            style={{ marginBottom: 12, background: 'white', borderRadius: 6 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Max available: {maxVolume} cu ft
          </div>
          {(localError || error) && <Alert severity="error" style={{ marginBottom: 8 }}>{localError || error}</Alert>}
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