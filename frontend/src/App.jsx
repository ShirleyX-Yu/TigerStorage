import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
import CreateListing from './components/CreateListing';
import EditListing from './components/EditListing';
import ViewListings from './components/ViewListings';
import ListingDetails from './components/ListingDetails';
import LenderListingDetails from './components/LenderListingDetails';
import PrivacyPolicy from './components/PrivacyPolicy';
import AuthDebug from './components/AuthDebug';
import Map from './components/Map';
import { checkAuthStatus, login } from './utils/auth';
import './App.css';
import './index.css';

const ProtectedRoute = ({ component: Component, allowedUserType }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    console.log('ProtectedRoute - useEffect running, checking auth status');
    
    const checkAuth = async () => {
      try {
        const { status, authenticated, userType: currentUserType } = await checkAuthStatus();
        console.log(`ProtectedRoute - Auth check results: status=${status}, authenticated=${authenticated}, userType=${currentUserType}`);
        
        if (isMounted) {
          // Consider authenticated if either status or authenticated is true
          const isAuthenticated = status === true || authenticated === true;
          setAuthenticated(isAuthenticated);
          setUserType(currentUserType);
          setLoading(false);
          
          if (!isAuthenticated) {
            console.log('ProtectedRoute - Not authenticated, redirecting to home');
            navigate('/');
          } else if (allowedUserType && currentUserType !== allowedUserType) {
            console.log(`ProtectedRoute - User type mismatch: current=${currentUserType}, allowed=${allowedUserType}, redirecting`);
            if (currentUserType === 'renter') {
              navigate('/map');
            } else if (currentUserType === 'lender') {
              navigate('/lender-dashboard');
            } else {
              navigate('/');
            }
          } else {
            console.log(`ProtectedRoute - Authentication successful for ${currentUserType}`);
          }
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
  }, [navigate, allowedUserType]);

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

  return React.cloneElement(Component, { username: userType });
};

const RedirectToUserDashboard = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Added debug logging
    console.log('RedirectToUserDashboard - Starting redirection logic');
    
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
        // First check for userType in URL parameters
        const params = new URLSearchParams(window.location.search);
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
      }
    };
    
    handleRedirect();
  }, [navigate]);
  
  return <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  }}>Redirecting to dashboard...</div>;
};

// Component to conditionally render the correct listing details view based on user type
const ListingDetailsRouter = () => {
  const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
  console.log(`ListingDetailsRouter - Current userType from storage: ${userType}`);
  
  if (!userType) {
    console.log('ListingDetailsRouter - No userType found, redirecting to home');
    return <Navigate to="/" />;
  }
  
  console.log(`ListingDetailsRouter - Rendering for userType: ${userType}`);
  return userType === 'lender' ? <LenderListingDetails /> : <ListingDetails />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<RedirectToUserDashboard />} />
          
          {/* Renter routes */}
          <Route path="/map" element={<ProtectedRoute component={<Map />} allowedUserType="renter" />} />
          <Route path="/renter-dashboard" element={<ProtectedRoute component={<RenterDashboard />} allowedUserType="renter" />} />
          <Route path="/listing/:id" element={<ProtectedRoute component={<ListingDetailsRouter />} />} />
          
          {/* Lender routes */}
          <Route path="/lender-dashboard" element={<ProtectedRoute component={<LenderDashboard />} allowedUserType="lender" />} />
          <Route path="/create-listing" element={<ProtectedRoute component={<CreateListing />} allowedUserType="lender" />} />
          <Route path="/edit-listing/:id" element={<ProtectedRoute component={<EditListing />} allowedUserType="lender" />} />
          <Route path="/view-listings" element={<ProtectedRoute component={<ViewListings />} allowedUserType="lender" />} />
          
          {/* Public routes */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/debug" element={<AuthDebug />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
