import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';

const LenderListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interestedRenters, setInterestedRenters] = useState([]);

  useEffect(() => {
    console.log('LenderListingDetails component mounted with ID:', id);
    
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('Invalid listing ID');
        }
        
        console.log(`Fetching details for listing ID: ${id}`);
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch listing details: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received listing data:', data);
        
        // Fetch interested renters
        const rentersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}/interested-renters`, {
          credentials: 'include'
        });
        
        if (!rentersResponse.ok) {
          throw new Error('Failed to fetch interested renters');
        }
        
        const rentersData = await rentersResponse.json();
        
        setListing({
          id: data.id,
          location: data.location,
          cost: data.cost,
          cubicFeet: data.cubic_feet,
          description: data.description,
          contractLength: data.contract_length_months,
          images: [data.image_url || '/assets/placeholder.jpg'],
          interestedRenters: rentersData.map(renter => ({
            id: renter.id,
            name: renter.username,
            email: `${renter.username}@princeton.edu`,
            dateInterested: renter.dateInterested,
            status: renter.status
          }))
        });
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
    
    return () => {
      console.log('LenderListingDetails component unmounted');
    };
  }, [id]);

  // Mock function to fetch interested renters
  // In a real app, this would be a separate API call
  const fetchInterestedRenters = async (listingId) => {
    try {
      // This would be a real API call in production
      // const response = await fetch(`${import.meta.env.VITE_API_URL}/api/listings/${listingId}/interested-renters`, {
      //   credentials: 'include'
      // });
      // const data = await response.json();
      // setInterestedRenters(data);
      
      // For now, we'll use mock data
      // In a real app, this would come from the backend
      const mockInterestedRenters = [
        {
          id: 1,
          name: 'John Doe',
          email: 'jdoe@princeton.edu',
          dateInterested: '2025-04-05',
          status: 'New'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jsmith@princeton.edu',
          dateInterested: '2025-04-06',
          status: 'New'
        }
      ];
      
      // Simulate API delay
      setTimeout(() => {
        setInterestedRenters(mockInterestedRenters);
      }, 500);
    } catch (error) {
      console.error('Error fetching interested renters:', error);
    }
  };

  // Simple render function for error state
  const renderError = () => (
    <div style={styles.errorContainer}>
      <h2>Error</h2>
      <p>{error}</p>
      <button style={styles.backButton} onClick={() => navigate('/lender')}>
        &larr; Back to Dashboard
      </button>
    </div>
  );

  // Simple render function for loading state
  const renderLoading = () => (
    <div style={styles.loadingContainer}>
      <p>Loading listing details...</p>
    </div>
  );

  // Simple render function for when listing is not found
  const renderNotFound = () => (
    <div style={styles.errorContainer}>
      <h2>Listing Not Found</h2>
      <p>Sorry, we couldn't find this listing. It may have been removed or is temporarily unavailable.</p>
      <button style={styles.backButton} onClick={() => navigate('/lender')}>
        &larr; Back to Dashboard
      </button>
    </div>
  );

  console.log('LenderListingDetails render state:', { loading, error, listing });

  return (
    <div style={styles.container}>
      <Header title="Storage Space Details" />
      <div style={styles.content}>
        <button 
          style={styles.backButton} 
          onClick={() => navigate('/lender')}
        >
          ← Back to Dashboard
        </button>

        {loading ? renderLoading() : error ? renderError() : !listing ? renderNotFound() : (
          <div style={styles.detailsContainer}>
            <div style={styles.imageSection}>
              <img 
                src={listing.images?.[0] || '/assets/placeholder.jpg'} 
                alt="Storage Space" 
                style={styles.mainImage} 
                onError={(e) => {
                  console.log('Image failed to load, using placeholder');
                  e.target.src = '/assets/placeholder.jpg';
                }}
              />
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
                  <span style={styles.specLabel}>Interested Renters:</span>
                  <span style={styles.specValue}>{listing.interestedRenters?.length || 0}</span>
                </div>
              </div>

              <div style={styles.descriptionSection}>
                <h3>Description</h3>
                <p style={styles.description}>{listing.description}</p>
              </div>

              <div style={styles.interestedRenters}>
                <h3>Interested Renters ({listing.interestedRenters?.length || 0})</h3>
                {listing.interestedRenters?.length === 0 ? (
                  <p>No renters have shown interest in this listing yet.</p>
                ) : (
                  <div style={styles.rentersList}>
                    {listing.interestedRenters.map(renter => (
                      <div key={renter.id} style={styles.renterItem}>
                        <div style={styles.renterHeader}>
                          <h4 style={styles.renterName}>{renter.name}</h4>
                          <span style={styles.renterStatus}>{renter.status}</span>
                        </div>
                        <p style={styles.renterContact}>
                          <a href={`mailto:${renter.email}`} style={styles.renterEmail}>
                            {renter.email}
                          </a>
                        </p>
                        <p style={styles.renterDate}>
                          Interested since: {new Date(renter.dateInterested).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={styles.actionSection}>
                <button 
                  style={styles.editButton}
                  onClick={() => navigate(`/edit-listing/${listing.id}`)}
                >
                  Edit Listing
                </button>
              </div>
            </div>
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
    justifyContent: 'space-between',
  },
  renterName: {
    margin: 0,
    fontSize: '1.1rem',
  },
  renterStatus: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  renterContact: {
    fontSize: '0.9rem',
    color: '#666',
    margin: 0,
  },
  renterDate: {
    fontSize: '0.9rem',
    color: '#666',
    margin: 0,
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1rem',
  },
  editButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
  },
  renterEmail: {
    color: '#333',
    textDecoration: 'none',
  },
};

export default LenderListingDetails;
