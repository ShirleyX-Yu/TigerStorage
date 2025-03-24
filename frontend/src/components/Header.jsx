import React from 'react';
import { logout } from '../utils/auth';

const Header = ({ title }) => {
  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.leftSection}>
          <img src="/assets/tiger_storage_logo.png" alt="TigerStorage Logo" style={styles.logo} />
          <h1 style={styles.title}>{title}</h1>
        </div>
        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    padding: '1rem 0'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    height: '40px'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#333'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default Header;
