import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../utils/auth';

const RenterInterestContext = createContext();

export function useRenterInterest() {
  return useContext(RenterInterestContext);
}

export function RenterInterestProvider({ children }) {
  const [interestedListings, setInterestedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInterestedListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userType = sessionStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      const response = await axiosInstance.get('/api/my-interested-listings', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': username
        }
      });
      setInterestedListings(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterestedListings();
  }, [fetchInterestedListings]);

  return (
    <RenterInterestContext.Provider value={{ interestedListings, loading, error, refreshInterestedListings: fetchInterestedListings }}>
      {children}
    </RenterInterestContext.Provider>
  );
} 