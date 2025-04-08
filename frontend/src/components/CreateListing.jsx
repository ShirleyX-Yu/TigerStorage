import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const CreateListing = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: '',
    cost: '',
    cubicFeet: '',
    description: '',
    latitude: '',
    longitude: '',
    contract_length_months: 12,
    image_url: ''
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState(''); // For status messages
  const [locationType, setLocationType] = useState('on-campus'); // 'on-campus' or 'off-campus'

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const handleLocationTypeChange = (e) => {
    setLocationType(e.target.value);
    // Clear address and geocoding status when switching location types
    setAddress('');
    setGeocodingStatus('');
  };

  const geocodeAddress = async () => {
    if (!address.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }

    setGeocodingStatus('Looking up coordinates...');
    
    try {
      let searchAddress;
      
      if (locationType === 'on-campus') {
        // For on-campus locations, add Princeton University context
        searchAddress = `${address}, Princeton University, Princeton, NJ`;
      } else {
        // For off-campus, use the full address as provided
        searchAddress = address;
      }
      
      // Using the Nominatim OpenStreetMap API (free and doesn't require API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch coordinates');
      }
      
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        
        // Update form data with the coordinates
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));
        
        setGeocodingStatus('Address found!');
      } else {
        setGeocodingStatus('Address not found. Try being more specific.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeocodingStatus('Error looking up address. Please try again.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        image_url: data.url
      }));
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        navigate('/view-listings');
      } else {
        setError('Failed to create listing');
      }
    } catch (err) {
      setError('Error creating listing');
    }
  };

  return (
    <div style={styles.container}>
      <Header title="Create Storage Listing" />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.content}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="location" style={styles.label}>Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter storage location"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Location Type</label>
            <div style={styles.radioContainer}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="locationType"
                  value="on-campus"
                  checked={locationType === 'on-campus'}
                  onChange={handleLocationTypeChange}
                  style={styles.radioInput}
                />
                On Campus
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="locationType"
                  value="off-campus"
                  checked={locationType === 'off-campus'}
                  onChange={handleLocationTypeChange}
                  style={styles.radioInput}
                />
                Off Campus
              </label>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="address" style={styles.label}>
              {locationType === 'on-campus' 
                ? 'Princeton Building/Hall Name' 
                : 'Full Street Address'}
            </label>
            <div style={styles.addressInputContainer}>
              <input
                type="text"
                id="address"
                value={address}
                onChange={handleAddressChange}
                placeholder={locationType === 'on-campus'
                  ? 'Enter a Princeton hall or building name'
                  : 'Enter full street address (e.g., 123 Main St, Princeton, NJ)'}
                style={styles.addressInput}
              />
              <button 
                type="button" 
                onClick={geocodeAddress} 
                style={styles.geocodeButton}
              >
                Find Coordinates
              </button>
            </div>
            {geocodingStatus && (
              <div style={{
                ...styles.geocodingStatus,
                color: geocodingStatus.includes('Error') || geocodingStatus.includes('not found') 
                  ? '#e65100' : '#4caf50'
              }}>
                {geocodingStatus}
              </div>
            )}
          </div>

          <div style={styles.coordinatesContainer}>
            <div style={styles.formGroup}>
              <label htmlFor="latitude" style={styles.label}>Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                placeholder="Enter latitude"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="longitude" style={styles.label}>Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="Enter longitude"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="cost" style={styles.label}>Cost ($ per month)</label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              placeholder="Enter monthly cost"
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="cubicFeet" style={styles.label}>Size (cubic feet)</label>
            <input
              type="number"
              id="cubicFeet"
              name="cubicFeet"
              value={formData.cubicFeet}
              onChange={handleInputChange}
              placeholder="Enter size in cubic feet"
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter a description of the storage space"
              style={{...styles.input, minHeight: '100px'}}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="contract_length_months" style={styles.label}>Contract Length (months)</label>
            <input
              type="number"
              id="contract_length_months"
              name="contract_length_months"
              value={formData.contract_length_months}
              onChange={handleInputChange}
              placeholder="Enter contract length in months"
              style={styles.input}
              min="1"
              max="60"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="image" style={styles.label}>Storage Space Image</label>
            <input
              type="file"
              id="image"
              name="image"
              onChange={handleImageUpload}
              accept="image/*"
              style={styles.input}
            />
            {uploading && <div style={styles.uploading}>Uploading image...</div>}
          </div>

          <button type="submit" style={styles.submitButton} disabled={uploading}>
            Create Listing
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
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
    fontSize: '16px',
  },
  geocodeButton: {
    padding: '10px 15px',
    backgroundColor: '#FF8F00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  geocodingStatus: {
    marginTop: '5px',
    fontSize: '14px',
  },
  coordinatesContainer: {
    display: 'flex',
    gap: '15px',
  },
  radioContainer: {
    display: 'flex',
    gap: '20px',
    marginBottom: '10px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '16px',
  },
  radioInput: {
    marginRight: '8px',
    cursor: 'pointer',
  },
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
    fontWeight: '500',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
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
    fontWeight: '500',
    width: '100%',
  },
};

export default CreateListing;
