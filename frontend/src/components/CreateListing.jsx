import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const CreateListing = ({ onClose, onSuccess, modalMode = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: '', // This will be used as the title field
    address: '', // New separate address field
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
    setTempAddress(e.target.value);
  };

  const handleLocationTypeChange = (e) => {
    setLocationType(e.target.value);
    // Clear address and geocoding status when switching location types
    setTempAddress('');
    setGeocodingStatus('');
  };

  const geocodeAddress = async () => {
    if (!tempAddress.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }
    
    // Provide guidance based on location type
    if (locationType === 'on-campus' && !tempAddress.includes('Hall')) {
      setGeocodingStatus('Tip: For on-campus locations, use format "[Hall Name] Hall"');
    }

    setGeocodingStatus('Looking up coordinates...');
    
    try {
      let searchAddress;
      
      if (locationType === 'on-campus') {
        // For on-campus locations, use the residential college format
        searchAddress = tempAddress.includes('Princeton, NJ 08544') ? tempAddress : `${tempAddress}, Princeton, NJ 08544`;
      } else {
        // For off-campus, use the full address as provided
        searchAddress = tempAddress;
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
        
        // Update form data with the coordinates and address
        setFormData(prev => ({
          ...prev,
          address: tempAddress,
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
    setError('');

    // Require image upload
    if (!formData.image_url) {
      setError('Please upload an image of your storage space.');
      return;
    }

    try {
      // Validate dates
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Please select both start and end dates');
      }

      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Validate other required fields
      if (!formData.location || !formData.cost || !formData.cubicFeet) {
        throw new Error('Please fill in all required fields');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const data = await response.json();
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/listing/${data.listing_id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      {(!modalMode) && (
        <>
          <button
            style={styles.backButton}
            onClick={() => {
              if (onClose) { onClose(); } else { navigate('/lender-dashboard'); }
            }}
          >
            &larr; Back
          </button>
          <Header title="Create Storage Listing" />
        </>
      )}
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.content}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="location" style={styles.label}>Title</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter a descriptive title (e.g., 'Butler College Storage')"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Address</label>
            <div style={styles.locationTypeSelector}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="locationType"
                  value="on-campus"
                  checked={locationType === 'on-campus'}
                  onChange={handleLocationTypeChange}
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
                />
                Off Campus
              </label>
            </div>

            <div style={styles.addressInputContainer}>
              <input
                type="text"
                placeholder={locationType === 'on-campus' 
                  ? "[Hall Name] Hall" 
                  : "Enter full street address (e.g., 123 Main St, Princeton, NJ)"}
                value={tempAddress}
                onChange={handleAddressChange}
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
          {/* Latitude and Longitude fields removed from form UI */}

          <div style={styles.formGroup}>
            <label htmlFor="start_date" style={styles.label}>Start Date</label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              style={styles.input}
              required
              min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="end_date" style={styles.label}>End Date</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              style={styles.input}
              required
              min={formData.start_date || new Date().toISOString().split('T')[0]} // Prevent selecting dates before start date
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
