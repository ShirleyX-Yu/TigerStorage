import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
import CreateListing from './components/CreateListing';
import EditListing from './components/EditListing';
import ViewListings from './components/ViewListings';
import RenterListingDetails from './components/RenterListingDetails';
import LenderListingDetails from './components/LenderListingDetails';
import PrivacyPolicy from './components/PrivacyPolicy';
import AuthDebug from './components/AuthDebug';
import Map from './components/Map';
import AdminPlatform from './components/AdminPlatform';
import { checkAuthStatus, login } from './utils/auth';
import { setCSRFToken } from './utils/csrf';
import './App.css';
import './index.css';
import { RenterInterestProvider } from './context/RenterInterestContext';

const ProtectedRoute = ({ component: Component, allowedUserType }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    
    console.log('ProtectedRoute - useEffect running, checking auth status for path:', location.pathname);
    
    const checkAuth = async () => {
      try {
        const { status, authenticated, userType: currentUserType, username: currentUsername } = await checkAuthStatus();
        console.log(`ProtectedRoute - Auth check results: status=${status}, authenticated=${authenticated}, userType=${currentUserType}, username=${currentUsername}, allowedUserType=${allowedUserType}`);
        
        if (isMounted) {
          // Consider authenticated if either status or authenticated is true
          const isAuthenticated = status === true || authenticated === true;
          setAuthenticated(isAuthenticated);
          setUserType(currentUserType);
          setUsername(currentUsername || 'Unknown'); // Set username from auth response
          
          if (!isAuthenticated) {
            console.log('ProtectedRoute - Not authenticated, redirecting to home');
            navigate('/');
          } else if (allowedUserType && currentUserType !== allowedUserType) {
            console.log(`ProtectedRoute - User type mismatch: current=${currentUserType}, allowed=${allowedUserType}, redirecting`);
            // Only redirect if the user type doesn't match the allowed type
            if (currentUserType === 'renter') {
              navigate('/map');
            } else if (currentUserType === 'lender') {
              navigate('/lender-dashboard');
            } else {
              navigate('/');
            }
          } else {
            console.log(`ProtectedRoute - Authentication successful for ${currentUserType}, staying on current page`);
            // User is authenticated and allowed, stay on the current page
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('ProtectedRoute - Auth check error:', error);
        
        if (isMounted) {
          // Get the userType from storage as a fallback
          const fallbackUserType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
          console.log('ProtectedRoute - Using fallback userType from storage:', fallbackUserType);
          
          // If we have a valid user type in storage, consider it authenticated
          if (fallbackUserType === 'renter' || fallbackUserType === 'lender') {
            console.log('ProtectedRoute - Valid fallback userType found, considering authenticated');
            setAuthenticated(true);
            setUserType(fallbackUserType);
            
            // Check if user type matches the allowed type
            if (allowedUserType && fallbackUserType !== allowedUserType) {
              console.log(`ProtectedRoute - Fallback user type mismatch: current=${fallbackUserType}, allowed=${allowedUserType}, redirecting`);
              if (fallbackUserType === 'renter') {
                navigate('/map');
              } else if (fallbackUserType === 'lender') {
                navigate('/lender-dashboard');
              }
            } else {
              console.log(`ProtectedRoute - Fallback authentication successful, staying on current page`);
              // User is authenticated and allowed with fallback, stay on current page
            }
          } else {
            // No valid user type in storage, consider unauthenticated
            console.log('ProtectedRoute - No valid fallback userType, redirecting to home');
            setAuthenticated(false);
            navigate('/');
          }
          
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
      console.log('ProtectedRoute - Component unmounted, cleanup performed');
    };
  }, [navigate, allowedUserType, location.pathname]);

  if (loading) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Loading...</div>;
  }

  if (!authenticated) {
    // Rendering a blank div since we're already redirecting
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Redirecting to login...</div>;
  }

  // User is authenticated and allowed, render the component
  return React.cloneElement(Component, { username, userType });
};

const RedirectToUserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(true);
  
  React.useEffect(() => {
    console.log('RedirectToUserDashboard - Starting redirection logic');
    console.log('RedirectToUserDashboard - Current URL:', window.location.href);
    
    const redirectToAppropriateView = (userType) => {
      console.log('RedirectToUserDashboard - Redirecting with userType:', userType);
      
      // Check if we have a return path from previous navigation
      const returnTo = sessionStorage.getItem('returnTo');
      console.log('RedirectToUserDashboard - Return path:', returnTo);
      
      if (returnTo) {
        // Clear the return path
        sessionStorage.removeItem('returnTo');
        // Navigate to the saved path
        console.log('RedirectToUserDashboard - Navigating to saved return path:', returnTo);
        navigate(returnTo);
        return;
      }
      
      // Always redirect to the appropriate dashboard based on user type
      if (userType === 'renter') {
        // Check if the user wants the map or dashboard view
        const skipMapRedirect = sessionStorage.getItem('skipMapRedirect');
        console.log('RedirectToUserDashboard - skipMapRedirect flag for renter:', skipMapRedirect);
        
        if (skipMapRedirect) {
          console.log('RedirectToUserDashboard - Navigating to /renter-dashboard - skipMapRedirect is set');
          navigate('/renter-dashboard');
        } else {
          console.log('RedirectToUserDashboard - Navigating to /map for renter');
          navigate('/map');
        }
      } else if (userType === 'lender') {
        // For lenders, always go to lender dashboard
        console.log('RedirectToUserDashboard - Navigating to /lender-dashboard for lender');
        navigate('/lender-dashboard');
      } else {
        // If invalid user type, redirect to home
        console.log('RedirectToUserDashboard - Invalid userType, redirecting to home. Value:', userType);
        navigate('/');
      }
    };
    
    const handleRedirect = async () => {
      try {
        setIsRedirecting(true);
        
        // First check for CAS ticket in URL (from CAS authentication)
        const params = new URLSearchParams(window.location.search);
        const ticket = params.get('ticket');
        if (ticket) {
          console.log('RedirectToUserDashboard - CAS ticket found in URL, checking user type from storage');
          // After CAS auth, we should have user type in storage already
          const storedUserType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
          if (storedUserType) {
            console.log('RedirectToUserDashboard - Using stored userType after CAS auth:', storedUserType);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            redirectToAppropriateView(storedUserType);
            return;
          }
        }
        
        // Then check for userType in URL parameters
        const urlUserType = params.get('userType');
        console.log('RedirectToUserDashboard - URL userType:', urlUserType);
        
        // If URL parameter is present, it takes precedence
        if (urlUserType) {
          console.log('RedirectToUserDashboard - Using userType from URL:', urlUserType);
          // Store it for future use
          sessionStorage.setItem('userType', urlUserType);
          localStorage.setItem('userType', urlUserType);
          
          // Clean up the URL by removing the query parameter
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirect based on this user type
          redirectToAppropriateView(urlUserType);
          return;
        }
        
        // Check existing storage
        console.log('RedirectToUserDashboard - Checking storage for userType');
        let userType = sessionStorage.getItem('userType');
        console.log('RedirectToUserDashboard - Session storage userType:', userType);
        
        if (!userType) {
          userType = localStorage.getItem('userType');
          console.log('RedirectToUserDashboard - Local storage userType:', userType);
          
          if (userType) {
            // Sync sessionStorage with localStorage
            sessionStorage.setItem('userType', userType);
            console.log('RedirectToUserDashboard - Copied userType from localStorage to sessionStorage:', userType);
          }
        }
        
        // If we have a user type from storage, use it
        if (userType === 'renter' || userType === 'lender') {
          console.log('RedirectToUserDashboard - Valid userType found in storage:', userType);
          redirectToAppropriateView(userType);
          return;
        }
        
        // If we still don't have a valid user type, try to get it from checkAuthStatus
        try {
          console.log('RedirectToUserDashboard - No valid userType in storage, checking auth status');
          const { userType: authUserType } = await checkAuthStatus();
          console.log('RedirectToUserDashboard - Auth status returned userType:', authUserType);
          
          if (authUserType === 'renter' || authUserType === 'lender') {
            // Update storage with the user type from auth
            sessionStorage.setItem('userType', authUserType);
            localStorage.setItem('userType', authUserType);
            console.log('RedirectToUserDashboard - Updated storage with userType from auth:', authUserType);
            
            redirectToAppropriateView(authUserType);
            return;
          }
        } catch (authError) {
          console.error('RedirectToUserDashboard - Error checking auth status:', authError);
          // Continue to fallback (redirect to home)
        }
        
        // If we still don't have a valid user type, redirect to home
        console.log('RedirectToUserDashboard - No valid userType found anywhere, redirecting to home');
        navigate('/');
      } catch (error) {
        console.error('RedirectToUserDashboard - Unexpected error:', error);
        navigate('/');
      } finally {
        setIsRedirecting(false);
      }
    };
    
    handleRedirect();
  }, [navigate, location.search]);
  
  if (isRedirecting) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Redirecting to dashboard...</div>;
  }
  
  return null;
};

