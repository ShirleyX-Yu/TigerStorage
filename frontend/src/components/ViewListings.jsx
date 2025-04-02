import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const ViewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openMap = () => {
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
        const formattedListings = data.map(listing => ({
          id: listing.id,
          location: listing.location,
          cost: listing.cost,
          cubicFeet: listing.cubic_feet,
          contractLength: listing.contract_length_months,
          images: ['/assets/placeholder.jpg'],
          lender: 'TigerStorage User'
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
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Available Storage Spaces</h2>
            <button style={styles.actionButton} onClick={openMap}>
              View Map
            </button>
          </div>

          {loading ? (
            <div style={styles.message}>Loading storage listings...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : (
            <div style={styles.mainContent}>
              <div style={styles.filters}>
                <h3>Filters</h3>
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
  }
};

export default ViewListings;
