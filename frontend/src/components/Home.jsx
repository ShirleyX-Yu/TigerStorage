import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Check for dashboard redirect flag
  React.useEffect(() => {
    console.log("Home component mounted, checking for redirect flag");
    const dashboardRedirect = localStorage.getItem('dashboardRedirect');
    if (dashboardRedirect) {
      console.log(`Found dashboardRedirect flag: ${dashboardRedirect}`);
      // Clear the flag
      localStorage.removeItem('dashboardRedirect');
      
      // Navigate to the appropriate dashboard
      if (dashboardRedirect === 'renter') {
        console.log("Redirecting to /map for renter");
        navigate('/map');
      } else if (dashboardRedirect === 'lender') {
        console.log("Redirecting to /lender-dashboard for lender");
        navigate('/lender-dashboard');
      }
    } else {
      console.log("No dashboard redirect flag found");
    }
  }, [navigate]);
  
  const handleLogin = async (userType) => {
    try {
      console.log(`handleLogin called with userType: ${userType}`);
      setLoading(true);
      
      // Clear any existing user type first
      sessionStorage.removeItem('userType');
      localStorage.removeItem('userType');
      
      // Set the new user type
      sessionStorage.setItem('userType', userType);
      localStorage.setItem('userType', userType);
      
      console.log(`userType set in storage, calling login function`);
      // Proceed with login for both renters and lenders
      login(userType);
      
      // Set a timeout to reset the loading state in case the redirect doesn't happen
      // This prevents the UI from being stuck in a loading state
      setTimeout(() => {
        console.log("Login redirect timeout reached, resetting loading state");
        setLoading(false);
      }, 5000);
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
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
          <button 
            className="home-button" 
            onClick={() => handleLogin('renter')}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'I am a space renter.'}
          </button>
          <button 
            className="home-button" 
            onClick={() => handleLogin('lender')}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'I am a space lender.'}
          </button>
        </div>
        <button 
          className="home-privacy-button"
          onClick={() => navigate('/privacy')}
          disabled={loading}
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
};

export default Home;
