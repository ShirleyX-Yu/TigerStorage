import React from 'react';
import { logout } from '../utils/auth';

const LenderDashboard = ({ username }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Lender Dashboard</h1>
        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>
      
      <div style={styles.welcome}>
        Welcome back, {username}!
      </div>
      
      <div style={styles.content}>
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
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  welcome: {
    fontSize: '1.2em',
    marginBottom: '30px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  section: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  placeholder: {
    color: '#666',
    marginBottom: '15px',
  },
  actionButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
  },
  logoutButton: {
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default LenderDashboard;
