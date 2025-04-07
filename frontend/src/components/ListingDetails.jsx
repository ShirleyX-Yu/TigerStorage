import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './Header';

const ListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // This will be replaced with actual API data
  const [listing] = useState({
    id: id,
    location: 'Princeton University Campus',
    cost: 50,
    cubicFeet: 100,
    contractLength: 3,
    images: ['/assets/placeholder.jpg'],
    lender: {
      name: 'John Doe',
      email: 'johndoe@princeton.edu'
    },
    interestedRenters: [
      {
        name: 'Alice Johnson',
        email: 'alicej@princeton.edu',
        dateInterested: '2025-03-22',
        status: 'Interested'
      },
      {
        name: 'Bob Wilson',
        email: 'bwilson@princeton.edu',
        dateInterested: '2025-03-23',
        status: 'In Discussion'
      }
    ]
  });

  const [showInterestButton, setShowInterestButton] = useState(true);

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
            </div>

            <div style={styles.lenderInfo}>
              <h3>Lender Information</h3>
              <p><strong>Name:</strong> {listing.lender.name}</p>
              <p><strong>Email:</strong> {listing.lender.email}</p>
              {showInterestButton && (
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
