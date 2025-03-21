import React from 'react';
import tiger_storage_logo from './tiger_storage_logo.png'; // Make sure your logo image is in the src folder or adjust the path accordingly

const Home = () => {
  return (
    <div style={styles.container}>
      <img src={tiger_storage_logo} alt="Logo" style={styles.logo} />
      <h1 style={styles.title}>Tiger Storage</h1>
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => console.log('Button 1 clicked')}>
          I am a space renter.
        </button>
        <button style={styles.button} onClick={() => console.log('Button 2 clicked')}>
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
  },
};

export default Home;
