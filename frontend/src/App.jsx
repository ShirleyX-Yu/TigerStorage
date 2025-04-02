import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { InterestProvider } from './context/InterestContext';
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
  const userType = sessionStorage.getItem('userType');
  return <Navigate to={userType === 'renter' ? '/renter' : '/lender'} replace />;
};

function App() {
  return (
    <Router>
      <InterestProvider>
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
      </InterestProvider>
    </Router>
  );
}

export default App;
