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

// Check if we're in production environment
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         !window.location.hostname.includes('127.0.0.1');
};

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

// Determine backend URL based on environment - now using the consistent API_URL
const getBackendUrl = () => {
  return API_URL;
};

export const login = (userType) => {
  console.log(`auth.js - login called with userType: ${userType}`);
  
  // Store the user type in both session and local storage
  sessionStorage.setItem('userType', userType);
  localStorage.setItem('userType', userType);
  console.log(`auth.js - Set userType in storage: ${userType}`);
  console.log(`auth.js - Storage verification - sessionStorage: ${sessionStorage.getItem('userType')}, localStorage: ${localStorage.getItem('userType')}`);
  
  // In production, use CAS authentication
  if (isProduction()) {
    // Calculate the CAS login URL
    const backendUrl = getBackendUrl();
    
    // Get the redirect URI from environment, or use default
    const redirectPath = import.meta.env.VITE_AUTH_REDIRECT_PATH || '/dashboard';
    const frontendUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    
    // Ensure we redirect back to our app after CAS auth with the user type preserved
    const redirectUri = encodeURIComponent(`${frontendUrl}${redirectPath}?userType=${userType}`);
    const casLoginUrl = `${backendUrl}/api/auth/login?userType=${userType}&redirectUri=${redirectUri}`;
    
    console.log(`auth.js - Production environment, redirecting to CAS: ${casLoginUrl}`);
    
    // Clear any existing auth errors before login
    sessionStorage.removeItem('authError');
    
    // Here we use window.location.replace instead of href to prevent browser history issues
    window.location.replace(casLoginUrl);
    return;
  }
  
  // For local development, just redirect directly
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
  window.location.replace(redirectUrl);
};

let isLoggingOut = false;

export const logout = () => {
  if (isLoggingOut) return; // Prevent double logout
  isLoggingOut = true;

  // Clear the user type from both session and local storage
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  
  // Get the logout URL
  const backendUrl = getBackendUrl();
  let logoutUrl = `${backendUrl}/api/auth/logout`;
  
  // Add redirect for production
  if (isProduction()) {
    const redirectUri = encodeURIComponent(window.location.origin);
    logoutUrl += `?redirectUri=${redirectUri}`;
  }
  
  console.log(`auth.js - Logging out, redirecting to: ${logoutUrl}`);
  
  // Perform the redirect
  window.location.href = logoutUrl;
};

export const checkAuthStatus = async () => {
  try {
    console.log("Checking authentication status");
    const backendUrl = getBackendUrl();
    
    // Define potential auth endpoints to try
    const authEndpoints = [
      `${backendUrl}/api/auth/status`,
      `${backendUrl}/auth/status`
    ];
    
    // Log cookies for debugging
    console.log('Cookies available during auth check:', document.cookie);
    
    // Try each endpoint in order
    let lastError = null;
    for (const endpoint of authEndpoints) {
      try {
        console.log(`Trying auth endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, { 
          withCredentials: true, // Critical for cross-domain cookies
          timeout: 5000, // Add timeout to prevent hanging requests
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        console.log("Auth status response:", response.data);
        
        // If the backend returned authenticated=true, use it
        if (response.data && response.data.authenticated) {
          // Update storage to match backend if different
          const backendUserType = response.data.userType;
          const backendUsername = response.data.username;
          
          if (backendUserType && backendUserType !== 'unknown') {
            console.log(`Updating stored userType to match backend: ${backendUserType}`);
            sessionStorage.setItem('userType', backendUserType);
            localStorage.setItem('userType', backendUserType);
          }
          
          // Store the actual username from CAS if available
          if (backendUsername) {
            console.log(`Storing actual username from backend: ${backendUsername}`);
            sessionStorage.setItem('username', backendUsername);
            localStorage.setItem('username', backendUsername);
          }
          
          return {
            authenticated: true,
            username: backendUsername || 'Unknown',
            userType: backendUserType || sessionStorage.getItem('userType') || localStorage.getItem('userType'),
            status: true
          };
        }
        
        // Get the stored user type and username
        const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
        const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
        console.log("Stored user type:", userType);
        console.log("Stored username:", storedUsername);
        
        // If backend says not authenticated but we have a user type, trust the frontend
        if (userType) {
          console.log("Backend says not authenticated but we have a user type, trusting frontend");
          return { 
            authenticated: true,
            username: storedUsername || userType, // Use stored username if available, otherwise userType
            userType, 
            status: true
          };
        } else {
          return {
            authenticated: false,
            username: null,
            userType: null,
            status: false
          };
        }
      } catch (error) {
        console.log(`Error with endpoint ${endpoint}:`, error.message);
        lastError = error;
        // Continue to next endpoint
      }
    }
    
    // If we got here, all endpoints failed
    throw lastError || new Error("All auth endpoints failed");
  } catch (error) {
    console.error("Error checking auth status:", error);
    recordBackendError();
    
    // Check if we have a valid user type in storage
    const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
    const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
    
    // If we have a user type stored, consider the user authenticated
    // This prevents being kicked back to the home page if API calls fail
    if (userType === 'renter' || userType === 'lender') {
      console.log("Using stored userType for authentication:", userType);
      return { 
        status: true, 
        authenticated: true,
        username: storedUsername || userType, // Use stored username if available 
        userType 
      };
    }
    
    // Set an auth error flag if the error is network-related
    if (error.message.includes('Network Error') || 
        error.response?.status === 404 ||
        error.response?.status === 502 || 
        error.response?.status === 503 || 
        error.response?.status === 504) {
      console.log("Setting auth error flag due to network or API issues");
      sessionStorage.setItem('authError', 'true');
    }
    
    // Return unauthenticated if we have no user type
    console.log("No valid userType in storage, returning unauthenticated");
    return { 
      status: false, 
      authenticated: false, 
      username: null,
      userType: null 
    };
  }
};
