import React from 'react';
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

const ProtectedRoute = ({ children }) => {
  const [authData, setAuthData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [redirecting, setRedirecting] = React.useState(false);
  const [bypassMode, setBypassMode] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check for bypass mode
    const isBypassMode = sessionStorage.getItem('bypassAuth') === 'true' ||
                         localStorage.getItem('bypassAuth') === 'true' ||
                         import.meta.env.DEV;
    
    if (isBypassMode) {
      console.log("Bypass auth mode detected, skipping authentication check");
      setBypassMode(true);
      setLoading(false);
      
      // Get the user type
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
      
      setAuthData({
        authenticated: true,
        username: 'dev_user',
        userType,
        bypassMode: true
      });
      return;
    }
    
    // Regular auth flow
    const verifyAuth = async () => {
      try {
        // Prevent multiple auth checks
        if (redirecting) {
          console.log('Already redirecting, skipping auth check');
          return;
        }
        
        const status = await checkAuthStatus();
        console.log('Auth status in ProtectedRoute:', status);
        
        // If we got back bypassMode flag, set it locally
        if (status.bypassMode) {
          setBypassMode(true);
        }
        
        setAuthData(status);
        
        if (!status.authenticated) {
          // Set redirecting flag to prevent loops
          setRedirecting(true);
          // Update loading state immediately to prevent hanging
          setLoading(false);
          
          // Store the current path to return after login
          const currentPath = window.location.pathname;
          sessionStorage.setItem('returnTo', currentPath);
          console.log('Not authenticated, will redirect to login');
          
          // Get userType from sessionStorage or localStorage
          const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
          
          // Just immediately navigate to home if we don't have a valid user type
          if (userType !== 'renter' && userType !== 'lender') {
            console.error('Invalid user type:', userType);
            navigate('/');
            return;
          }
          
          // Redirect to login without await - prevents hanging
          console.log('Redirecting to login with userType:', userType);
          
          try {
            // Don't await this call since it won't resolve (it redirects)
            login(userType);
            
            // Set a fallback redirect in case login() doesn't redirect
            setTimeout(() => {
              console.log('Login redirect timeout reached, falling back to home page');
              navigate('/');
            }, 3000);
          } catch (error) {
            console.error('Error during login redirect:', error);
            // Fallback to home page if login redirect fails
            navigate('/');
          }
        } else {
          // Only update loading if we're not redirecting
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // Set loading to false on error to prevent hanging
        setLoading(false);
        
        // If backend is unavailable, enable bypass mode
        console.warn('Error during auth check. Enabling bypass mode.');
        setBypassMode(true);
        sessionStorage.setItem('bypassAuth', 'true');
        
        // Get user type for bypass mode
        const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
        
        setAuthData({
          authenticated: true,
          username: 'dev_user',
          userType,
          bypassMode: true
        });
      }
    };
    
    verifyAuth();
    
    // Cleanup function to prevent state updates after component unmounts
    return () => {
      console.log('ProtectedRoute cleanup');
    };
  }, [redirecting, navigate]);

  if (loading) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Loading...</div>;
  }

  // Show bypass mode indicator if in bypass mode
  if (bypassMode) {
    // Get the component with props
    const componentWithProps = React.cloneElement(children, { 
      username: authData?.username || 'dev_user' 
    });
    
    // Return the component with a bypass mode indicator
    return (
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'fixed',
          top: '5px',
          right: '5px',
          backgroundColor: 'rgba(255, 165, 0, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          Dev Mode (Auth Bypassed)
        </div>
        {componentWithProps}
      </div>
    );
  }

  if (!authData?.authenticated) {
    // Rendering a blank div since we're already redirecting
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Redirecting to login...</div>;
  }

  return React.cloneElement(children, { username: authData.username });
};

const RedirectToUserDashboard = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Added debug logging
    console.log('RedirectToUserDashboard - Starting redirection logic');
    
    // Check for userType in URL parameters first
    const params = new URLSearchParams(window.location.search);
    const urlUserType = params.get('userType');
    console.log('URL userType:', urlUserType);
    
    // Then check sessionStorage
    let userType = sessionStorage.getItem('userType');
    console.log('Session storage userType:', userType);
    
    // If not in sessionStorage, check localStorage as fallback
    if (!userType) {
      userType = localStorage.getItem('userType');
      console.log('Local storage userType:', userType);
      if (userType) {
        sessionStorage.setItem('userType', userType);
        console.log('Copied userType from localStorage to sessionStorage');
      }
    }
    
    // URL parameter takes precedence if available
    if (urlUserType) {
      userType = urlUserType;
      sessionStorage.setItem('userType', urlUserType);
      localStorage.setItem('userType', urlUserType);
      console.log('Set userType from URL parameter:', urlUserType);
      
      // Clean up the URL by removing the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Only proceed if we have a valid user type
    if (userType === 'renter' || userType === 'lender') {
      console.log('Valid userType found:', userType);
      
      // Check if we have a return path from previous navigation
      const returnTo = sessionStorage.getItem('returnTo');
      console.log('Return path:', returnTo);
      
      if (returnTo) {
        // Clear the return path
        sessionStorage.removeItem('returnTo');
        // Navigate to the saved path
        console.log('Navigating to saved return path:', returnTo);
        navigate(returnTo);
        return;
      }
      
      // Always redirect to the appropriate dashboard based on user type
      if (userType === 'renter') {
        // Check if the user wants the map or dashboard view
        const skipMapRedirect = sessionStorage.getItem('skipMapRedirect');
        console.log('skipMapRedirect flag for renter:', skipMapRedirect);
        
        if (skipMapRedirect) {
          console.log('Navigating to /renter-dashboard - skipMapRedirect is set');
          navigate('/renter-dashboard');
        } else {
          console.log('Navigating to /map for renter');
          navigate('/map');
        }
      } else {
        // For lenders, always go to lender dashboard
        console.log('Navigating to /lender-dashboard for lender');
        navigate('/lender-dashboard');
      }
    } else {
      // If no valid user type, redirect to home
      console.log('No valid userType found, redirecting to home');
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
  console.log('ListingDetailsRouter - userType:', userType);
  
  // For authenticated users, show appropriate view based on user type
  return userType === 'lender' ? <LenderListingDetails /> : <ListingDetails />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/auth-debug" element={<AuthDebug />} />
          <Route path="/dashboard" element={<RedirectToUserDashboard />} />
          <Route path="/renter-dashboard" element={<ProtectedRoute><RenterDashboard /></ProtectedRoute>} />
          <Route path="/lender-dashboard" element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
          <Route path="/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
          <Route path="/view-listings" element={<ProtectedRoute><ViewListings /></ProtectedRoute>} />
          <Route path="/listing/:id" element={<ProtectedRoute><ListingDetailsRouter /></ProtectedRoute>} />
          <Route path="/lender-listing/:id" element={<ProtectedRoute><LenderListingDetails /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
