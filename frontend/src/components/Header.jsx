import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
// Import the logo with a direct path
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
// Fallback to a simple text if both imports fail
const logoFallbackText = 'TS';

const Header = ({ title }) => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState(sessionStorage.getItem('userType'));
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Update userType when it changes in sessionStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setUserType(sessionStorage.getItem('userType'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // console.error('Logout failed:', error);
      // Fallback: Clear storage and redirect to login page manually
      sessionStorage.removeItem('userType');
      localStorage.removeItem('userType');
      navigate('/');
    }
  };

  const handleGoToDashboard = () => {
    if (userType === 'renter') {
      // Set the skipMapRedirect flag to go straight to the dashboard
      sessionStorage.setItem('skipMapRedirect', 'true');
      navigate('/renter-dashboard');
    } else {
      navigate('/lender-dashboard');
    }
  };

  const handleGoToMap = () => {
    // Clear the skipMapRedirect flag
    sessionStorage.removeItem('skipMapRedirect');
    navigate('/map');
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        <div style={styles.leftSection}>
          {!logoError ? (
            <img 
              src={tiger_storage_logo} 
              alt="TigerStorage Logo" 
              onError={(e) => {
                e.target.onerror = null;
                setLogoError(true);
              }}
              style={{
                ...styles.logo,
                transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
              onClick={() => navigate('/')}
            />
          ) : (
            <div 
              style={{
                ...styles.logoFallback,
                transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseEnter={() => setIsLogoHovered(true)}
              onMouseLeave={() => setIsLogoHovered(false)}
              onClick={() => navigate('/')}
            >
              {logoFallbackText}
            </div>
          )}
          <div style={styles.titleSection}>
            <h1 style={styles.title}>{title}</h1>
          </div>
        </div>
        
        <div style={styles.navigationLinks}>
          {userType === 'renter' && (
            <>
              <button 
                style={window.location.pathname === '/map' ? styles.activeNavLink : styles.navLink} 
                onClick={handleGoToMap}
              >
                Map View
              </button>
              <button
                style={window.location.pathname === '/view-listings' ? styles.activeNavLink : styles.navLink}
                onClick={() => navigate('/view-listings')}
              >
                View Grid
              </button>
              <button 
                style={window.location.pathname === '/renter-dashboard' ? styles.activeNavLink : styles.navLink} 
                onClick={handleGoToDashboard}
              >
                Dashboard
              </button>
            </>
          )}
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
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
    maxWidth: '98%',
    margin: '0 auto',
    padding: '0 0.5rem'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#333'
  },
  logo: {
    height: '40px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  logoFallback: {
    height: '40px',
    width: '40px',
    backgroundColor: '#FF8F00',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  },
  navigationLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  navLink: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease'
  },
  activeNavLink: {
    padding: '0.5rem 1rem',
    backgroundColor: '#FF8F00',
    color: 'white',
    border: '1px solid #FF8F00',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease'
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
