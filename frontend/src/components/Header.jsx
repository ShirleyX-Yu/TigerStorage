import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';

const Header = ({ title }) => {
  const navigate = useNavigate();
  const userType = sessionStorage.getItem('userType');
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const handleLogoClick = () => {
    navigate(userType === 'renter' ? '/renter' : '/lender');
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.leftSection}>
          <img 
            src={tiger_storage_logo} 
            alt="TigerStorage Logo" 
            style={{
              ...styles.logo,
              transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
            }}
            onClick={handleLogoClick}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            role="button"
          />
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
    height: '40px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#333'
  },
  logoutButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default Header;
