import React, { useState, useEffect } from 'react';
import { checkAuthStatus } from '../utils/auth';
import axios from 'axios';

const AuthDebug = () => {
  const [authData, setAuthData] = useState(null);
  const [backendSessionData, setBackendSessionData] = useState(null);
  const [listingsData, setListingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const status = await checkAuthStatus();
        setAuthData(status);
        
        // Get user type from sessionStorage
        const userType = sessionStorage.getItem('userType');
        const localUserType = localStorage.getItem('userType');
        
        setSessionInfo({
          sessionUserType: userType,
          localStorageUserType: localUserType,
          cookies: document.cookie
        });
        
        // Call the backend debug endpoint
        try {
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await axios.get(`${backendUrl}/api/debug-session`, {
            withCredentials: true
          });
          setBackendSessionData(response.data);
        } catch (err) {
          console.error('Error fetching backend session data:', err);
          setError(err.message);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/login?userType=lender`;
  };
  
  const fixSession = async () => {
    try {
      // This will force a new login with the lender user type
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const frontendUrl = window.location.origin;
      const redirectUri = encodeURIComponent(`${frontendUrl}/lender-dashboard`);
      
      // Store the user type before redirecting
      sessionStorage.setItem('userType', 'lender');
      localStorage.setItem('userType', 'lender');
      
      // Redirect to login with explicit type and redirect
      window.location.href = `${backendUrl}/api/auth/login?userType=lender&redirectUri=${redirectUri}`;
    } catch (err) {
      console.error('Error fixing session:', err);
      setError(err.message);
    }
  };
  
  const fetchListingsDirectly = async () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      // Use username parameter as a workaround if session auth fails
      const response = await axios.get(`${backendUrl}/api/my-listings?username=lender`, {
        withCredentials: true
      });
      setListingsData(response.data);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(`Listings error: ${err.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Authentication Debug</h2>
      
      {loading ? (
        <p>Loading authentication status...</p>
      ) : (
        <div>
          {error && (
            <div style={styles.errorSection}>
              <h3>Error</h3>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}
          
          <div style={styles.section}>
            <h3>Authentication Status</h3>
            <pre style={styles.code}>{JSON.stringify(authData, null, 2)}</pre>
          </div>
          
          <div style={styles.section}>
            <h3>Frontend Session Information</h3>
            <pre style={styles.code}>{JSON.stringify(sessionInfo, null, 2)}</pre>
          </div>
          
          {backendSessionData && (
            <div style={styles.section}>
              <h3>Backend Session Data</h3>
              <pre style={styles.code}>{JSON.stringify(backendSessionData, null, 2)}</pre>
            </div>
          )}
          
          {listingsData && (
            <div style={styles.section}>
              <h3>Listings Data</h3>
              <pre style={styles.code}>{JSON.stringify(listingsData, null, 2)}</pre>
            </div>
          )}
          
          <div style={styles.section}>
            <h3>Actions</h3>
            <button 
              style={styles.button}
              onClick={handleLogin}
            >
              Login as Lender
            </button>
            
            <button 
              style={styles.button}
              onClick={fixSession}
            >
              Fix Session & Login
            </button>
            
            <button 
              style={styles.button}
              onClick={() => {
                sessionStorage.setItem('userType', 'lender');
                localStorage.setItem('userType', 'lender');
                setSessionInfo({
                  ...sessionInfo,
                  sessionUserType: 'lender',
                  localStorageUserType: 'lender'
                });
              }}
            >
              Set User Type to Lender
            </button>
            
            <button 
              style={styles.button}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            
            <button 
              style={styles.button}
              onClick={fetchListingsDirectly}
            >
              Fetch Listings Directly
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif'
  },
  section: {
    marginBottom: '20px',
    padding: '15px',
    borderRadius: '5px',
    backgroundColor: '#f5f5f5'
  },
  errorSection: {
    marginBottom: '20px',
    padding: '15px',
    borderRadius: '5px',
    backgroundColor: '#ffebee'
  },
  errorText: {
    color: '#d32f2f'
  },
  code: {
    backgroundColor: '#f8f8f8',
    padding: '10px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  button: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default AuthDebug;
