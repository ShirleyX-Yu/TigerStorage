import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Check for dashboard redirect flag
  React.useEffect(() => {
    console.log("Home component mounted, checking for redirect flag");
    
    // Check for auth errors
    const authError = sessionStorage.getItem('authError');
    if (authError) {
      console.log("Auth error detected");
      setErrorMessage("Authentication service is currently unavailable. Please try again later.");
      // Clear the error so it doesn't persist
      sessionStorage.removeItem('authError');
    }
    
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
  
  const handleLogin = (userType) => {
    console.log('handleLogin called with userType:', userType);
    
    // Clear any existing user type first
    sessionStorage.removeItem('userType');
    localStorage.removeItem('userType');
    console.log('Cleared existing userType from storage');
    
    // Set the new user type and call login
    sessionStorage.setItem('userType', userType);
    localStorage.setItem('userType', userType);
    console.log('Set new userType in storage:', userType);
    console.log('SessionStorage after setting:', sessionStorage.getItem('userType'));
    console.log('LocalStorage after setting:', localStorage.getItem('userType'));
    
    // Set dashboard redirect flag in local storage
    localStorage.setItem('dashboardRedirect', 'true');
    console.log('Set dashboardRedirect flag in localStorage');
    
    login(userType);
    console.log('Called login function with userType:', userType);
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
        
        {errorMessage && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {errorMessage}
          </div>
        )}
        
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
