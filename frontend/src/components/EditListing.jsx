import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import { HALL_COORDINATES } from '../utils/hallCoordinates';

// Helper to get CSRF token from cookie
function getCSRFToken() {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const EditListing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '', // This will be used as the title field
    address: '', // Separate address field
    cost: '',
    squareFeet: '',
    description: '',
    latitude: '',
    longitude: '',
    start_date: '',
    end_date: '',
    image_url: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [geocodingStatus, setGeocodingStatus] = useState('');
  const [locationType, setLocationType] = useState('on-campus');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch listing details: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched listing data:', data);
        
        // Debug the address field
        console.log('Address field from API:', data.address);
        console.log('Location field from API:', data.location);
        
        // Set the form data from the fetched listing
        const formDataToSet = {
          title: data.title || '',
          address: data.address || '', // Only use the address field, don't fall back to location
          cost: data.cost || '',
          squareFeet: data.square_feet || data.squareFeet || '',
          description: data.description || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '',
          image_url: data.image_url || ''
        };
        
        console.log('Setting form data:', formDataToSet);
        setFormData(formDataToSet);
        
        // For the temporary address field (used for geocoding), use the address field if available
        // For older listings without an address field, use the location as a fallback
        const addressValue = data.address || '';
        console.log('Setting tempAddress to:', addressValue);
        setTempAddress(addressValue);
        
        // Determine location type based on the address or location
        const addressToCheck = data.address || data.location || '';
        if (addressToCheck.includes('Hall')) {
          setLocationType('on-campus');
        } else {
          setLocationType('off-campus');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError(`Error loading listing: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchListingDetails();
  }, [id]);

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
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const geocodeAddress = async () => {
    console.log('Geocoding address:', tempAddress);
    if (!tempAddress.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }
    // Provide guidance based on location type
    if (locationType === 'on-campus' && !tempAddress.includes('Hall')) {
      setGeocodingStatus('Tip: For on-campus locations, use format "[Hall Name] Hall"');
    }
    try {
      setGeocodingStatus('Geocoding address...');
      let searchAddress;
      if (locationType === 'on-campus') {
        // For on-campus locations, use the residential college format
        searchAddress = tempAddress.includes('Princeton, NJ 08544') ? tempAddress : `${tempAddress}, Princeton, NJ 08544`;
      } else {
        // For off-campus, use the full address as provided
        searchAddress = tempAddress;
      }
      // Check manual mapping first for on-campus
      if (locationType === 'on-campus' && HALL_COORDINATES[tempAddress]) {
        const { lat, lng } = HALL_COORDINATES[tempAddress];
        const updatedFormData = {
          ...formData,
          address: tempAddress,
          latitude: lat,
          longitude: lng
        };
        setFormData(updatedFormData);
        setGeocodingStatus('Coordinates found from hall mapping!');
        return;
      }
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
        const updatedFormData = {
          ...formData,
          address: tempAddress,
          latitude: lat,
          longitude: lon
        };
        setFormData(updatedFormData);
        setGeocodingStatus('Address found!');
      } else if (locationType === 'on-campus' && HALL_COORDINATES[tempAddress]) {
        // Fallback to manual mapping if not found by API
        const { lat, lng } = HALL_COORDINATES[tempAddress];
        const updatedFormData = {
          ...formData,
          address: tempAddress,
          latitude: lat,
          longitude: lng
        };
        setFormData(updatedFormData);
        setGeocodingStatus('Coordinates found from hall mapping!');
      } else {
        setGeocodingStatus('Address not found. Try being more specific.');
      }
    } catch (err) {
      setGeocodingStatus('Error looking up address. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess(false);
      
      // Validate dates
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Please select both start and end dates');
      }

      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Show more detailed validation errors
      if (!formData.title) {
        setError('Please enter a title for your listing');
        return;
      }
      if (!formData.cost) {
        setError('Please enter a cost');
        return;
      }
      if (!formData.squareFeet) {
        setError('Please enter the square feet');
        return;
      }
      if (!formData.address) {
        setError('Please enter an address');
        return;
      }
      if (!formData.latitude || !formData.longitude) {
        setError('Please geocode your address to get coordinates');
        return;
      }
      
      console.log('Submitting updated listing data:', formData);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/lender-dashboard', { state: { refresh: true } });
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to update listing:', response.status, errorData);
        setError(`Failed to update listing: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      console.error('Error updating listing:', err);
      setError(`Error updating listing: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Edit Storage Listing" />
        <div style={styles.loading}>Loading listing details...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Header title="Edit Storage Listing" />
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>Listing updated successfully! Redirecting...</div>}
      <div style={styles.content}>
        <form onSubmit={handleSubmit} style={styles.form}>
        <button 
          type="button"
          onClick={() => navigate('/lender-dashboard')}
          style={{...styles.cancelButton, marginBottom: 24, alignSelf: 'flex-start'}}>
          ← Back to Dashboard
        </button>
          <div style={styles.formGroup}>
            <label htmlFor="title" style={styles.label}>Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
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
                  disabled
                />
                On Campus
              </label>
            </div>
            <div style={styles.addressInputContainer}>
              <input
                type="text"
                placeholder="[Hall Name] Hall"
                value={tempAddress}
                onChange={handleAddressChange}
                style={styles.addressInput}
              />
              <button 
                type="button" 
                onClick={geocodeAddress}
                style={styles.geocodeButton}
              >
                Geocode
              </button>
            </div>
            {geocodingStatus && (
              <div style={styles.geocodingStatus}>
                {geocodingStatus}
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Coordinates (from geocoding)</label>
            <div style={styles.coordinatesContainer}>
              <div style={styles.coordinateField}>
                <label htmlFor="latitude" style={styles.coordinateLabel}>Latitude</label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  style={styles.coordinateInput}
                  readOnly
                />
              </div>
              <div style={styles.coordinateField}>
                <label htmlFor="longitude" style={styles.coordinateLabel}>Longitude</label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  style={styles.coordinateInput}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="cost" style={styles.label}>Cost per Month ($)</label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              placeholder="Enter cost per month"
              min="0"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="squareFeet" style={styles.label}>Size (sq ft)</label>
            <input
              type="number"
              id="squareFeet"
              name="squareFeet"
              value={formData.squareFeet}
              onChange={handleInputChange}
              placeholder="Enter size in square feet"
              min="0"
              style={styles.input}
              required
            />
          </div>

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
              min={new Date().toISOString().split('T')[0]}
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
              min={formData.start_date || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the storage space"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                minHeight: '100px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="image" style={styles.label}>Image</label>
            <div style={styles.imageUploadContainer}>
              {formData.image_url && (
                <div style={styles.currentImage}>
                  <img 
                    src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_API_URL}${formData.image_url}`} 
                    alt="Listing" 
                    style={styles.previewImage} 
                  />
                  <p style={styles.currentImageText}>Current image</p>
                </div>
              )}
              <div style={styles.uploadControls}>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={styles.fileInput}
                  disabled={uploading}
                />
                {uploading && <div style={styles.uploading}>Uploading...</div>}
              </div>
            </div>
          </div>

          <div style={styles.buttonContainer}>

            <button type="submit" style={styles.submitButton}>
              Update Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  imageUploadContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  currentImage: {
    marginBottom: '10px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  currentImageText: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: '#666',
  },
  uploadControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  fileInput: {
    padding: '8px 0',
  },
  uploading: {
    color: '#f57c00',
    fontSize: '14px',
    marginTop: '5px',
  },
  content: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  form: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '30px',
  },
  submitButton: {
    backgroundColor: '#F57C00',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    color: '#333',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '10px 20px',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '10px 20px',
    fontSize: '14px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '300px',
    fontSize: '18px',
    color: '#666',
  },
  locationTypeSelector: {
    display: 'flex',
    marginBottom: '10px',
  },
  radioLabel: {
    marginRight: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  addressInputContainer: {
    display: 'flex',
    gap: '10px',
  },
  addressInput: {
    flex: 1,
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  geocodeButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '0 15px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  geocodingStatus: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#666',
  },
  coordinatesContainer: {
    display: 'flex',
    gap: '15px',
  },
  coordinateField: {
    flex: 1,
  },
  coordinateLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px',
  },
  coordinateInput: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5',
  },
};

export default EditListing;
