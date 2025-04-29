import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

const PRINCETON_HALLS = [
  'Bloomberg Hall', 'Butler College', 'First College', 'Forbes College', 'Mathey College',
  'Rockefeller College', 'Whitman College', 'Wilson College', 'Yeh College', 'New College West',
  '1901 Hall', '1915 Hall', '1937 Hall', '1967 Hall', '1976 Hall', '1981 Hall', '1985 Hall',
  'Brown Hall', 'Cuyler Hall', 'Dodge-Osborn Hall', 'Edwards Hall', 'Foulke Hall', 'Gauss Hall',
  'Hargadon Hall', 'Holder Hall', 'Little Hall', 'Lockhart Hall', 'Scully Hall', 'Spelman Hall',
  'Witherspoon Hall', 'Lauritzen Hall', 'Mannion Hall', 'Murley-Pivirotto Hall', 'Robinson Hall',
  'Scheide Caldwell House', 'Walker Hall', 'Wright Hall', 'Stanhope Hall', 'Pyne Hall', 'Clapp Hall',
  'Hamilton Hall', 'Hibben-Magie', 'Lawrence Apartments', 'Graduate College', 'Old Graduate College',
  'New Graduate College', 'New South', 'Alexander Hall', 'Dillon Court East', 'Dillon Court West',
  'Elm Hall', 'Maple Hall', 'Oak Hall', 'Spruce Hall', 'Tiger Inn', 'Cannon Club', 'Cottage Club',
  'Quadrangle Club', 'Tower Club', 'Colonial Club', 'Charter Club', 'Cloister Inn', 'Ivy Club',
  'Cap & Gown Club', 'Princeton Inn', 'Princeton Tower Club', 'Princeton Terrace Club', 'Princeton Charter Club'
];

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    minHeight: '100px',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: '4px',
  },
  uploading: {
    color: '#666',
    marginTop: '0.5rem',
  },
  submitButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 500,
    width: '100%',
  },
  addressInputContainer: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  addressInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  geocodeButton: {
    padding: '10px 15px',
    backgroundColor: '#FF8F00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 'bold',
  },
  geocodingStatus: {
    marginTop: '5px',
    fontSize: '0.875rem',
  },
  coordinatesContainer: {
    display: 'flex',
    gap: '15px',
  },
  radioContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '0.5rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  radioInput: {
    marginRight: '8px',
    cursor: 'pointer',
  },
  imagePreview: {
    width: '120px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '6px',
    marginTop: '8px',
  },
};

