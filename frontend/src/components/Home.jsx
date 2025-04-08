import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
// Import the logo with a direct path
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
// Fallback image URL if the import fails
const logoUrl = '/src/assets/tiger_storage_logo.png';
// Text fallback if both image sources fail
const logoFallbackText = 'TS';

const Home = () => {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  
  // Check for dashboard redirect flag
  React.useEffect(() => {
    const dashboardRedirect = localStorage.getItem('dashboardRedirect');
    if (dashboardRedirect) {
      // Clear the flag
      localStorage.removeItem('dashboardRedirect');
      
      // Navigate to the appropriate dashboard
      if (dashboardRedirect === 'renter') {
        navigate('/renter');
      } else if (dashboardRedirect === 'lender') {
        navigate('/lender');
      }
    }
  }, [navigate]);
  
  const handleLogin = (userType) => {
    // Clear any existing user type first
    sessionStorage.removeItem('userType');
    // Set the new user type
    sessionStorage.setItem('userType', userType);
    // Proceed with login for both renters and lenders
    login(userType);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {!logoError ? (
          <img 
            src={tiger_storage_logo || logoUrl} 
            alt="Logo" 
            style={styles.logo} 
            onError={(e) => {
              if (e.target.src === tiger_storage_logo) {
                e.target.src = logoUrl;
              } else {
                // If both sources fail, show text fallback
                setLogoError(true);
              }
            }}
          />
        ) : (
          <div style={styles.logoFallback}>
            {logoFallbackText}
          </div>
        )}
        <h1 style={styles.title}>Tiger Storage</h1>
        <div style={styles.buttonContainer}>
          <button style={styles.button} onClick={() => handleLogin('renter')}>
            I am a space renter.
          </button>
          <button style={styles.button} onClick={() => handleLogin('lender')}>
            I am a space lender.
          </button>
        </div>
        <button 
          style={styles.privacyButton}
          onClick={() => navigate('/privacy')}
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  content: {
    textAlign: 'center',
    padding: '2rem',
    maxWidth: '600px',
  },
  logo: {
    width: '150px',
    marginBottom: '1.5rem',
  },
  logoFallback: {
    width: '150px',
    height: '150px',
    backgroundColor: '#FF8F00',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '3rem',
    margin: '0 auto',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2.5rem',
    color: '#333',
    marginBottom: '2rem',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  button: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#f57c00',
    },
  },
  privacyButton: {
    backgroundColor: 'transparent',
    color: '#666',
    border: 'none',
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default Home;
