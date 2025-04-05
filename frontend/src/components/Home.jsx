import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import tigerLogo from '../assets/tiger_storage_logo.png';

const Home = () => {
  const { login } = useAuth();

  const handleRenterClick = () => {
    login('renter');
  };

  const handleLenderClick = () => {
    login('lender');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#fff1f0',
      padding: '20px'
    }}>
      <img 
        src={tigerLogo} 
        alt="Tiger Storage Logo" 
        style={{ 
          width: '120px', 
          marginBottom: '20px' 
        }} 
      />
      
      <h1 style={{ 
        fontSize: '2.5rem', 
        color: '#333',
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        Tiger Storage
      </h1>

      <button
        onClick={handleRenterClick}
        style={{
          backgroundColor: '#f57c00',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          marginBottom: '15px',
          width: '250px',
          transition: 'background-color 0.3s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#ff9800'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#f57c00'}
      >
        I am a space renter.
      </button>

      <button
        onClick={handleLenderClick}
        style={{
          backgroundColor: '#f57c00',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          width: '250px',
          marginBottom: '40px',
          transition: 'background-color 0.3s'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#ff9800'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#f57c00'}
      >
        I am a space lender.
      </button>

      <Link 
        to="/privacy" 
        style={{
          color: '#666',
          textDecoration: 'none',
          fontSize: '0.9rem'
        }}
        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
      >
        Privacy Policy
      </Link>
    </div>
  );
};

export default Home;
