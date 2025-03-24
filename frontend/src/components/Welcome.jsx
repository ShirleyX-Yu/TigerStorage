import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthStatus, logout } from '../utils/auth';

const Welcome = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAuth = async () => {
      const status = await checkAuthStatus();
      if (status.authenticated) {
        setUsername(status.username);
      } else {
        navigate('/');
      }
    };
    verifyAuth();
  }, [navigate]);

  if (!username) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Welcome, {username}!</h1>
        <button 
          style={styles.button} 
          onClick={logout}
        >
          Logout
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
    position: 'relative',
  },
  title: {
    fontSize: '2.5rem',
    color: '#333',
    marginBottom: '1rem',
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
    marginTop: '20px',
  },
};

export default Welcome;
