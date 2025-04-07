import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
import CreateListing from './components/CreateListing';
import ViewListings from './components/ViewListings';
import ListingDetails from './components/ListingDetails';
import PrivacyPolicy from './components/PrivacyPolicy';
import { checkAuthStatus } from './utils/auth';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const [authData, setAuthData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const verifyAuth = async () => {
      const status = await checkAuthStatus();
      setAuthData(status);
      setLoading(false);
    };
    verifyAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authData?.authenticated) {
    return <Navigate to="/" />;
  }

  return React.cloneElement(children, { username: authData.username });
};

const RedirectToUserDashboard = () => {
  const [redirected, setRedirected] = React.useState(false);
  
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
    
    // Redirect to the map page using window.location
    window.location.href = '/public/ptonMap.html';
  }, []);
  
  return <div>Redirecting to map...</div>;
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
          <Route path="/view-listings" element={<ProtectedRoute><ViewListings /></ProtectedRoute>} />
          <Route path="/listing/:id" element={<ProtectedRoute><ListingDetails /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
