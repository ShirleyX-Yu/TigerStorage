import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
import CreateListing from './components/CreateListing';
import EditListing from './components/EditListing';
import ViewListings from './components/ViewListings';
import ListingDetails from './components/ListingDetails';
import PrivacyPolicy from './components/PrivacyPolicy';
import AuthDebug from './components/AuthDebug';
import { checkAuthStatus } from './utils/auth';
import './App.css';

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
    
    // Default to lender if userType is still not set or invalid
    if (userType !== 'renter' && userType !== 'lender') {
      userType = 'lender';
      sessionStorage.setItem('userType', 'lender');
      localStorage.setItem('userType', 'lender');
    }
    
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
      window.location.href = '/public/ptonMap.html';
    } else if (userType === 'renter' && skipMapRedirect) {
      // Clear the flag so future navigations work normally
      sessionStorage.removeItem('skipMapRedirect');
      navigate('/renter');
    } else {
      navigate('/lender');
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/welcome" element={<ProtectedRoute><RedirectToUserDashboard /></ProtectedRoute>} />
          <Route path="/renter" element={<ProtectedRoute><RenterDashboard /></ProtectedRoute>} />
          <Route path="/lender" element={<ProtectedRoute><LenderDashboard /></ProtectedRoute>} />
          <Route path="/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
          <Route path="/view-listings" element={<ProtectedRoute><ViewListings /></ProtectedRoute>} />
          <Route path="/auth-debug" element={<AuthDebug />} />
          <Route path="/listing/:id" element={<ProtectedRoute><ListingDetails /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
