import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const CreateListing = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    location: '',
    cost: '',
    cubicFeet: '',
    contractLength: '',
    images: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);

    // Send as JSON instead of FormData
    try {
      const response = await fetch('http://localhost:8000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: formData.location,
          cost: formData.cost,
          cubicFeet: formData.cubicFeet,
          contractLength: formData.contractLength
        })
      });

      const responseData = await response.text();
      console.log('Response:', response.status, responseData);
  
      if (response.ok) {
        console.log('Listing created successfully');
        navigate('/lender');
      } else {
        console.error('Error creating listing');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div style={styles.container}>
      <Header title="Create Storage Listing" />
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
            <label htmlFor="contractLength" style={styles.label}>Contract Length (months)</label>
            <input
              type="number"
              id="contractLength"
              name="contractLength"
              value={formData.contractLength}
              onChange={handleInputChange}
              placeholder="Enter contract length in months"
              style={styles.input}
              min="1"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="images" style={styles.label}>Upload Images</label>
            <input
              type="file"
              id="images"
              name="images"
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              style={styles.fileInput}
            />
            {formData.images.length > 0 && (
              <div style={styles.imagePreview}>
                {formData.images.map((image, index) => (
                  <div key={index} style={styles.previewItem}>
                    {image.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button type="button" onClick={() => navigate('/lender')} style={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" style={styles.primaryButton}>
              Create Listing
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
  content: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  form: {
    backgroundColor: '#fff',
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
  fileInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  imagePreview: {
    marginTop: '1rem',
  },
  previewItem: {
    padding: '0.5rem',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '0.5rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem',
  },
  primaryButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ddd',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
};

export default CreateListing;
