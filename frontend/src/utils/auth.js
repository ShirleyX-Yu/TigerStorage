// Authentication utility functions

import axios from 'axios';

// Get the API URL from environment variables with a fallback
const getApiUrl = () => {
  // Try to get from environment
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;
  
  // Check if we're in production based on hostname
  const isProduction = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('127.0.0.1');
  
  // Use production URL if in production, otherwise default to localhost
  return isProduction 
    ? 'https://tigerstorage-backend.onrender.com'
    : 'http://localhost:8000';
};

const API_URL = getApiUrl();
console.log('Using API URL:', API_URL);

// Check if backend is experiencing issues
const isBackendUnavailable = () => {
  // Check if we've recently had a backend issue
  const lastBackendError = localStorage.getItem('lastBackendError');
  if (!lastBackendError) return false;
  
  // If we've had an error in the last 10 seconds, consider backend unavailable
  const errorTime = parseInt(lastBackendError, 10);
  const now = Date.now();
  return now - errorTime < 10000; // 10 seconds
};

// Store backend error information
const recordBackendError = () => {
  localStorage.setItem('lastBackendError', Date.now().toString());
};

// Determine backend URL based on environment
const getBackendUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://tigerstorage-backend.onrender.com'
    : process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

export const login = (userType) => {
  console.log(`auth.js - login called with userType: ${userType}`);
  
  // Store the user type in both session and local storage
  sessionStorage.setItem('userType', userType);
  localStorage.setItem('userType', userType);
  console.log(`auth.js - Set userType in storage: ${userType}`);
  console.log(`auth.js - Storage verification - sessionStorage: ${sessionStorage.getItem('userType')}, localStorage: ${localStorage.getItem('userType')}`);
  
  // Calculate the redirect URL based on the user type
  let redirectUrl;
  if (userType === 'renter') {
    redirectUrl = "/map";
    console.log(`auth.js - User is renter, redirecting to: ${redirectUrl}`);
  } else if (userType === 'lender') {
    redirectUrl = "/lender-dashboard";
    console.log(`auth.js - User is lender, redirecting to: ${redirectUrl}`);
  } else {
    redirectUrl = "/";
    console.log(`auth.js - Invalid userType (${userType}), redirecting to home: ${redirectUrl}`);
  }
  
  console.log(`auth.js - Final redirect URL: ${redirectUrl}`);
  window.location.href = redirectUrl;
};

export const logout = () => {
  // Clear the user type from both session and local storage
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  
  // Get the logout URL
  const backendUrl = getBackendUrl();
  const logoutUrl = `${backendUrl}/auth/logout`;
  
  // Perform the redirect
  window.location.href = logoutUrl;
};

export const checkAuthStatus = async () => {
  try {
    console.log("Checking authentication status");
    const backendUrl = getBackendUrl();
    const response = await axios.get(`${backendUrl}/auth/status`, { withCredentials: true });
    
    console.log("Auth status response:", response.data);
    
    // Get the stored user type
    const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
    console.log("Stored user type:", userType);
    
    return { ...response.data, userType };
  } catch (error) {
    console.error("Error checking auth status:", error);
    
    // Set an auth error flag if the error is network-related
    if (error.message.includes('Network Error') || 
        error.response?.status === 502 || 
        error.response?.status === 503 || 
        error.response?.status === 504) {
      console.log("Setting auth error flag due to network issues");
      sessionStorage.setItem('authError', 'true');
    }
    
    // Return unauthenticated if there's an error
    const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
    return { authenticated: false, userType };
  }
};
