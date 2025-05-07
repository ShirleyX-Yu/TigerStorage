import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { axiosInstance } from '../utils/auth';
import { HALL_COORDINATES } from '../utils/hallCoordinates';

console.log('HALL_COORDINATES:', HALL_COORDINATES);

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
    fontFamily: 'inherit',
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
    title: '',
    hall_name: '',
    address: '',
    street_address: '',
    city: '',
    zip_code: '',
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
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);

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

  const handleLocationTypeChange = (e) => {
    setError('');
    setLocationType(e.target.value);
    setTempAddress('');
    setGeocodingStatus('');
    setAddressNotFound(false);
    setCustomAddressError('');
  };

  const geocodeAddress = async (addressOverride) => {
    if (locationType === 'on-campus') {
      const addressToGeocode = addressOverride || tempAddress;
      if (!addressToGeocode.trim()) {
        setGeocodingStatus('Please select a hall');
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
      try {
        const searchAddress = `${addressToGeocode}, Princeton University, Princeton, NJ 08544`;
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
        }
      } catch {
        setGeocodingStatus('❌ Error looking up address. Please try again.');
        setAddressNotFound(true);
      }
    } else {
      // For off-campus addresses
      if (!formData.street_address || !formData.city || !formData.zip_code) {
        setGeocodingStatus('Please fill in all address fields');
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
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
      } catch {
        setGeocodingStatus('❌ Error looking up address. Please try again.');
        setAddressNotFound(true);
        setCustomAddressError('Error looking up address. Please try again.');
      }
    }
  };

  const handleConfirmAddress = () => {
    if (pendingAddress) {
      if (locationType === 'off-campus') {
        // Parse the display_name to extract address components
        const displayName = pendingAddress.address || '';
        console.log('Display Name:', displayName);
        const parts = displayName.split(',').map(s => s.trim());
        console.log('Parts:', parts);
        
        // Extract street number and name from the first part
        const firstPart = parts[0] || '';
        console.log('First Part:', firstPart);
        
        // Updated regex to handle various address formats including abbreviations
        const streetMatch = firstPart.match(/^(\d+)(?:\s+|\s*,\s*)([A-Za-z\s\.]+)$/);
        console.log('Street Match:', streetMatch);
        
        let street = firstPart;
        if (streetMatch) {
          // Reformat as "Street Name Number"
          street = `${streetMatch[2].trim()} ${streetMatch[1]}`;
          console.log('Formatted Street:', street);
        } else {
          // If regex doesn't match, try to extract number and street name manually
          const numberMatch = firstPart.match(/^(\d+)/);
          if (numberMatch) {
            const number = numberMatch[1];
            const streetName = firstPart.substring(numberMatch[0].length).trim();
            if (streetName) {
              street = `${streetName} ${number}`;
              console.log('Manually Formatted Street:', street);
            }
          }
        }
        
        let city = parts.find(p => p.toLowerCase() === formData.city.toLowerCase()) || formData.city;
        let zip = parts.find(p => /^\d{5}$/.test(p)) || formData.zip_code;
        
        console.log('Final Street Address:', street);
        
        setFormData(prev => ({
          ...prev,
          address: pendingAddress.address,
          street_address: street,
          city: city,
          zip_code: zip,
          latitude: pendingAddress.latitude,
          longitude: pendingAddress.longitude
        }));
        setIsAddressConfirmed(true);
      } else {
        setFormData(prev => ({
          ...prev,
          address: pendingAddress.address,
          latitude: pendingAddress.latitude,
          longitude: pendingAddress.longitude
        }));
      }
    }
    setShowAddressConfirm(false);
    setPendingAddress(null);
  };

  const handleEditAddress = () => {
    setShowAddressConfirm(false);
    setPendingAddress(null);
    setIsAddressConfirmed(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }
    setUploading(true);
    try {
      // First get the CSRF token
      const csrfResponse = await axiosInstance.get('/api/csrf-token');
      const csrfToken = csrfResponse.data.csrf_token;

      const form = new FormData();
      form.append('file', file);
      
      // Use fetch with the CSRF token in headers
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken
        }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }
      const result = await res.json();
      setFormData(prev => ({ ...prev, image_url: result.url }));
    } catch (err) {
      setError('Failed to upload image: ' + (err.response?.data?.error || err.message));
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
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
    if (locationType === 'off-campus' && (!formData.street_address || !formData.city || !formData.zip_code)) {
      setError('Please fill in all address fields for off-campus locations.');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please locate a valid address before submitting.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          location: formData.title,
          squareFeet: formData.sq_ft
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create listing');
      }
      const data = await res.json();
      onSuccess ? onSuccess() : navigate(`/listing/${data.listing_id}`);
    } catch (err) {
      let errorMessage = "We couldn't create your listing. Please check your information and try again.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error.replace(/Error:\s*/, '');
      }
      setError(errorMessage);
    }
  };

  return (
    <div style={styles.container}>
      {error && <div ref={errorRef} style={{...styles.error, backgroundColor: '#f8d7da', color: '#721c24', padding: '10px 15px', borderRadius: '4px', marginBottom: '15px'}}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ ...styles.form, gap: 18, padding: 24, width: '100%' }}>
        <div>
          <label style={styles.label}>Location (Title) <span style={{color: '#b00020'}}>*</span></label>
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
        {locationType === 'on-campus' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Residential Hall <span style={{color: '#b00020'}}>*</span></label>
            <select
              style={styles.input}
              value={formData.hall_name}
              onChange={e => setFormData(prev => ({ ...prev, hall_name: e.target.value }))}
              required
            >
              <option value="">Select a hall...</option>
              {Object.keys(HALL_COORDINATES).map(hall => (
                <option key={hall} value={hall}>{hall}</option>
              ))}
            </select>
          </div>
        )}
        {locationType === 'on-campus' ? null : (
          <div style={styles.formGroup}>
            {!isAddressConfirmed ? (
              <>
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
                    <label style={styles.label}>State</label>
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
                  onClick={() => geocodeAddress()}
                  style={{...styles.geocodeButton, marginTop: '20px', width: '100%'}}
                >
                  Locate Address
                </button>
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
              </>
            ) : (
              <>
                <label style={styles.label}>Confirmed Address</label>
                <input
                  style={{...styles.input, backgroundColor: '#f5f5f5'}}
                  type="text"
                  value={formData.address}
                  readOnly
                />
                <button 
                  type="button" 
                  onClick={handleEditAddress}
                  style={{...styles.geocodeButton, marginTop: '20px', width: '100%', backgroundColor: '#666'}}
                >
                  Edit Address
                </button>
              </>
            )}
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
            max={10000}
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

      {/* Address Confirmation Modal */}
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
    </div>
  );
};

export default CreateListing;
