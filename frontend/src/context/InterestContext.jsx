import React, { createContext, useState, useContext, useEffect } from 'react';

const InterestContext = createContext();

export const InterestProvider = ({ children }) => {
  const [interestedListings, setInterestedListings] = useState(new Set());

  const updateInterest = (listingId, isInterested) => {
    setInterestedListings(prev => {
      const newSet = new Set(prev);
      if (isInterested) {
        newSet.add(listingId);
      } else {
        newSet.delete(listingId);
      }
      return newSet;
    });
  };

  return (
    <InterestContext.Provider value={{ interestedListings, updateInterest }}>
      {children}
    </InterestContext.Provider>
  );
};

export const useInterest = () => {
  const context = useContext(InterestContext);
  if (!context) {
    throw new Error('useInterest must be used within an InterestProvider');
  }
  return context;
};