const CreateListing = ({ onClose, onSuccess, modalMode = false }) => {
  const navigate = useNavigate();
  const errorRef = useRef(null);
  const [formData, setFormData] = useState({
    location: '',
    address: '',
    cost: '',
    cubicFeet: '',
    description: '',
    latitude: '',
    longitude: '',
    start_date: '',
    end_date: '',
    image_url: ''
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState('');
  const [locationType, setLocationType] = useState('on-campus');
  const [showAddressConfirm, setShowAddressConfirm] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const handleInputChange = (e) => {
    setError('');
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    setError('');
    setTempAddress(e.target.value);
  };

  const handleLocationTypeChange = (e) => {
    setError('');
    setLocationType(e.target.value);
    setTempAddress('');
    setGeocodingStatus('');
  };

  const geocodeAddress = async (addressOverride) => {
    const addressToGeocode = addressOverride || tempAddress;
    if (!addressToGeocode.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }
    setGeocodingStatus('Looking up coordinates...');
    try {
      const searchAddress =
        locationType === 'on-campus'
          ? `${addressToGeocode}, Princeton, NJ 08544`
          : addressToGeocode;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
      );
      if (!response.ok) throw new Error('Failed to fetch coordinates');
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setPendingAddress({
          address: display_name,
          latitude: lat,
          longitude: lon
        });
        setShowAddressConfirm(true);
        setGeocodingStatus('');
      } else {
        setGeocodingStatus('Address not found. Try being more specific.');
      }
    } catch {
      setGeocodingStatus('Error looking up address. Please try again.');
    }
  };

  const handleConfirmAddress = () => {
    if (pendingAddress) {
      setFormData(prev => ({
        ...prev,
        address: pendingAddress.address,
        latitude: pendingAddress.latitude,
        longitude: pendingAddress.longitude
      }));
    }
    setShowAddressConfirm(false);
    setPendingAddress(null);
  };

  const handleEditAddress = () => {
    setShowAddressConfirm(false);
    setPendingAddress(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('Image file size must be less than 5MB.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setFormData(prev => ({ ...prev, image_url: result.url }));
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.image_url) {
      setError('Please upload an image of your storage space.');
      return;
    }
    if (formData.location.length > 100) {
      setError('Title must be 100 characters or less.');
      return;
    }
    if (formData.description.length > 1000) {
      setError('Description must be 1000 characters or less.');
      return;
    }
    if (Number(formData.cost) < 0 || Number(formData.cost) > 10000) {
      setError('Cost must be between $0 and $10,000.');
      return;
    }
    if (Number(formData.cubicFeet) <= 0 || Number(formData.cubicFeet) > 10000) {
      setError('Square feet must be between 1 and 10,000.');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setError('Start and end dates are required.');
      return;
    }
    if (formData.end_date <= formData.start_date) {
      setError('End date must be after start date.');
      return;
    }
    if (!formData.location || !formData.cost || !formData.cubicFeet) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create listing');
      }
      const data = await res.json();
      onSuccess ? onSuccess() : navigate(`/listing/${data.listing_id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper to check if address is a valid street address
  const isValidStreetAddress = (address) => {
    if (!address) return false;
    // Check for a number followed by a street name, or 'Princeton, NJ' for campus
    // This is a simple heuristic; you can improve it as needed
    return /\d+\s+\w+/.test(address) || /Princeton,?\s*NJ/i.test(address);
  };

  return (
    <div style={styles.container}>
      {error && <div ref={errorRef} style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ ...styles.form, gap: 18, padding: 24, width: '100%' }}>
        <div>
            <label style={styles.label}>Location (Title) <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                maxLength={100}
              />
            </div>
            <div>
              <label style={styles.label}>Location Type <span style={{color: '#b00020'}}>*</span></label>
              <select
                style={styles.input}
                value={locationType}
                onChange={handleLocationTypeChange}
                required
              >
                <option value="on-campus">On Campus</option>
                <option value="off-campus">Off Campus</option>
              </select>
            </div>
            <div>
              {locationType === 'on-campus' ? (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Residential Hall <span style={{color: '#b00020'}}>*</span></label>
                  <select
                    style={styles.input}
                    value={tempAddress}
                    onChange={e => {
                      setTempAddress(e.target.value);
                      // Auto-geocode on selection
                      if (e.target.value) {
                        geocodeAddress(e.target.value);
                      }
                    }}
                    required
                  >
                    <option value="">Select a hall...</option>
                    {PRINCETON_HALLS.map(hall => (
                      <option key={hall} value={hall}>{hall}</option>
                    ))}
                  </select>
                  {geocodingStatus && <div style={styles.geocodingStatus || styles.status}>{geocodingStatus}</div>}
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Address <span style={{color: '#b00020'}}>*</span></label>
                  <div style={styles.addressInputContainer}>
                    <input
                      style={styles.input}
                      type="text"
                      value={tempAddress}
                      onChange={handleAddressChange}
                      placeholder="Enter full address"
                      required
                      list="address-autocomplete"
                    />
                    <datalist id="address-autocomplete">
                      {/* Optionally, you can fill this with suggestions from Nominatim if you implement autocomplete */}
                    </datalist>
                    <button
                      type="button"
                      style={styles.geocodeButton || styles.smallButton}
                      onClick={() => geocodeAddress()}
                    >
                      Lookup
                    </button>
                  </div>
                  {geocodingStatus && <div style={styles.geocodingStatus || styles.status}>{geocodingStatus}</div>}
                </div>
              )}
            </div>
            <div>
              <label style={styles.label}>Cost per Month ($) <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                required
                min={0}
                max={10000}
              />
            </div>
            <div>
              <label style={styles.label}>Square Feet <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="number"
                name="cubicFeet"
                value={formData.cubicFeet}
                onChange={handleInputChange}
                required
                min={1}
                max={10000}
              />
            </div>
            <div>
              <label style={styles.label}>Description <span style={{color: '#b00020'}}>*</span></label>
              <textarea
                style={styles.textarea}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your storage space..."
                required
                maxLength={1000}
              />
            </div>
            <div>
              <label style={styles.label}>Start Date <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label style={styles.label}>End Date <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Image <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                required
              />
              {formData.image_url && (
                <img
                  src={formData.image_url.startsWith('/uploads/')
                    ? `${import.meta.env.VITE_API_URL}${formData.image_url}`
                    : formData.image_url}
                  alt="Preview"
                  style={styles.imagePreview}
                />
              )}
            </div>
            <button type="submit" style={styles.submitButton} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Create Listing'}
            </button>
        </form>
      </div>
      {/* Address Confirmation Modal */}
      <Dialog open={showAddressConfirm} onClose={handleEditAddress} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Address</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 16 }}>
            Please confirm the address for your listing:
          </div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#333', marginBottom: 8 }}>
            {pendingAddress?.address}
          </div>
          {!isValidStreetAddress(pendingAddress?.address) && (
            <div style={{ color: '#c62828', marginTop: 8, fontWeight: 500 }}>
              Warning: This does not appear to be a full street address. Please select or enter a more specific address.
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditAddress} color="secondary">Edit</Button>
          <Button onClick={handleConfirmAddress} color="primary" variant="contained" disabled={!isValidStreetAddress(pendingAddress?.address)}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
export default CreateListing;
