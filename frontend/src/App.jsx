import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InterestProvider } from './context/InterestContext';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
import CreateListing from './components/CreateListing';
import ViewListings from './components/ViewListings';
import ListingDetails from './components/ListingDetails';
import PrivacyPolicy from './components/PrivacyPolicy';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return React.cloneElement(children, { username: user.username });
};

const RedirectToUserDashboard = () => {
  const { user } = useAuth();
  return <Navigate to={user?.userType === 'renter' ? '/renter' : '/lender'} replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <InterestProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/welcome" element={<PrivateRoute><RedirectToUserDashboard /></PrivateRoute>} />
              <Route path="/renter" element={<PrivateRoute><RenterDashboard /></PrivateRoute>} />
              <Route path="/lender" element={<PrivateRoute><LenderDashboard /></PrivateRoute>} />
              <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
              <Route path="/view-listings" element={<PrivateRoute><ViewListings /></PrivateRoute>} />
              <Route path="/listing/:id" element={<PrivateRoute><ListingDetails /></PrivateRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
            </Routes>
          </div>
        </InterestProvider>
      </Router>
    </AuthProvider>
  );
};

export default App;
