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
        const { status, userType: currentUserType } = await checkAuthStatus();
        console.log(`ProtectedRoute - Auth check results: status=${status}, userType=${currentUserType}`);
        
        if (isMounted) {
          setAuthenticated(status);
          setUserType(currentUserType);
          setLoading(false);
          
          if (!status) {
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
          setLoading(false);
          setAuthenticated(false);
          navigate('/');
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
    
    // Check for userType in URL parameters first
    const params = new URLSearchParams(window.location.search);
    const urlUserType = params.get('userType');
    console.log('RedirectToUserDashboard - URL userType:', urlUserType);
    
    // Then check sessionStorage
    let userType = sessionStorage.getItem('userType');
    console.log('RedirectToUserDashboard - Session storage userType:', userType);
    console.log('RedirectToUserDashboard - All sessionStorage keys:', Object.keys(sessionStorage));
    
    // If not in sessionStorage, check localStorage as fallback
    if (!userType) {
      userType = localStorage.getItem('userType');
      console.log('RedirectToUserDashboard - Local storage userType:', userType);
      console.log('RedirectToUserDashboard - All localStorage keys:', Object.keys(localStorage));
      if (userType) {
        sessionStorage.setItem('userType', userType);
        console.log('RedirectToUserDashboard - Copied userType from localStorage to sessionStorage:', userType);
      }
    }
    
    // URL parameter takes precedence if available
    if (urlUserType) {
      userType = urlUserType;
      sessionStorage.setItem('userType', urlUserType);
      localStorage.setItem('userType', urlUserType);
      console.log('RedirectToUserDashboard - Set userType from URL parameter:', urlUserType);
      
      // Clean up the URL by removing the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    console.log('RedirectToUserDashboard - Final determined userType:', userType);
    
    // Only proceed if we have a valid user type
    if (userType === 'renter' || userType === 'lender') {
      console.log('RedirectToUserDashboard - Valid userType found:', userType);
      
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
      } else {
        // For lenders, always go to lender dashboard
        console.log('RedirectToUserDashboard - Navigating to /lender-dashboard for lender');
        navigate('/lender-dashboard');
      }
    } else {
      // If no valid user type, redirect to home
      console.log('RedirectToUserDashboard - No valid userType found, redirecting to home. Value:', userType);
      navigate('/');
    }
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
          <Route path="/map" element={<ProtectedRoute component={<Map />} allowedUserType="renter" />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/auth-debug" element={<AuthDebug />} />
          <Route path="/dashboard" element={<RedirectToUserDashboard />} />
          <Route path="/renter-dashboard" element={<ProtectedRoute component={<RenterDashboard />} allowedUserType="renter" />} />
          <Route path="/lender-dashboard" element={<ProtectedRoute component={<LenderDashboard />} allowedUserType="lender" />} />
          <Route path="/create-listing" element={<ProtectedRoute component={<CreateListing />} allowedUserType="renter" />} />
          <Route path="/edit-listing/:id" element={<ProtectedRoute component={<EditListing />} allowedUserType="renter" />} />
          <Route path="/view-listings" element={<ProtectedRoute component={<ViewListings />} allowedUserType="renter" />} />
          <Route path="/listing/:id" element={<ProtectedRoute component={<ListingDetailsRouter />} allowedUserType="renter" />} />
          <Route path="/lender-listing/:id" element={<ProtectedRoute component={<LenderListingDetails />} allowedUserType="lender" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
