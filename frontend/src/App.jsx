import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { checkAuthStatus } from './utils/auth';
import './App.css';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const [authData, setAuthData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [redirecting, setRedirecting] = React.useState(false);

  React.useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Prevent multiple auth checks
        if (redirecting) return;
        
        const status = await checkAuthStatus();
        console.log('Auth status in ProtectedRoute:', status);
        setAuthData(status);
        
        if (!status.authenticated) {
          // Set redirecting flag to prevent loops
          setRedirecting(true);
          // Store the current path to return after login
          const currentPath = window.location.pathname;
          sessionStorage.setItem('returnTo', currentPath);
          console.log('Not authenticated, will redirect to home');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    verifyAuth();
  }, [redirecting]);

  if (loading) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>Loading...</div>;
  }

  if (!authData?.authenticated) {
    return <Navigate to="/" />;
  }

  return React.cloneElement(children, { username: authData.username });
};

const RedirectToUserDashboard = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    // Check for userType in URL parameters first
    const params = new URLSearchParams(window.location.search);
    const urlUserType = params.get('userType');
    
    // Then check sessionStorage
    let userType = sessionStorage.getItem('userType');
    
    // If not in sessionStorage, check localStorage as fallback
    if (!userType) {
      userType = localStorage.getItem('userType');
      if (userType) {
        sessionStorage.setItem('userType', userType);
      }
    }
    
    // URL parameter takes precedence if available
    if (urlUserType) {
      userType = urlUserType;
      sessionStorage.setItem('userType', urlUserType);
      localStorage.setItem('userType', urlUserType);
      
      // Clean up the URL by removing the query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Only proceed if we have a valid user type
    if (userType === 'renter' || userType === 'lender') {
      // Check if we have a return path from previous navigation
      const returnTo = sessionStorage.getItem('returnTo');
      
      if (returnTo) {
        // Clear the return path
        sessionStorage.removeItem('returnTo');
        // Navigate to the saved path
        navigate(returnTo);
        return;
      }
      
      // Check if we should skip the map redirect (coming from map view)
      const skipMapRedirect = sessionStorage.getItem('skipMapRedirect');
      
      // Navigate to the appropriate dashboard based on user type
      if (userType === 'renter' && !skipMapRedirect) {
        navigate('/map');
      } else {
        navigate('/lender-dashboard');
      }
    } else {
      // If no valid user type, redirect to home
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
  return userType === 'lender' ? <LenderListingDetails /> : <ListingDetails />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/auth-debug" element={<AuthDebug />} />
          <Route path="/dashboard" element={<RedirectToUserDashboard />} />
          <Route path="/renter-dashboard" element={<ProtectedRoute><RenterDashboard /></ProtectedRoute>} />
          <Route path="/lender-dashboard" element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
          <Route path="/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
          <Route path="/view-listings" element={<ProtectedRoute><ViewListings /></ProtectedRoute>} />
          <Route path="/listing/:id" element={<ListingDetailsRouter />} />
          <Route path="/lender-listing/:id" element={<ProtectedRoute><LenderListingDetails /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
