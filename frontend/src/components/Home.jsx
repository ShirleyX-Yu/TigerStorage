import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
import './Home.css';

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
        navigate('/map');
      } else if (dashboardRedirect === 'lender') {
        navigate('/lender-dashboard');
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
    <div className="home-container">
      <div className="home-content">
        {!logoError ? (
          <img 
            src={tiger_storage_logo} 
            alt="Logo" 
            className="home-logo"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="home-logo-fallback">
            TS
          </div>
        )}
        <h1 className="home-title">Tiger Storage</h1>
        <div className="home-button-container">
          <button className="home-button" onClick={() => handleLogin('renter')}>
            I am a space renter.
          </button>
          <button className="home-button" onClick={() => handleLogin('lender')}>
            I am a space lender.
          </button>
        </div>
        <button 
          className="home-privacy-button"
          onClick={() => navigate('/privacy')}
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
};

export default Home;
