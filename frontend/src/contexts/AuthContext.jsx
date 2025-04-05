import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuthStatus } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/user', { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
          setUser({
            username: data.username,
            userType: data.userType
          });
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = (userType) => {
    // Redirect to CAS login with userType
    window.location.href = `/cas/login?userType=${userType}`;
  };

  const logout = () => {
    // Redirect to CAS logout
    window.location.href = '/cas/logout';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 