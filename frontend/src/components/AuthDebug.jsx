import React, { useState, useEffect } from 'react';
import { checkAuthStatus } from '../utils/auth';

const AuthDebug = () => {
  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState({});

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
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login?userType=lender`;
  };

  return (
    <div style={styles.container}>
      <h2>Authentication Debug</h2>
      
      {loading ? (
        <p>Loading authentication status...</p>
      ) : (
        <div>
          <div style={styles.section}>
            <h3>Authentication Status</h3>
            <pre style={styles.code}>{JSON.stringify(authData, null, 2)}</pre>
          </div>
          
          <div style={styles.section}>
            <h3>Session Information</h3>
            <pre style={styles.code}>{JSON.stringify(sessionInfo, null, 2)}</pre>
          </div>
          
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
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '20px',
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    overflow: 'auto',
  },
  button: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '5px 10px 5px 0',
  }
};

export default AuthDebug;
