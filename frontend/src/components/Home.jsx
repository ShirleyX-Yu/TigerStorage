import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  
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
      
      // Get the user type
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
      console.log(`Current userType from storage: ${userType}`);
      
      // Navigate to the appropriate dashboard
      if (userType === 'renter') {
        console.log("Redirecting to /map for renter");
        navigate('/map');
      } else if (userType === 'lender') {
        console.log("Redirecting to /lender-dashboard for lender");
        navigate('/lender-dashboard');
      } else {
        console.log("No valid userType found, remaining on home page");
      }
    } else {
      console.log("No dashboard redirect flag found");
    }
  }, [navigate]);
  
  const handleLogin = (userType) => {
    console.log('handleLogin called with userType:', userType);
    
    // Set loading state
    setLoading(true);
    
    // Clear any existing user type first
    sessionStorage.removeItem('userType');
    localStorage.removeItem('userType');
    console.log('Cleared existing userType from storage');
    
    // Set the new user type
    sessionStorage.setItem('userType', userType);
    localStorage.setItem('userType', userType);
    console.log('Set new userType in storage:', userType);
    
    try {
      // Navigate to the appropriate dashboard
      if (userType === 'renter') {
        navigate('/renter-dashboard');
      } else if (userType === 'lender') {
        navigate('/lender-dashboard');
      }
    } catch (error) {
      console.error('Error during navigation:', error);
      setErrorMessage('There was an error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="home-container" style={{ position: 'relative', minHeight: '100vh' }}>
      <button
        style={{
          position: 'absolute',
          top: 20,
          left: 30,
          zIndex: 1000,
          background: '#24292f',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 18px',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}
        onClick={() => navigate('/admin')}
        disabled={loading}
      >
        Admin Platform
      </button>
      <button 
        className="home-privacy-button"
        onClick={() => setPrivacyModalOpen(true)}
        disabled={loading}
        style={{
          position: 'absolute',
          top: 20,
          right: 30,
          zIndex: 1000,
        }}
      >
        Privacy Policy
      </button>
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
        <h1 className="home-title">TigerStorage</h1>
        
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
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                I am a space renter
              </div>
              <span>Find secure, local storage for your stuff.</span>
              <div style={{ marginTop: '1rem' }}>
                <img 
                  src="/assets/renter_icon.png"
                  alt="Renter Icon" 
                  style={{ 
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            </div>
          </button>
          <button 
            className="home-button" 
            onClick={() => handleLogin('lender')}
            disabled={loading}
          >
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                I am a space lender
              </div>
              <span>Earn passive income by sharing your extra space.</span>
              <div style={{ marginTop: '1rem' }}>
                <img 
                  src="/assets/lender_icon.png"
                  alt="Lender Icon" 
                  style={{ 
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain'
                  }} 
                />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <Dialog 
        open={privacyModalOpen} 
        onClose={() => setPrivacyModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          style: { 
            borderRadius: 16, 
            background: '#fff8f1',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          } 
        }}
      >
        <DialogTitle style={{ 
          background: '#FF6B00', 
          color: 'white', 
          fontWeight: 700, 
          letterSpacing: 1, 
          padding: '16px 24px',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }}>
          Privacy Policy
        </DialogTitle>
        <DialogContent style={{ padding: '24px 32px', fontSize: '14px', lineHeight: '1.6' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ marginBottom: '24px' }}>
              Last Updated: March 19, 2024
            </p>

            <p style={{ marginBottom: '24px' }}>
              This Privacy Policy describes how TigerStorage ("we," "our," or "us") collects, uses, and shares your personal information when you use our storage space rental platform. By using TigerStorage, you agree to the collection and use of information in accordance with this policy.
            </p>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>1. Information Collection</h2>
              
              <h3 style={{ color: '#444', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>1.1 Information You Provide</h3>
              <p style={{ marginBottom: '16px' }}>We collect information you provide directly to us, including:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Princeton University NetID and affiliated email</li>
                <li style={{ marginBottom: '8px' }}>Name and contact information</li>
                <li style={{ marginBottom: '8px' }}>For lenders: Storage space details, location, and pricing information</li>
                <li style={{ marginBottom: '8px' }}>For renters: Storage requirements and preferences</li>
                <li style={{ marginBottom: '8px' }}>Communication with other users through our platform</li>
              </ul>

              <h3 style={{ color: '#444', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>1.2 Automatically Collected Information</h3>
              <p style={{ marginBottom: '16px' }}>When you use our platform, we automatically collect:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Log data (IP address, browser type, pages visited)</li>
                <li style={{ marginBottom: '8px' }}>Device information</li>
                <li style={{ marginBottom: '8px' }}>Usage information and preferences</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>2. Use of Information</h2>
              <p style={{ marginBottom: '16px' }}>We use the collected information to:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Facilitate and manage storage space rentals</li>
                <li style={{ marginBottom: '8px' }}>Process transactions and send related notifications</li>
                <li style={{ marginBottom: '8px' }}>Verify Princeton University affiliation</li>
                <li style={{ marginBottom: '8px' }}>Provide customer support</li>
                <li style={{ marginBottom: '8px' }}>Improve and optimize our platform</li>
                <li style={{ marginBottom: '8px' }}>Ensure platform safety and security</li>
                <li style={{ marginBottom: '8px' }}>Comply with legal obligations</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>3. Information Sharing</h2>
              <p style={{ marginBottom: '16px' }}>We share your information only in the following circumstances:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Between renters and lenders to facilitate transactions</li>
                <li style={{ marginBottom: '8px' }}>With service providers who assist in our operations</li>
                <li style={{ marginBottom: '8px' }}>When required by law or to protect rights</li>
                <li style={{ marginBottom: '8px' }}>With your consent</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>4. Data Security</h2>
              <p style={{ marginBottom: '16px' }}>
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>5. Your Rights</h2>
              <p style={{ marginBottom: '16px' }}>You have the right to:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Access your personal information</li>
                <li style={{ marginBottom: '8px' }}>Correct inaccurate information</li>
                <li style={{ marginBottom: '8px' }}>Request deletion of your information</li>
                <li style={{ marginBottom: '8px' }}>Opt out of marketing communications</li>
                <li style={{ marginBottom: '8px' }}>Object to certain data processing</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>6. Changes to This Policy</h2>
              <p style={{ marginBottom: '16px' }}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this policy.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#333', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>7. Contact Us</h2>
              <p style={{ marginBottom: '16px' }}>
                If you have any questions about this Privacy Policy or our practices, please contact the TigerStorage team at <span style={{ color: '#FF6B00' }}>tigerstorage@princeton.edu</span>.
              </p>
            </section>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            onClick={() => setPrivacyModalOpen(false)} 
            style={{ 
              background: '#FF6B00', 
              color: 'white', 
              fontWeight: 600,
              padding: '8px 24px'
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Home;
