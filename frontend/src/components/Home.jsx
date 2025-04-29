import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../utils/auth';
import tiger_storage_logo from '../assets/tiger_storage_logo.png';
import cindytImg from '../assets/cindyt.jpeg';
import diyaImg from '../assets/diya.jpeg';
import shirleyImg from '../assets/shirley.jpeg';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [aboutUsModalOpen, setAboutUsModalOpen] = useState(false);
  
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
  
  // Show admin error if redirected from /admin
  useEffect(() => {
    if (location.state && location.state.adminError) {
      setErrorMessage('Access denied: Only verified admins can access the admin dashboard.');
      // Clear the state so it doesn't persist
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);
  
  const handleLogin = (userType) => {
    login(userType); // Always use the login utility, which handles CAS in production
  };

  return (
    <div className="home-container" style={{ 
      position: 'relative', 
      height: '100vh',
      background: `linear-gradient(135deg, #FFF8F1 0%, #FDF3EA 100%)`,
      overflow: 'hidden'
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.4,
        pointerEvents: 'none',
        background: `
          radial-gradient(circle at 10% 20%, #F8B88B 0%, transparent 20%),
          radial-gradient(circle at 90% 80%, #F8B88B 0%, transparent 20%),
          radial-gradient(circle at 50% 50%, #F47C2E 0%, transparent 30%),
          radial-gradient(circle at 80% 10%, #F8B88B 0%, transparent 15%)
        `
      }} />
      {/* Subtle grid pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.05,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(#4D2E1E 1px, transparent 1px),
          linear-gradient(90deg, #4D2E1E 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />

      {/* Content container with backdrop blur */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)'
      }}>
        <button
          className="home-privacy-button"
          style={{ position: 'absolute', top: 20, left: 30, zIndex: 1000 }}
          onClick={() => handleLogin('admin')}
          disabled={loading}
        >
          Admin Platform
        </button>
        <div style={{ 
          position: 'absolute',
          top: 20,
          right: 30,
          zIndex: 1000,
          display: 'flex',
          gap: '20px'
        }}>
          <button 
            className="home-privacy-button"
            onClick={() => setAboutUsModalOpen(true)}
            disabled={loading}
          >
            About Us
          </button>
          <button 
            className="home-privacy-button"
            onClick={() => setPrivacyModalOpen(true)}
            disabled={loading}
          >
            Privacy Policy
          </button>
        </div>
        <div className="home-content">
          {!logoError ? (
            <img 
              src={tiger_storage_logo} 
              alt="Logo" 
              className="home-logo"
              onError={() => setLogoError(true)}
              style={{ 
                background: '#FFFFFF',
                padding: '25px', 
                borderRadius: '12px',
                width: '240px',
                height: 'auto',
                marginBottom: '20px'
              }}
            />
          ) : (
            <div className="home-logo-fallback" style={{ background: '#DBA986', color: '#F5EFE6' }}>
              TS
            </div>
          )}
          <h1 className="home-title" style={{ 
            color: '#000000', 
            fontWeight: 700,
            marginBottom: '20px',
            fontSize: 'calc(1.8rem + 1vw)'
          }}>TigerStorage</h1>
          
          {errorMessage && (
            <div style={{
              backgroundColor: '#E66A6A',
              color: '#FFF8F1',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {errorMessage}
            </div>
          )}
          
          <div className="home-button-container" style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '900px'
          }}>
            <button 
              className="home-button" 
              onClick={() => handleLogin('renter')}
              disabled={loading}
              style={{ 
                flex: 1,
                maxWidth: '400px',
                padding: '20px',
                background: '#FFF8F1',
                border: '2px solid #F47C2E',
                color: '#4D2E1E',
                borderRadius: '12px',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  color: '#4D2E1E',
                  fontSize: 'calc(1.1rem + 0.5vw)', 
                  marginBottom: '0.5rem',
                  fontWeight: 600
                }}>
                  I am a space renter
                </div>
                <span style={{ 
                  color: '#6B5E54', 
                  fontWeight: 500,
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '15px'
                }}>Find secure, local storage for your stuff.</span>
                <div style={{ marginTop: '1rem' }}>
                  <img 
                    src="/assets/renter_icon.png"
                    alt="Renter Icon" 
                    style={{ 
                      width: '100px',
                      height: '100px',
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
              style={{ 
                flex: 1,
                maxWidth: '400px',
                padding: '20px',
                background: '#FFF8F1',
                border: '2px solid #F47C2E',
                color: '#4D2E1E',
                borderRadius: '12px',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ 
                  color: '#4D2E1E',
                  fontSize: 'calc(1.1rem + 0.5vw)', 
                  marginBottom: '0.5rem',
                  fontWeight: 600
                }}>
                  I am a space lender
                </div>
                <span style={{ 
                  color: '#6B5E54', 
                  fontWeight: 500,
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '15px'
                }}>Earn passive income by sharing your extra space.</span>
                <div style={{ marginTop: '1rem' }}>
                  <img 
                    src="/assets/lender_icon.png"
                    alt="Lender Icon" 
                    style={{ 
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain'
                    }} 
                  />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* About Us Modal */}
      <Dialog 
        open={aboutUsModalOpen} 
        onClose={() => setAboutUsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          style: { 
            borderRadius: 16, 
            background: '#FDF3EA',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          } 
        }}
      >
        <DialogTitle style={{ 
          background: '#F47C2E', 
          color: '#FFF8F1', 
          fontWeight: 700, 
          letterSpacing: 1, 
          padding: '16px 24px',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }}>
          About Us
        </DialogTitle>
        <DialogContent style={{ padding: '24px 32px', fontSize: '14px', lineHeight: '1.6' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ 
                color: '#4D2E1E', 
                fontSize: '24px', 
                fontWeight: 700, 
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Meet the Team Behind TigerStorage
              </h2>
              <p style={{ 
                marginBottom: '40px', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '16px',
                maxWidth: '600px',
                margin: '0 auto 48px'
              }}>
                We are a dedicated team of Princeton University Computer Science students committed to revolutionizing storage solutions for our campus community.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {/* Diya's Section */}
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  alignItems: 'flex-start',
                  padding: '24px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}>
                  <img 
                    src={diyaImg} 
                    alt="Diya Hundiwala" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '16px',
                      objectFit: 'cover',
                      flexShrink: 0,
                      background: '#f5f5f5',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <div>
                    <h3 style={{ 
                      color: '#333', 
                      fontSize: '20px', 
                      fontWeight: 600, 
                      marginBottom: '8px' 
                    }}>
                      Diya Hundiwala
                    </h3>
                    <p style={{ 
                      color: '#F47C2E', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      marginBottom: '16px'
                    }}>
                      Computer Science '27
                    </p>
                    <p style={{ color: '#6B5E54', lineHeight: '1.6' }}>
                      Diya brings her expertise in full-stack development and user experience design to TigerStorage. Originally from Pennsylvania, her passion for creating intuitive interfaces has been instrumental in making our platform user-friendly and accessible to all Princeton students.
                    </p>
                  </div>
                </div>

                {/* Cindy's Section */}
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  alignItems: 'flex-start',
                  padding: '24px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}>
                  <img 
                    src={cindytImg} 
                    alt="Cindy Tong" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '16px',
                      objectFit: 'cover',
                      flexShrink: 0,
                      background: '#f5f5f5',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <div>
                    <h3 style={{ 
                      color: '#333', 
                      fontSize: '20px', 
                      fontWeight: 600, 
                      marginBottom: '8px' 
                    }}>
                      Cindy Tong
                    </h3>
                    <p style={{ 
                      color: '#F47C2E', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      marginBottom: '16px'
                    }}>
                      Computer Science '27
                    </p>
                    <p style={{ color: '#6B5E54', lineHeight: '1.6' }}>
                      Cindy specializes in backend development and database management. Hailing from Ohio, her strong technical background ensures that TigerStorage operates smoothly and securely, providing reliable service to our users.
                    </p>
                  </div>
                </div>

                {/* Shirley's Section */}
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  alignItems: 'flex-start',
                  padding: '24px',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}>
                  <img 
                    src={shirleyImg} 
                    alt="Shirley Yu" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '16px',
                      objectFit: 'cover',
                      flexShrink: 0,
                      background: '#f5f5f5',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <div>
                    <h3 style={{ 
                      color: '#333', 
                      fontSize: '20px', 
                      fontWeight: 600, 
                      marginBottom: '8px' 
                    }}>
                      Shirley Yu
                    </h3>
                    <p style={{ 
                      color: '#F47C2E', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      marginBottom: '16px'
                    }}>
                      Computer Science '27
                    </p>
                    <p style={{ color: '#6B5E54', lineHeight: '1.6' }}>
                      Shirley leads the frontend development and system architecture of TigerStorage. Coming from British Columbia, Canada, her focus on creating seamless user experiences has helped shape our platform into an efficient and enjoyable storage solution.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section style={{ marginTop: '48px', marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Our Mission</h2>
              <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.6' }}>
                TigerStorage aims to revolutionize how Princeton students handle their storage needs. By creating a secure and efficient peer-to-peer marketplace, we're building a community-driven solution that makes storage more accessible and affordable for everyone on campus.
              </p>
            </section>

            <section>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Contact Us</h2>
              <p style={{ marginBottom: '16px', color: '#666', lineHeight: '1.6' }}>
                Have questions or suggestions? We'd love to hear from you! Reach out to us at <span style={{ color: '#F47C2E', fontWeight: 500 }}>cs-tigerstorage@princeton.edu</span>
              </p>
            </section>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', background: '#FDF3EA', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            onClick={() => setAboutUsModalOpen(false)} 
            style={{ 
              background: '#F47C2E', 
              color: '#FFF8F1', 
              fontWeight: 600,
              padding: '8px 24px',
              '&:hover': {
                background: '#F8B88B'
              }
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog 
        open={privacyModalOpen} 
        onClose={() => setPrivacyModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ 
          style: { 
            borderRadius: 16, 
            background: '#FDF3EA',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          } 
        }}
      >
        <DialogTitle style={{ 
          background: '#F47C2E', 
          color: '#FFF8F1', 
          fontWeight: 700, 
          letterSpacing: 1, 
          padding: '16px 24px',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }}>
          Privacy Policy
        </DialogTitle>
        <DialogContent style={{ padding: '24px 32px', fontSize: '14px', lineHeight: '1.6', background: '#FDF3EA' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ marginBottom: '24px' }}>
              Last Updated: <span style={{ color: '#4D2E1E', fontWeight: 500 }}>March 19, 2024</span>
            </p>

            <p style={{ marginBottom: '24px' }}>
              This Privacy Policy describes how TigerStorage ("we," "our," or "us") collects, uses, and shares your personal information when you use our storage space rental platform. By using TigerStorage, you agree to the collection and use of information in accordance with this policy.
            </p>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>1. Information Collection</h2>
              
              <h3 style={{ color: '#F47C2E', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>1.1 Information You Provide</h3>
              <p style={{ marginBottom: '16px' }}>We collect information you provide directly to us, including:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Princeton University NetID and affiliated email</li>
                <li style={{ marginBottom: '8px' }}>Name and contact information</li>
                <li style={{ marginBottom: '8px' }}>For lenders: Storage space details, location, and pricing information</li>
                <li style={{ marginBottom: '8px' }}>For renters: Storage requirements and preferences</li>
                <li style={{ marginBottom: '8px' }}>Communication with other users through our platform</li>
              </ul>

              <h3 style={{ color: '#F47C2E', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>1.2 Automatically Collected Information</h3>
              <p style={{ marginBottom: '16px' }}>When you use our platform, we automatically collect:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Log data (IP address, browser type, pages visited)</li>
                <li style={{ marginBottom: '8px' }}>Device information</li>
                <li style={{ marginBottom: '8px' }}>Usage information and preferences</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>2. Use of Information</h2>
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
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>3. Information Sharing</h2>
              <p style={{ marginBottom: '16px' }}>We share your information only in the following circumstances:</p>
              <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>
                <li style={{ marginBottom: '8px' }}>Between renters and lenders to facilitate transactions</li>
                <li style={{ marginBottom: '8px' }}>With service providers who assist in our operations</li>
                <li style={{ marginBottom: '8px' }}>When required by law or to protect rights</li>
                <li style={{ marginBottom: '8px' }}>With your consent</li>
              </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>4. Data Security</h2>
              <p style={{ marginBottom: '16px' }}>
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>5. Your Rights</h2>
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
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>6. Changes to This Policy</h2>
              <p style={{ marginBottom: '16px' }}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this policy.
              </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ color: '#4D2E1E', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>7. Contact Us</h2>
              <p style={{ marginBottom: '16px' }}>
                If you have any questions about this Privacy Policy or our practices, please contact the TigerStorage team at <span style={{ color: '#F47C2E' }}>cs-tigerstorage@princeton.edu</span>.
              </p>
            </section>
          </div>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', background: '#FDF3EA', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            onClick={() => setPrivacyModalOpen(false)} 
            style={{ 
              background: '#F47C2E', 
              color: '#FFF8F1', 
              fontWeight: 600,
              padding: '8px 24px',
              '&:hover': {
                background: '#F8B88B'
              }
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
