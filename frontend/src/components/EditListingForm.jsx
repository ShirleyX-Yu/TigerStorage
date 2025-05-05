import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    minWidth: 320,
    maxWidth: 520,
    margin: '0 auto',
    background: 'none',
    boxShadow: 'none',
    borderRadius: 0,
    padding: 0
  },
  content: {
    width: '100%',
    marginTop: 0,
    marginBottom: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    width: '100%'
  },
  label: {
    fontWeight: 500,
    marginBottom: 4
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 16,
    fontFamily: 'inherit'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    minHeight: '100px',
    fontFamily: 'inherit'
  },
  error: {
    color: '#b00020',
    marginBottom: 10,
    fontWeight: 500
  },
  status: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8
  },
  button: {
    background: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '10px 0',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  imagePreview: {
    width: 120,
    height: 80,
    objectFit: 'cover',
    borderRadius: 6,
    marginTop: 8
  },
  addressInputContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    width: '100%'
  },
  smallButton: {
    background: '#e0e0e0',
    border: 'none',
    borderRadius: 5,
    padding: '6px 13px',
    fontSize: 15,
    cursor: 'pointer',
    marginLeft: 4
  },
  formGroup: {
    marginBottom: 18
  },
  geocodingStatus: {
    color: '#888',
    fontSize: 14,
    marginTop: 4
  },
  geocodeButton: {
    background: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '10px 0',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
};

const EditListingForm = ({ listingId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    hall_name: '',
    address: '',
    cost: '',
    sq_ft: '',
    description: '',
    latitude: '',
    longitude: '',
    start_date: '',
    end_date: '',
    image_url: '',
    title: '',
    street_address: '',
    city: '',
    state: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState('');
  const [locationType, setLocationType] = useState('on-campus');
  const [uploading, setUploading] = useState(false);
  const [showAddressConfirm, setShowAddressConfirm] = useState(false);
  const [pendingAddress, setPendingAddress] = useState(null);
  const [addressNotFound, setAddressNotFound] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listingId}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch listing details: ${response.status}`);
        }
        const data = await response.json();
        // Extract hall name if address is in the form '[Hall Name], Princeton, NJ 08544'
        let hallName = '';
        if (data.address) {
          const match = data.address.match(/^(.*?),\s*Princeton,?\s*NJ\s*08544$/i);
          if (match && match[1]) {
            hallName = match[1].trim();
            // Try to match exactly with dropdown options (case and whitespace)
            const found = PRINCETON_HALLS.find(h => h.toLowerCase() === hallName.toLowerCase());
            hallName = found || '';
          }
        }
        const formDataToSet = {
          hall_name: data.hall_name || '',
          address: data.address || '',
          cost: data.cost || '',
          sq_ft: data.sq_ft || '',
          description: data.description || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '',
          image_url: data.image_url || '',
          title: data.title || '',
          street_address: data.street_address || '',
          city: data.city || '',
          state: data.state || '',
        };
        setFormData(formDataToSet);
        setTempAddress(data.hall_name || hallName || '');
        const addressToCheck = data.address || '';
        if (addressToCheck.includes('Hall')) {
          setLocationType('on-campus');
        } else {
          setLocationType('off-campus');
        }
      } catch (err) {
        setError(`Error loading listing: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchListingDetails();
  }, [listingId]);

  useEffect(() => {
    if (error && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const handleInputChange = (e) => {
    setError('');
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('Image file size must be less than 5MB.');
      return;
    }
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formDataUpload,
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.url }));
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const geocodeAddress = async (addressComponents) => {
    if (locationType === 'on-campus') {
      if (!tempAddress.trim()) {
        setGeocodingStatus('Please enter an address');
        setAddressNotFound(false);
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
      setAddressNotFound(false);
      // Check manual mapping first for on-campus
      if (HALL_COORDINATES[tempAddress]) {
        const { lat, lng } = HALL_COORDINATES[tempAddress];
        setFormData(prev => ({
          ...prev,
          address: tempAddress,
          latitude: lat,
          longitude: lng
        }));
        setGeocodingStatus('Coordinates found from hall mapping!');
        setAddressNotFound(false);
        return;
      }
    } else {
      // For off-campus addresses
      if (!addressComponents.street || !addressComponents.city || !addressComponents.state) {
        setGeocodingStatus('Please fill in all address fields');
        setAddressNotFound(false);
        return;
      }
      setGeocodingStatus('Looking up coordinates...');
      setAddressNotFound(false);
      try {
        const searchAddress = `${addressComponents.street}, ${addressComponents.city}, ${addressComponents.state}, ${addressComponents.country}`;
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
          setAddressNotFound(false);
        } else {
          setGeocodingStatus('');
          setAddressNotFound(true);
        }
      } catch {
        setGeocodingStatus('');
        setAddressNotFound(true);
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
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
    if (!formData.title) {
      setError('Please enter a title for your listing');
      return;
    }
    if (!formData.cost) {
      setError('Please enter a cost');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please geocode the address to get coordinates');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`Failed to update listing: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      setError(`Error updating listing: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 32 }}>Loading...</div>;
  }

  return (
    <div style={styles.container} ref={containerRef}>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 10 }}>Listing updated!</div>}
      <div style={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>Loading...</div>
        ) : (
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
                    onChange={e => {
                      setTempAddress(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        hall_name: e.target.value
                      }));
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
                  {geocodingStatus && <div style={styles.geocodingStatus}>{geocodingStatus}</div>}
                </div>
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Street Address <span style={{color: '#b00020'}}>*</span></label>
                {addressNotFound && (
                  <div style={{ color: '#b00020', marginBottom: '8px', fontSize: '14px' }}>
                    No location matching address found. Check values entered.
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
                    <select
                      style={styles.input}
                      value={formData.state || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          state: e.target.value
                        }));
                        if (addressNotFound) setAddressNotFound(false);
                      }}
                      required
                    >
                      <option value="">Select state...</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
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
                      state: formData.state,
                      country: 'USA'
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
                required={!formData.image_url}
              />
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" style={styles.imagePreview} />
              )}
            </div>
            <button type="submit" style={{...styles.button, marginTop: '20px'}} disabled={uploading || loading}>
              {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
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

export default EditListingForm;
