import React, { useState, useEffect } from 'react';

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
    fontSize: 16
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontSize: 16,
    minHeight: 60
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
    background: '#0052cc',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '10px 0',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12
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
};

const EditListingForm = ({ listingId, onClose, onSuccess }) => {
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listingId}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch listing details: ${response.status}`);
        }
        const data = await response.json();
        const formDataToSet = {
          location: data.location || '',
          address: data.address || '',
          cost: data.cost || '',
          cubicFeet: data.cubic_feet || data.cubicFeet || '',
          description: data.description || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '',
          image_url: data.image_url || ''
        };
        setFormData(formDataToSet);
        setTempAddress(data.address || '');
        const addressToCheck = data.address || data.location || '';
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    setTempAddress(e.target.value);
  };

  const handleLocationTypeChange = (e) => {
    setLocationType(e.target.value);
    setTempAddress('');
    setGeocodingStatus('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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

  const geocodeAddress = async () => {
    if (!tempAddress.trim()) {
      setGeocodingStatus('Please enter an address');
      return;
    }
    if (locationType === 'on-campus' && !tempAddress.includes('Hall')) {
      setGeocodingStatus('Tip: For on-campus locations, use format "[Hall Name] Hall"');
    }
    try {
      setGeocodingStatus('Geocoding address...');
      let searchAddress;
      if (locationType === 'on-campus') {
        searchAddress = tempAddress.includes('Princeton, NJ 08544') ? tempAddress : `${tempAddress}, Princeton, NJ 08544`;
      } else {
        searchAddress = tempAddress;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch coordinates');
      }
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lon, address: tempAddress }));
        setGeocodingStatus('Address geocoded!');
      } else {
        setGeocodingStatus('No results found. Please check the address.');
      }
    } catch (err) {
      setGeocodingStatus('Geocoding failed: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess(false);
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Please select both start and end dates');
      }
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
      if (!formData.location) {
        setError('Please enter a title for your listing');
        return;
      }
      if (!formData.cost) {
        setError('Please enter a cost');
        return;
      }
      if (!formData.cubicFeet) {
        setError('Please enter the size (cubic feet)');
        return;
      }
      if (!formData.latitude || !formData.longitude) {
        setError('Please geocode the address to get coordinates');
        return;
      }
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
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 10 }}>Listing updated!</div>}
      <div style={styles.content}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Location (Title)</label>
            <input
              style={styles.input}
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Location Type</label>
            <select
              style={styles.input}
              value={locationType}
              onChange={handleLocationTypeChange}
            >
              <option value="on-campus">On Campus</option>
              <option value="off-campus">Off Campus</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Address</label>
            <div style={styles.addressInputContainer}>
              <input
                style={styles.input}
                type="text"
                value={tempAddress}
                onChange={handleAddressChange}
                placeholder={locationType === 'on-campus' ? 'e.g. Bloomberg Hall' : 'Enter full address'}
              />
              <button
                type="button"
                style={styles.smallButton}
                onClick={geocodeAddress}
              >
                Lookup
              </button>
            </div>
            {geocodingStatus && <div style={styles.status}>{geocodingStatus}</div>}
          </div>
          <div>
            <label style={styles.label}>Cost per Month ($)</label>
            <input
              style={styles.input}
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Cubic Feet</label>
            <input
              style={styles.input}
              type="number"
              name="cubicFeet"
              value={formData.cubicFeet}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Description</label>
            <textarea
              style={styles.textarea}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your storage space..."
            />
          </div>
          <div>
            <label style={styles.label}>Start Date</label>
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
            <label style={styles.label}>End Date</label>
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
            <label style={styles.label}>Image</label>
            <input
              style={styles.input}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" style={styles.imagePreview} />
            )}
          </div>
          <button type="submit" style={styles.button} disabled={uploading || loading}>
            {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditListingForm;
