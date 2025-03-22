import React from 'react';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';

const Home = () => {
  const handleLogin = (userType) => {
    login(userType);
  };

  return (
    <div style={styles.container}>
      <img src={tiger_storage_logo} alt="Logo" style={styles.logo} />
      <h1 style={styles.title}>Tiger Storage</h1>
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => handleLogin('renter')}>
          I am a space renter.
        </button>
        <button style={styles.button} onClick={() => handleLogin('lender')}>
          I am a space lender.
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '50px',
  },
  logo: {
    width: '150px',
    height: 'auto',
  },
  title: {
    fontSize: '2em',
    margin: '20px 0',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '1em',
    cursor: 'pointer',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    transition: 'background-color 0.3s',
  },
};

export default Home;
