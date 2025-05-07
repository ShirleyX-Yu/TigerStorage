import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { HALL_COORDINATES } from '../utils/hallCoordinates';
import { axiosInstance } from '../utils/auth';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PRINCETON_HALLS = [
  '1901 Hall', '1903 Hall', 'Addy Hall',
  'Blair Hall', 'Bloomberg Hall', 'Brown Hall', 'Buyers Hall', 'Campbell Hall',
  'Cuyler Hall', 'Dod Hall', 'Edwards Hall', 'Feinberg Hall', 'Feliciano Hall',
  'Fisher Hall', 'Forbes College', 'Foulke Hall', 'Graduate College (Old Graduate College)',
  'Hamilton Hall', 'Henry Hall', 'Holder Hall',
  'Joline Hall', 'Laughlin Hall', 'Lawrence Apartments',
  'Little Hall', 'Lockhart Hall', 'Madison Hall', 'New Graduate College', 'Patton Hall', 'Pyne Hall',
  'Scully Hall', 'Walker Hall', 'Witherspoon Hall', 'Wright Hall'
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
    fontFamily: 'inherit'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    minHeight: '100px',
    fontFamily: 'inherit',
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
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '10px 0',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
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
    title: '',
    hall_name: '',
    address: '',
    cost: '',
    sq_ft: '',
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
  const [addressNotFound, setAddressNotFound] = useState(false);
  const [customAddressError, setCustomAddressError] = useState('');

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

  const geocodeAddress = async (addressComponents) => {
    if (locationType === 'on-campus') {
      // For on-campus locations
      if (!tempAddress.trim()) {
        setGeocodingStatus('Please select a hall');
        setAddressNotFound(false);
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
      setAddressNotFound(false);
      try {
        // Format the address to include Princeton campus details
        const searchAddress = `${tempAddress}, Princeton University, Princeton, NJ 08544, USA`;
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
          setGeocodingStatus('✅ Location found successfully!');
          setAddressNotFound(false);
        } else {
          setGeocodingStatus('❌ Could not find this hall. Please try another.');
          setAddressNotFound(true);
          setCustomAddressError('Could not find this hall on Princeton campus. Please try being more specific.');
        }
      } catch (err) {
        setGeocodingStatus('❌ Error looking up location. Please try again.');
        setAddressNotFound(true);
        setCustomAddressError('Error looking up address. Please try again.');
      }
    } else {
      // For off-campus addresses
      if (!addressComponents.street || !addressComponents.city || !addressComponents.zip_code) {
        setGeocodingStatus('Please fill in all address fields');
        setAddressNotFound(false);
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
      setAddressNotFound(false);
      try {
        const searchAddress = `${formData.street_address}, ${formData.city}, NJ ${formData.zip_code}, USA`;
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
          setGeocodingStatus('✅ Location found successfully!');
          setAddressNotFound(false);
        } else {
          setGeocodingStatus('❌ No location found. Check that you entered the correct address.');
          setAddressNotFound(true);
          setCustomAddressError('No location found. Check that you entered the correct address.');
        }
      } catch (err) {
        setGeocodingStatus('❌ Error looking up location. Please try again.');
        setAddressNotFound(true);
        setCustomAddressError('Error looking up address. Please try again.');
      }
    }
  };

  const handleConfirmAddress = () => {
    if (pendingAddress) {
      // Parse the display_name to extract address, city, and zip code
      const displayName = pendingAddress.address || '';
      const parts = displayName.split(',').map(s => s.trim());
      let street = '';
      let city = '';
      let zip = '';
      if (parts.length > 0) street = parts[0];
      for (let i = 0; i < parts.length; i++) {
        if (/^\d{5}$/.test(parts[i])) zip = parts[i];
      }
      city = parts.find(p => p.toLowerCase() === formData.city.toLowerCase()) || parts[2] || '';
      // Set address to standardized format
      const standardizedAddress = `${street}, ${city}, NJ ${zip}, USA`;
      setFormData(prev => ({
        ...prev,
        address: standardizedAddress,
        street_address: street,
        city: city,
        zip_code: zip,
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
      const res = await axiosInstance.post(`${import.meta.env.VITE_API_URL}/api/upload`, form, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data;
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
    if (formData.title.length > 100) {
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
    if (Number(formData.sq_ft) <= 0 || Number(formData.sq_ft) > 10000) {
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
    if (!formData.title || !formData.cost || !formData.sq_ft) {
      setError('Please fill in all required fields');
      return;
    }
    if (locationType === 'off-campus' && !formData.zip_code) {
      setError('ZIP code is required for off-campus addresses.');
      return;
    }
    if (!formData.address || !formData.latitude || !formData.longitude) {
      setError('Please locate a valid address before submitting.');
      return;
    }
    console.log('Submitting formData:', formData);
    try {
      const res = await axiosInstance.post(`${import.meta.env.VITE_API_URL}/api/listings`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      const data = res.data;
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

  function stringDistance(a, b) {
    // Simple Levenshtein distance implementation or use a library for better accuracy
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  return (
    <div style={styles.container}>
      {error && <div ref={errorRef} style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ ...styles.form, gap: 18, padding: 24, width: '100%' }}>
        <div>
            <label style={styles.label}>Title <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="text"
                name="title"
                value={formData.title}
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
            {locationType === 'on-campus' ? (
              <div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Residential Hall <span style={{color: '#b00020'}}>*</span></label>
                  <select
                    style={styles.input}
                    value={tempAddress}
                    onChange={async (e) => {
                      const selectedHall = e.target.value;
                      setTempAddress(selectedHall);
                      setFormData(prev => ({
                        ...prev,
                        hall_name: selectedHall
                      }));
                      
                      if (selectedHall) {
                        setGeocodingStatus('Looking up coordinates...');
                        try {
                          const searchAddress = `${selectedHall}, Princeton University, Princeton, NJ 08544, USA`;
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
                          );
                          if (!response.ok) throw new Error('Failed to fetch coordinates');
                          const data = await response.json();
                          
                          if (data.length > 0) {
                            const { lat, lon, display_name } = data[0];
                            setFormData(prev => ({
                              ...prev,
                              address: display_name,
                              latitude: lat,
                              longitude: lon
                            }));
                            setGeocodingStatus('✅ Location found successfully!');
                          } else {
                            setGeocodingStatus('❌ Could not find this hall. Please try another.');
                          }
                        } catch (err) {
                          setGeocodingStatus('❌ Error looking up location. Please try again.');
                        }
                      }
                    }}
                    required
                  >
                    <option value="">Select a hall...</option>
                    {PRINCETON_HALLS.map(hall => (
                      <option key={hall} value={hall}>{hall}</option>
                    ))}
                  </select>
                  {geocodingStatus && (
                    <div style={{
                      ...styles.geocodingStatus,
                      color: geocodingStatus.includes('✅') ? '#4caf50' : 
                             geocodingStatus.includes('❌') ? '#d32f2f' : 
                             '#666'
                    }}>
                      {geocodingStatus}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Street Address <span style={{color: '#b00020'}}>*</span></label>
                {addressNotFound && customAddressError && (
                  <div style={{ color: '#b00020', marginBottom: '8px', fontSize: '14px' }}>
                    {customAddressError}
                  </div>
                )}
                <input
                  style={styles.input}
                  type="text"
                  value={formData.street_address || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      street_address: e.target.value
                    }));
                    if (addressNotFound) setAddressNotFound(false);
                  }}
                  placeholder="Enter street address"
                  required
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>City <span style={{color: '#b00020'}}>*</span></label>
                    <input
                      style={styles.input}
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          city: e.target.value
                        }));
                        if (addressNotFound) setAddressNotFound(false);
                      }}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>State <span style={{color: '#b00020'}}>*</span></label>
                    <input
                      style={styles.input}
                      type="text"
                      value="NJ"
                      disabled
                    />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>ZIP Code <span style={{color: '#b00020'}}>*</span></label>
                  <input
                    style={styles.input}
                    type="text"
                    value={formData.zip_code || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        zip_code: e.target.value
                      }));
                      if (addressNotFound) setAddressNotFound(false);
                    }}
                    placeholder="Enter ZIP code"
                    required
                  />
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>Country</label>
                  <input
                    style={styles.input}
                    type="text"
                    value="USA"
                    disabled
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    const addressComponents = {
                      street: formData.street_address,
                      city: formData.city,
                      state: 'NJ',
                      country: 'USA',
                      zip_code: formData.zip_code,
                    };
                    geocodeAddress(addressComponents);
                  }}
                  style={{...styles.geocodeButton, marginTop: '20px'}}
                >
                  Locate Address
                </button>
                {geocodingStatus && <div style={styles.geocodingStatus}>{geocodingStatus}</div>}
              </div>
            )}
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
                max={100}
              />
            </div>
            <div>
              <label style={styles.label}>Square Feet <span style={{color: '#b00020'}}>*</span></label>
              <input
                style={styles.input}
                type="number"
                name="sq_ft"
                value={formData.sq_ft}
                onChange={handleInputChange}
                required
                min={1}
                max={500}
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
            <div style={{ marginTop: '2rem' }}>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={uploading}
              >
                {uploading ? 'Creating...' : 'Create Listing'}
              </button>
              {!modalMode && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    ...styles.submitButton,
                    backgroundColor: '#666',
                    marginTop: '1rem'
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
        </form>
        {/* Address Confirmation Modal */}
        {showAddressConfirm && (
          <Dialog 
            open={showAddressConfirm} 
            onClose={handleEditAddress} 
            maxWidth="xs" 
            fullWidth
            PaperProps={{
              style: {
                borderRadius: 16,
                minWidth: 340,
                background: '#fff8f1',
                boxShadow: '0 4px 24px rgba(0,0,0,0.14)'
              }
            }}
          >
            <DialogTitle style={{
              background: '#FF6B00',
              color: 'white',
              fontWeight: 700,
              letterSpacing: 1,
              padding: '16px 24px',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16
            }}>
              Confirm Address
            </DialogTitle>
            <DialogContent style={{ background: '#fff8f1', padding: 28 }}>
              <div style={{ marginBottom: 16, fontSize: 16, color: '#333' }}>
                Please confirm the address for your listing:
              </div>
              <div style={{ fontWeight: 600, fontSize: 17, color: '#222', marginBottom: 8, background: '#fff', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {pendingAddress?.address}
              </div>
            </DialogContent>
            <DialogActions style={{ background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '16px 24px' }}>
              <Button onClick={handleEditAddress} style={{ color: '#888', fontWeight: 600 }}>Edit</Button>
              <Button onClick={handleConfirmAddress} variant="contained" style={{ background: '#FF6B00', color: 'white', fontWeight: 700 }}>
                Confirm
              </Button>
            </DialogActions>
          </Dialog>
        )}
    </div>
  );
}
export default CreateListing;
