import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterest } from '../context/InterestContext';
import Header from './Header';

const ViewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { interestedListings, updateInterest } = useInterest();
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [spaceFilter, setSpaceFilter] = useState('all');

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/listings', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch listings');
        }
        
        const data = await response.json();
        setListings(data);
        
        // Check interest status for each listing
        for (const listing of data) {
          const interestResponse = await fetch(`http://localhost:8000/api/listings/${listing.id}/interest`, {
            credentials: 'include'
          });
          
          if (interestResponse.ok) {
            const interestData = await interestResponse.json();
            if (interestData.is_interested) {
              updateInterest(listing.id, true);
            }
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [updateInterest]);

  const handleInterestToggle = async (listingId) => {
    try {
      const isCurrentlyInterested = interestedListings.has(listingId);
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}/interest`, {
        method: isCurrentlyInterested ? 'DELETE' : 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update interest');
      }
      
      updateInterest(listingId, !isCurrentlyInterested);
    } catch (err) {
      console.error('Error updating interest:', err);
      setError(err.message);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = priceFilter === 'all' ||
                        (priceFilter === 'under50' && listing.cost < 50) ||
                        (priceFilter === '50to100' && listing.cost >= 50 && listing.cost <= 100) ||
                        (priceFilter === 'over100' && listing.cost > 100);
    
    const matchesSpace = spaceFilter === 'all' ||
                        (spaceFilter === 'small' && listing.space < 100) ||
                        (spaceFilter === 'medium' && listing.space >= 100 && listing.space <= 200) ||
                        (spaceFilter === 'large' && listing.space > 200);
    
    return matchesSearch && matchesPrice && matchesSpace;
  });

  return (
    <div style={styles.container}>
      <Header title="Available Storage Spaces" />
      <div style={styles.content}>
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="Search by location or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Prices</option>
            <option value="under50">Under $50/month</option>
            <option value="50to100">$50-$100/month</option>
            <option value="over100">Over $100/month</option>
          </select>
          
          <select
            value={spaceFilter}
            onChange={(e) => setSpaceFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Sizes</option>
            <option value="small">Small (&lt;100 sq ft)</option>
            <option value="medium">Medium (100-200 sq ft)</option>
            <option value="large">Large (&gt;200 sq ft)</option>
          </select>
        </div>

        {loading ? (
          <div style={styles.loading}>Loading listings...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : filteredListings.length > 0 ? (
          <div style={styles.grid}>
            {filteredListings.map(listing => (
              <div key={listing.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{listing.location}</h3>
                <p style={styles.cardDescription}>{listing.description}</p>
                <div style={styles.cardDetails}>
                  <span>💰 ${listing.cost}/month</span>
                  <span>📏 {listing.space} sq ft</span>
                </div>
                <div style={styles.cardFooter}>
                  <span>👤 {listing.owner}</span>
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => handleInterestToggle(listing.id)}
                      style={{
                        ...styles.interestButton,
                        backgroundColor: interestedListings.has(listing.id) ? '#4caf50' : '#f57c00'
                      }}
                    >
                      {interestedListings.has(listing.id) ? '✓ Interested' : 'Show Interest'}
                    </button>
                    <button
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      style={styles.viewButton}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.noListings}>No storage spaces found matching your criteria.</div>
        )}
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
  filters: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  select: {
    padding: '0.5rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.1rem',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '2rem',
    color: '#f44336',
    fontSize: '1.1rem',
  },
  noListings: {
    textAlign: 'center',
    padding: '2rem',
    color: '#666',
    fontSize: '1.1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 1rem 0',
    color: '#333',
  },
  cardDescription: {
    margin: '0 0 1rem 0',
    color: '#666',
    fontSize: '0.9rem',
  },
  cardDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    color: '#666',
    fontSize: '0.9rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#666',
    fontSize: '0.9rem',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  interestButton: {
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
  },
  viewButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
};

export default ViewListings;