// Add a new AdminProtectedRoute for admin access control
const AdminProtectedRoute = ({ component: Component }) => {
  const [loading, setLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [userType, setUserType] = React.useState(null);
  const [username, setUsername] = React.useState(null);
  const [error, setError] = React.useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const { status, authenticated, userType: currentUserType, username: currentUsername } = await checkAuthStatus();
        if (isMounted) {
          const isAuthenticated = status === true || authenticated === true;
          setAuthenticated(isAuthenticated);
          setUserType(currentUserType);
          setUsername(currentUsername || 'Unknown');

          if (!isAuthenticated) {
            // Store the current path for post-login redirect
            sessionStorage.setItem('redirectPath', '/admin');
            // Initiate CAS login for admin
            login('admin');
          } else if (currentUserType !== 'admin' || currentUsername !== 'cs-tigerstorage') {
            // Not the admin NetID
            setError('Access denied: Only verified admins can access the admin dashboard.');
            // Show error on home page
            navigate('/', { state: { adminError: true } });
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setAuthenticated(false);
          setLoading(false);
          // Store the current path for post-login redirect
          sessionStorage.setItem('redirectPath', '/admin');
          // Initiate CAS login for admin
          login('admin');
        }
      }
    };
    checkAuth();
    return () => { isMounted = false; };
  }, [navigate, location.pathname]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>Loading...</div>;
  }
  if (!authenticated || userType !== 'admin' || username !== 'cs-tigerstorage') {
    // Already redirected, but render nothing here
    return null;
  }
  return React.cloneElement(Component, { username, userType });
};

