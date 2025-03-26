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
    window.location.href = '/ptonMap.html';
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/listings');
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        const data = await response.json();
        console.log('Fetched listings:', data);
        
        // transform the data to match our component's expected format
        const formattedListings = data.map(listing => ({
          id: listing.id,
          location: listing.location,
          cost: listing.cost,
          cubicFeet: listing.cubic_feet,
          contractLength: listing.contract_length_months,
          images: ['/assets/placeholder.jpg'], // default placeholder image
          lender: 'TigerStorage User' // default lender name
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

              <div style={styles.listings}>
                {filteredListings.length === 0 ? (
                  <div style={styles.noListings}>
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
                          Size: {listing.cubicFeet} cubic feet
                        </p>
                        <p style={styles.listingInfo}>
                          Contract: {listing.contractLength} months
                        </p>
                        <p style={styles.listingInfo}>
                          Lender: {listing.lender}
                        </p>
                        <button 
                          style={styles.contactButton}
                          onClick={() => navigate(`/listing/${listing.id}`)}
                        >
                          View Details & Contact
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
    backgroundColor: 'rgba(245, 124, 0, 0.1)'
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  mainContent: {
    display: 'flex',
    gap: '2rem'
  },
  filters: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginTop: '1rem',
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
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  listings: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-4px)',
    },
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
    margin: '0 0 1rem 0',
    fontSize: '1.2rem',
    color: '#333',
  },
  listingInfo: {
    margin: '0.5rem 0',
    color: '#666',
  },
  contactButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem',
    fontSize: '1rem',
    fontWeight: '500',
  },
  noListings: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    gridColumn: '1 / -1',
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
};

export default ViewListings;
