import React from 'react';
import Header from './Header';

const LenderDashboard = ({ username }) => {
  return (
    <div style={styles.container}>
      <Header title="Lender Dashboard" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username}!
        </div>
        
        <div style={styles.section}>
          <h2>My Listed Spaces</h2>
          <div style={styles.placeholder}>
            No spaces listed yet. Start by adding your first storage space!
          </div>
          <button style={styles.actionButton}>
            Add Storage Space
          </button>
        </div>

        <div style={styles.section}>
          <h2>Current Rentals</h2>
          <div style={styles.placeholder}>
            No active rentals
          </div>
        </div>

        <div style={styles.section}>
          <h2>Earnings Overview</h2>
          <div style={styles.placeholder}>
            No earnings yet
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
    paddingBottom: '2rem'
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  welcome: {
    fontSize: '1.2em',
    marginBottom: '1rem',
    fontWeight: 500
  },
  section: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)'
    }
  },
  placeholder: {
    color: '#666',
    marginBottom: '1.5rem',
    fontSize: '1.1em'
  },
  actionButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#006B77'
    }
  }
};

export default LenderDashboard;
