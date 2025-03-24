import React from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

const RenterDashboard = ({ username }) => {
  const navigate = useNavigate();
  
  return (
    <div style={styles.container}>
      <Header title="Renter Dashboard" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username}!
        </div>
        
        <div style={styles.section}>
          <h2>Available Storage Spaces</h2>
          <div style={styles.placeholder}>
            Browse available storage spaces near you!
          </div>
          <button style={styles.actionButton} onClick={() => navigate('/view-listings')}>
            View Storage Listings
          </button>
        </div>

        <div style={styles.section}>
          <h2>My Current Rentals</h2>
          <div style={styles.placeholder}>
            No active rentals
          </div>
        </div>

        <div style={styles.section}>
          <h2>Rental History</h2>
          <div style={styles.placeholder}>
            No rental history
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
  placeholder: {
    color: '#666',
    marginBottom: '1rem',
  },
  actionButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
};

export default RenterDashboard;