function App() {
  // Move redirectPath logic from inline script to here for CSP compliance
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath && redirectPath !== window.location.pathname) {
      sessionStorage.removeItem('redirectPath');
      window.history.replaceState(null, null, redirectPath);
    }
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.csrf_token) setCSRFToken(data.csrf_token);
      });
  }, []);

  return (
    <RenterInterestProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<RedirectToUserDashboard />} />
            
            {/* Renter routes */}
            <Route path="/map" element={<ProtectedRoute component={<Map />} allowedUserType="renter" />} />
            <Route path="/renter-dashboard" element={<ProtectedRoute component={<RenterDashboard />} allowedUserType="renter" />} />
            <Route path="/listing/:id" element={<ProtectedRoute component={<RenterListingDetails />} allowedUserType="renter" />} />
            
            {/* Lender routes */}
            <Route path="/lender-dashboard" element={<ProtectedRoute component={<LenderDashboard />} allowedUserType="lender" />} />
            <Route path="/create-listing" element={<ProtectedRoute component={<CreateListing />} allowedUserType="lender" />} />
            <Route path="/edit-listing/:id" element={<ProtectedRoute component={<EditListing />} allowedUserType="lender" />} />
            <Route path="/view-listings" element={<ProtectedRoute component={<ViewListings />} allowedUserType="renter" />} />
            <Route path="/lender-dashboard/listing/:id" element={<ProtectedRoute component={<LenderListingDetails />} allowedUserType="lender" />} />
            
            {/* Public routes */}
            <Route path="/admin" element={<AdminProtectedRoute component={<AdminPlatform />} />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/debug" element={<AuthDebug />} />
          </Routes>
        </div>
      </Router>
    </RenterInterestProvider>
  );
}

export default App;
