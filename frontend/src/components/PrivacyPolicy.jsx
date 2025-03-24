import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Privacy Policy</h1>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Information We Collect</h2>
          <p style={styles.text}>
            We collect information that you provide directly to us, including:
          </p>
          <ul style={styles.list}>
            <li>Princeton University NetID</li>
            <li>Email address</li>
            <li>Storage space information (for lenders)</li>
            <li>Storage preferences (for renters)</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>How We Use Your Information</h2>
          <p style={styles.text}>
            We use the information we collect to:
          </p>
          <ul style={styles.list}>
            <li>Facilitate storage space rentals</li>
            <li>Verify Princeton University affiliation</li>
            <li>Enable communication between renters and lenders</li>
            <li>Improve our services</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Data Security</h2>
          <p style={styles.text}>
            We implement appropriate security measures to protect your personal information.
            All data is encrypted and stored securely. We use Princeton's CAS authentication
            system to ensure secure access to your account.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact Us</h2>
          <p style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at:
            tigerstorage@princeton.edu
          </p>
        </div>

        <button 
          style={styles.backButton}
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
    padding: '2rem',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#333',
    marginBottom: '2rem',
    textAlign: 'center',
    fontSize: '2rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    color: '#444',
    marginBottom: '1rem',
    fontSize: '1.5rem',
  },
  text: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '1rem',
  },
  list: {
    color: '#666',
    lineHeight: '1.6',
    marginLeft: '2rem',
    marginBottom: '1rem',
  },
  backButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    marginTop: '1rem',
  },
};

export default PrivacyPolicy;
