import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const ViewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interestedListings, setInterestedListings] = useState(new Set());

  const openMap = () => {
    navigate('/map');
  };

  // Function to get the full image URL based on the backend URL
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return '/assets/placeholder.jpg';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${import.meta.env.VITE_API_URL}${imageUrl}`;
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Use the same API endpoint as the map view
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch listings: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Unexpected data format from API');
        }
        
        if (data.length === 0) {
          setListings([]);
          return;
        }
        
        // Use the exact same data format as the map view
        // This ensures consistency between the two views
        setListings(data);

        // Load interested locations from localStorage (same as map view)
        const interestedLocations = JSON.parse(localStorage.getItem('interestedLocations') || '[]');
        console.log('Interested locations:', interestedLocations);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Fetch interested listings when component mounts
  useEffect(() => {
    const fetchInterestedListings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/my-interested-listings`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch interested listings');
        }
        
        const data = await response.json();
        setInterestedListings(new Set(data.map(listing => listing.id)));
      } catch (err) {
        console.error('Error fetching interested listings:', err);
      }
    };

    fetchInterestedListings();
  }, []);

  // Function to toggle interest in a listing
  const toggleInterest = async (listingId) => {
    try {
      const isInterested = interestedListings.has(listingId);
      const method = isInterested ? 'DELETE' : 'POST';
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listingId}/interest`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isInterested ? 'remove' : 'add'} interest`);
      }

      // Update the interested listings state
      const newInterestedListings = new Set(interestedListings);
      if (isInterested) {
        newInterestedListings.delete(listingId);
      } else {
        newInterestedListings.add(listingId);
      }
      setInterestedListings(newInterestedListings);
    } catch (err) {
      console.error('Error toggling interest:', err);
      setError(err.message);
    }
  };

  // Use the same filter structure as the map view
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minSize: '',
    maxSize: '',
    minContract: '',
    maxContract: '',
    rating: 0 // Added to match map view filters
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Use the same filtering logic as the map view
  const filteredListings = listings.filter(listing => {
    if (filters.minPrice && listing.cost < Number(filters.minPrice)) return false;
    if (filters.maxPrice && listing.cost > Number(filters.maxPrice)) return false;
    if (filters.minSize && listing.cubic_feet < Number(filters.minSize)) return false;
    if (filters.maxSize && listing.cubic_feet > Number(filters.maxSize)) return false;
    if (filters.minContract && listing.contract_length_months < Number(filters.minContract)) return false;
    if (filters.maxContract && listing.contract_length_months > Number(filters.maxContract)) return false;
    // Rating filter would go here if implemented in the backend
    return true;
  });

  return (
    <div style={styles.container}>
      <Header title="Storage Listings" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Browse available storage spaces
        </div>
        
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Storage Listings</h2>
            <button onClick={openMap} style={styles.actionButton}>
              View Map
            </button>
          </div>
          
          {loading ? (
            <div style={styles.message}>Loading storage listings...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : listings.length === 0 ? (
            <div style={styles.message}>No storage listings available.</div>
          ) : (
            <div>
              <div style={styles.filtersSection}>
                <h3 style={styles.filtersTitle}>Filters</h3>
                <div style={styles.filterGrid}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Price Range ($/month)</label>
                    <div style={styles.rangeInputs}>
                      <input
                        type="number"
                        name="minPrice"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                      <input
                        type="number"
                        name="maxPrice"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Size Range (cubic feet)</label>
                    <div style={styles.rangeInputs}>
                      <input
                        type="number"
                        name="minSize"
                        placeholder="Min"
                        value={filters.minSize}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                      <input
                        type="number"
                        name="maxSize"
                        placeholder="Max"
                        value={filters.maxSize}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Contract Length (months)</label>
                    <div style={styles.rangeInputs}>
                      <input
                        type="number"
                        name="minContract"
                        placeholder="Min"
                        value={filters.minContract}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                      <input
                        type="number"
                        name="maxContract"
                        placeholder="Max"
                        value={filters.maxContract}
                        onChange={handleFilterChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div style={styles.message}>
                  No storage spaces match your criteria
                </div>
              ) : (
                <div style={styles.listingsGrid}>
                  {filteredListings.map(listing => {
                    // Get the full image URL using the same logic as the map view
                    const imageUrl = getFullImageUrl(listing.image_url);
                    // Check if this listing is in the interested list
                    const interestedLocations = new Set(JSON.parse(localStorage.getItem('interestedLocations') || '[]'));
                    const isInterested = interestedLocations.has(listing.id);
                    
                    return (
                      <div key={listing.id} style={styles.listingCard}>
                        <img 
                          src={imageUrl} 
                          alt={`Storage space at ${listing.location}`} 
                          style={styles.listingImage} 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/placeholder.jpg';
                          }}
                        />
                        <div style={styles.listingDetails}>
                          <h3 style={styles.listingTitle}>{listing.location}</h3>
                          <p style={styles.listingInfo}>
                            <strong>${listing.cost}</strong> per month · {listing.cubic_feet} cubic feet · {listing.contract_length_months} months
                          </p>
                          <div style={styles.descriptionBox}>
                            <p style={styles.description}>{listing.description || 'No description available'}</p>
                          </div>
                          <div style={styles.listingStatus}>
                            <span style={{
                              ...styles.status,
                              backgroundColor: listing.is_available ? '#4caf50' : '#f44336'
                            }}>
                              {listing.is_available ? 'Available' : 'Not Available'}
                            </span>
                            <span style={styles.lenderInfo}>Lender: Owner #{listing.owner_id}</span>
                          </div>
                          <div style={styles.actionButtons}>
                            <button 
                              style={{
                                ...styles.interestButton,
                                backgroundColor: interestedListings.has(listing.id) ? '#4caf50' : '#FF8F00'
                              }}
                              onClick={() => toggleInterest(listing.id)}
                            >
                              <i className={`fas ${interestedListings.has(listing.id) ? 'fa-check' : 'fa-heart'}`}></i>
                              {interestedListings.has(listing.id) ? 'Interested' : 'Show Interest'}
                            </button>
                            <button 
                              style={styles.viewButton}
                              onClick={() => navigate(`/listing/${listing.id}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  actionButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    gap: '10px',
  },
  interestButton: {
    flex: 1,
    padding: '10px 15px',
    backgroundColor: '#FF8F00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    minWidth: '120px',
    height: '40px',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcome: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
  },
  section: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  message: {
    color: '#666',
    marginBottom: '1rem',
  },
  error: {
    color: '#f44336',
    marginBottom: '1rem',
  },
  filtersSection: {
    backgroundColor: '#f5f5f5',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  filtersTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#333',
  },
  filterLabel: {
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  rangeInputs: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '0.9rem',
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem',
    marginTop: '1.5rem',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #eee',
    transition: 'transform 0.2s',
  },
  listingImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  listingDetails: {
    padding: '1.5rem',
  },
  listingTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    color: '#333',
  },
  listingInfo: {
    margin: '0.5rem 0',
    color: '#666',
  },
  listingStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
  },
  lenderInfo: {
    color: '#666',
    fontSize: '0.9rem',
  },
  listingId: {
    color: '#666',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
  status: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '120px',
    height: '40px',
  },
  descriptionBox: {
    backgroundColor: '#f9f9f9',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.4',
  },
};

export default ViewListings;
