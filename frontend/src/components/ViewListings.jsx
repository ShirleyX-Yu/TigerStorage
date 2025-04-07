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
    <div className="view-listings">
      <Header />
      <div className="listings-container">
        <div className="listings-header">
          <h1>Storage Listings</h1>
          <button onClick={openMap} style={styles.actionButton}>
            View Map
          </button>
        </div>
        <div style={styles.content}>
          {loading ? (
            <div style={styles.message}>Loading storage listings...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : listings.length === 0 ? (
            <div style={styles.message}>No storage listings available.</div>
          ) : (
            <div style={styles.mainContent}>
              <div style={styles.filters}>
                <h2>Filters</h2>
                <div style={styles.filterGrid}>
                  <div style={styles.filterGroup}>
                    <label>Price Range ($/month)</label>
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
                    <label>Size Range (cubic feet)</label>
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
                    <label>Contract Length (months)</label>
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

              <div style={styles.listingsGrid}>
                {filteredListings.length === 0 ? (
                  <div style={styles.message}>
                    No storage spaces match your criteria
                  </div>
                ) : (
                  filteredListings.map(listing => (
                    <div key={listing.id} style={styles.listingCard}>
                      <img src={listing.images[0]} alt="Storage Space" style={styles.listingImage} />
                      <div style={styles.listingDetails}>
                        <h3 style={styles.listingTitle}>{listing.location}</h3>
                        <p style={styles.listingInfo}>
                          <strong>${listing.cost}</strong> per month
                        </p>
                        <p style={styles.listingInfo}>
                          Size: {listing.cubicFeet} sq ft
                        </p>
                        <div style={styles.descriptionBox}>
                          <p style={styles.description}>{listing.description}</p>
                        </div>
                        <p style={styles.listingInfo}>
                          <span style={{color: listing.isAvailable ? '#4caf50' : '#f44336'}}>
                            {listing.isAvailable ? '✓ Available' : '✗ Not Available'}
                          </span>
                        </p>
                        <p style={styles.listingInfo}>
                          Lender: {listing.lender}
                        </p>
                        <button 
                          style={styles.viewButton}
                          onClick={() => navigate(`/listing/${listing.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
    display: 'flex',
    flexDirection: 'column',
    width: '100%'
  },
  content: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%'
  },
  section: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  message: {
    color: '#666',
    marginBottom: '1rem'
  },
  error: {
    color: '#f44336'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  filters: {
    backgroundColor: '#f5f5f5',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  rangeInputs: {
    display: 'flex',
    gap: '0.5rem'
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '0.9rem'
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem'
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-4px)'
    }
  },
  listingImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  },
  listingDetails: {
    padding: '1.5rem'
  },
  listingTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: '#333'
  },
  listingInfo: {
    margin: '0.5rem 0',
    color: '#666'
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500'
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
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f68b1f'
    }
  },
  descriptionBox: {
    backgroundColor: '#f9f9f9',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
    marginBottom: '0.5rem'
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.4'
  }
};

export default ViewListings;
