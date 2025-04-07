import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const ViewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openMap = () => {
    // set cookie with return URL
    document.cookie = `returnTo=${encodeURIComponent('/view-listings')}; path=/`;
    window.location.href = '/public/ptonMap.html';
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
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
        
        // transform the data to match our component's expected format
        const formattedListings = data.map(listing => ({
          id: listing.id,
          location: listing.location,
          cost: listing.cost,
          cubicFeet: listing.cubic_feet,
          description: listing.description,
          isAvailable: listing.is_available,
          createdAt: listing.created_at,
          contractLength: listing.contract_length_months || 12, // Use default if not provided
          images: ['/assets/placeholder.jpg'], // default placeholder image
          lender: `Owner #${listing.owner_id}` // Use owner ID as reference
        }));
        setListings(formattedListings);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minSize: '',
    maxSize: '',
    minContract: '',
    maxContract: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredListings = listings.filter(listing => {
    if (filters.minPrice && listing.cost < Number(filters.minPrice)) return false;
    if (filters.maxPrice && listing.cost > Number(filters.maxPrice)) return false;
    if (filters.minSize && listing.cubicFeet < Number(filters.minSize)) return false;
    if (filters.maxSize && listing.cubicFeet > Number(filters.maxSize)) return false;
    if (filters.minContract && listing.contractLength < Number(filters.minContract)) return false;
    if (filters.maxContract && listing.contractLength > Number(filters.maxContract)) return false;
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
                  {filteredListings.map(listing => (
                    <div key={listing.id} style={styles.listingCard}>
                      <img src={listing.images[0]} alt="Storage Space" style={styles.listingImage} />
                      <div style={styles.listingDetails}>
                        <h3 style={styles.listingTitle}>{listing.location}</h3>
                        <p style={styles.listingInfo}>
                          <strong>${listing.cost}</strong> per month · {listing.cubicFeet} cubic feet · {listing.contractLength} months
                        </p>
                        <div style={styles.descriptionBox}>
                          <p style={styles.description}>{listing.description}</p>
                        </div>
                        <div style={styles.listingStatus}>
                          <span style={{
                            ...styles.status,
                            backgroundColor: listing.isAvailable ? '#4caf50' : '#f44336'
                          }}>
                            {listing.isAvailable ? 'Available' : 'Not Available'}
                          </span>
                          <span style={styles.lenderInfo}>Lender: {listing.lender}</span>
                        </div>
                        <button 
                          style={styles.viewButton}
                          onClick={() => navigate(`/listing/${listing.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
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
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1rem',
    fontSize: '1rem',
    fontWeight: '500',
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
