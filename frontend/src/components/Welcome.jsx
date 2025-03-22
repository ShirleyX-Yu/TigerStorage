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
      <h1>Welcome, {username}!</h1>
      <button style={styles.button} onClick={logout}>
        Logout
      </button>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '50px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '1em',
    cursor: 'pointer',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    marginTop: '20px',
  },
};

export default Welcome;
