import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

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
    setTempAddress('');
    setGeocodingStatus('');
  };

  const geocodeAddress = async () => {
    if (!tempAddress.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }
    if (locationType === 'on-campus' && !tempAddress.includes('Hall')) {
      setGeocodingStatus('Tip: For on-campus locations, include "Hall"');
    }
    setGeocodingStatus('Looking up coordinates...');

    try {
      const searchAddress =
        locationType === 'on-campus'
          ? `${tempAddress}, Princeton, NJ 08544`
          : tempAddress;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchAddress
        )}`
      );
      if (!response.ok) throw new Error('Failed to fetch coordinates');
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
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
    } catch {
      setGeocodingStatus('Error looking up address. Please try again.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
    try {
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Please select both start and end dates');
      }
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) throw new Error('End date must be after start date');
      if (!formData.location || !formData.cost || !formData.cubicFeet) {
        throw new Error('Please fill in all required fields');
      }

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

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="location" style={styles.label}>
              Location (Title) <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Location Type <span style={{ color: '#b00020' }}>*</span>
            </label>
            <div style={styles.radioContainer}>
              {['on-campus', 'off-campus'].map(type => (
                <label key={type} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="locationType"
                    value={type}
                    checked={locationType === type}
                    onChange={handleLocationTypeChange}
                    style={styles.radioInput}
                  />
                  {type === 'on-campus' ? 'On Campus' : 'Off Campus'}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Address</label>
            <div style={styles.addressInputContainer}>
              <input
                type="text"
                value={tempAddress}
                onChange={handleAddressChange}
                placeholder={
                  locationType === 'on-campus'
                    ? '[Hall Name] Hall'
                    : 'e.g. 123 Main St, Princeton, NJ'
                }
                style={styles.addressInput}
                required
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
              <div
                style={{
                  ...styles.geocodingStatus,
                  color: geocodingStatus.includes('Error') || geocodingStatus.includes('not found')
                    ? '#e65100'
                    : '#4caf50',
                }}
              >
                {geocodingStatus}
              </div>
            )}
          </div>

          <div style={{ ...styles.formGroup, ...styles.coordinatesContainer }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="latitude" style={styles.label}>Latitude</label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                value={formData.latitude}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="longitude" style={styles.label}>Longitude</label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                value={formData.longitude}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="cost" style={styles.label}>
              Cost per Month ($) <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="cost"
              name="cost"
              type="number"
              value={formData.cost}
              onChange={handleInputChange}
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="cubicFeet" style={styles.label}>
              Cubic Feet <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="cubicFeet"
              name="cubicFeet"
              type="number"
              value={formData.cubicFeet}
              onChange={handleInputChange}
              style={styles.input}
              min="0"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>
              Description <span style={{ color: '#b00020' }}>*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your storage space..."
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="start_date" style={styles.label}>
              Start Date <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange}
              style={styles.input}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="end_date" style={styles.label}>
              End Date <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange}
              style={styles.input}
              required
              min={formData.start_date || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="image" style={styles.label}>
              Image <span style={{ color: '#b00020' }}>*</span>
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={styles.input}
              required
            />
            {uploading && <div style={styles.uploading}>Uploading image...</div>}
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" style={styles.imagePreview} />
            )}
          </div>

          <button type="submit" style={styles.submitButton} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
