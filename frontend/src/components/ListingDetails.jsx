import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useInterest } from '../context/InterestContext';
import Header from './Header';

const ListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { interestedListings, updateInterest } = useInterest();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interestedRenters, setInterestedRenters] = useState([]);

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        // Fetch listing details
        const listingResponse = await fetch(`http://localhost:8000/api/listings/${id}`, {
          credentials: 'include'
        });

        if (!listingResponse.ok) {
          throw new Error('Failed to fetch listing details');
        }

        const listingData = await listingResponse.json();
        setListing(listingData);

        // Check if user is interested
        const interestResponse = await fetch(`http://localhost:8000/api/listings/${id}/interest`, {
          credentials: 'include'
        });

        if (interestResponse.ok) {
          const interestData = await interestResponse.json();
          if (interestData.is_interested) {
            updateInterest(parseInt(id), true);
          }
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [id, updateInterest]);

  const handleInterestToggle = async () => {
    try {
      const isCurrentlyInterested = interestedListings.has(parseInt(id));
      const response = await fetch(`http://localhost:8000/api/listings/${id}/interest`, {
        method: isCurrentlyInterested ? 'DELETE' : 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update interest');
      }

      updateInterest(parseInt(id), !isCurrentlyInterested);
    } catch (err) {
      console.error('Error updating interest:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Storage Space Details" />
        <div style={styles.content}>
          <div style={styles.loading}>Loading listing details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Header title="Storage Space Details" />
        <div style={styles.content}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={styles.container}>
        <Header title="Storage Space Details" />
        <div style={styles.content}>
          <div style={styles.error}>Listing not found</div>
        </div>
      </div>
    );
  }

  const isInterested = interestedListings.has(parseInt(id));

  return (
    <div style={styles.container}>
      <Header title="Storage Space Details" />
      <div style={styles.content}>
        <button 
          style={styles.backButton} 
          onClick={() => navigate('/view-listings')}
        >
          ← Back to Listings
        </button>

        <div style={styles.detailsContainer}>
          <div style={styles.imageSection}>
            <img src={listing.image_url || '/assets/placeholder.jpg'} alt="Storage Space" style={styles.mainImage} />
          </div>

          <div style={styles.infoSection}>
            <h2 style={styles.location}>{listing.location}</h2>
            
            <div style={styles.specs}>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Cost:</span>
                <span style={styles.specValue}>${listing.cost_per_month}/month</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Size:</span>
                <span style={styles.specValue}>{listing.total_sq_ft} sq ft</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Description:</span>
                <span style={styles.specValue}>{listing.description}</span>
              </div>
            </div>

            <div style={styles.lenderInfo}>
              <h3>Owner Information</h3>
              <p><strong>Name:</strong> {listing.owner_name}</p>
              <button 
                style={{
                  ...styles.interestButton,
                  backgroundColor: isInterested ? '#4caf50' : '#f57c00'
                }}
                onClick={handleInterestToggle}
              >
                {isInterested ? '✓ Interested' : 'Show Interest'}
              </button>
            </div>

            <div style={styles.interestedRenters}>
              <h3>Other Interested Renters</h3>
              {interestedRenters.length > 0 ? (
                <div style={styles.rentersList}>
                  {interestedRenters.map((renter, index) => (
                    <div key={index} style={styles.renterItem}>
                      <div style={styles.renterHeader}>
                        <strong>{renter.name}</strong>
                        <span style={styles.renterStatus}>{renter.status}</span>
                      </div>
                      <div style={styles.renterDate}>
                        Interested since: {new Date(renter.dateInterested).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No other renters have shown interest yet.</p>
              )}
            </div>
          </div>
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
  backButton: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '2rem',
  },
  imageSection: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  location: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#333',
  },
  specs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  specLabel: {
    color: '#666',
    fontSize: '0.9rem',
  },
  specValue: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  lenderInfo: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  interestButton: {
    border: 'none',
    backgroundColor: '#f57c00',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '1rem',
    marginTop: '1rem',
  },
  interestedMessage: {
    color: '#4caf50',
    fontWeight: '500',
    marginTop: '1rem',
  },
  interestedRenters: {
    marginTop: '1rem',
  },
  rentersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  renterItem: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  renterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  renterStatus: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  renterDate: {
    color: '#666',
    fontSize: '0.9rem',
  },
};

export default ListingDetails;
