import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './Header';

const ListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInterestButton, setShowInterestButton] = useState(true);

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching details for listing ID: ${id}`);
        
        // Make sure we're using one of the mock IDs (101, 102, 103)
        // This is a temporary fix until the backend fully supports all IDs
        const validId = [101, 102, 103].includes(Number(id)) ? id : 101;
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${validId}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch listing details: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received listing data:', data);
        
        // Transform the data to match our component's expected format
        const formattedListing = {
          id: data.id,
          location: data.location,
          cost: data.cost,
          cubicFeet: data.cubic_feet,
          description: data.description,
          isAvailable: data.is_available,
          createdAt: data.created_at,
          contractLength: data.contract_length_months || 12, // Use default if not provided
          images: ['/assets/placeholder.jpg'], // default placeholder image
          lender: {
            name: `Owner #${data.owner_id}`, // Use owner ID as reference
            email: 'contact@tigerstorage.com' // Placeholder email
          },
          // Placeholder for interested renters - in a real app, this would come from the API
          interestedRenters: []
        };
        
        setListing(formattedListing);
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [id]);

  const handleShowInterest = () => {
    // TODO: Implement API call to register interest
    setShowInterestButton(false);
    // You would typically make an API call here to register the user's interest
  };

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

        {loading ? (
          <div style={styles.loadingContainer}>
            <p style={styles.loadingMessage}>Loading listing details...</p>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={styles.errorMessage}>{error}</p>
            <button 
              style={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : listing ? (
          <div style={styles.detailsContainer}>
            <div style={styles.imageSection}>
              <img src={listing.images[0]} alt="Storage Space" style={styles.mainImage} />
            </div>

            <div style={styles.infoSection}>
              <h2 style={styles.location}>{listing.location}</h2>
              
              <div style={styles.specs}>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Cost:</span>
                  <span style={styles.specValue}>${listing.cost}/month</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Size:</span>
                  <span style={styles.specValue}>{listing.cubicFeet} cubic feet</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Contract Length:</span>
                  <span style={styles.specValue}>{listing.contractLength} months</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specLabel}>Availability:</span>
                  <span style={{...styles.specValue, color: listing.isAvailable ? '#4caf50' : '#f44336'}}>
                    {listing.isAvailable ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>

              {listing.description && (
                <div style={styles.descriptionSection}>
                  <h3>Description</h3>
                  <p style={styles.description}>{listing.description}</p>
                </div>
              )}

              <div style={styles.lenderInfo}>
                <h3>Lender Information</h3>
                <p><strong>Name:</strong> {listing.lender.name}</p>
                <p><strong>Email:</strong> {listing.lender.email}</p>
                {showInterestButton && listing.isAvailable && (
                  <button 
                    style={styles.interestButton}
                    onClick={handleShowInterest}
                  >
                    Show Interest
                  </button>
                )}
                {!showInterestButton && (
                  <p style={styles.interestedMessage}>
                    ✓ You've shown interest in this listing
                  </p>
                )}
              </div>

              <div style={styles.interestedRenters}>
                <h3>Other Interested Renters</h3>
                {listing.interestedRenters.length > 0 ? (
                  <div style={styles.rentersList}>
                    {listing.interestedRenters.map((renter, index) => (
                      <div key={index} style={styles.renterItem}>
                        <div style={styles.renterHeader}>
                          <strong>{renter.name}</strong>
                          <span style={styles.renterStatus}>{renter.status}</span>
                        </div>
                        <div style={styles.renterContact}>
                          <span style={styles.renterEmail}>{renter.email}</span>
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
        ) : (
          <div style={styles.errorContainer}>
            <p style={styles.errorMessage}>Listing not found</p>
            <button 
              style={styles.retryButton}
              onClick={() => navigate('/view-listings')}
            >
              Return to Listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
  },
  loadingMessage: {
    fontSize: '1.2rem',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
    gap: '1rem',
  },
  errorMessage: {
    fontSize: '1.2rem',
    color: '#f44336',
  },
  retryButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  descriptionSection: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  description: {
    margin: 0,
    lineHeight: '1.5',
    color: '#555',
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
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
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
  renterContact: {
    fontSize: '0.9rem',
    color: '#666',
  },
  renterEmail: {
    textDecoration: 'underline',
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
