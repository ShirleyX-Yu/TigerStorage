import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import RenterDashboard from './components/RenterDashboard';
import LenderDashboard from './components/LenderDashboard';
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                {sessionStorage.getItem('userType') === 'renter' ? (
                  <RenterDashboard />
                ) : (
                  <LenderDashboard />
                )}
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
