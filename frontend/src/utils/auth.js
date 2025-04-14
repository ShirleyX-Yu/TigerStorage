// Authentication utility functions

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

// Check if backend is reachable with a simple ping
const checkBackendAvailability = async (timeoutMs = 3000) => {
  try {
    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Try to fetch the status endpoint
    const response = await fetch(`${API_URL}/api/auth/status`, {
      method: 'HEAD',  // Just check headers, don't need body
      signal: controller.signal,
      credentials: 'include'
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.error('Backend availability check failed:', error);
    return false;
  }
};

// Determine if we should use development mode bypassing authentication
const shouldBypassAuth = () => {
  // Only use this in development mode or when explicitly set
  return import.meta.env.DEV || 
    localStorage.getItem('bypassAuth') === 'true' || 
    sessionStorage.getItem('bypassAuth') === 'true';
};

export const login = async (userType) => {
  console.log('Login called with userType:', userType); // Debug log
  
  if (!userType || (userType !== 'renter' && userType !== 'lender')) {
    console.error('Invalid user type:', userType);
    throw new Error('Invalid user type');
  }
  
  // Store the user type in session storage before redirecting
  sessionStorage.setItem('userType', userType);
  console.log('Session storage after setting userType:', sessionStorage.getItem('userType')); // Debug log
  
  // Also store in localStorage as a backup since sessionStorage might be lost during redirects
  localStorage.setItem('userType', userType);
  console.log('Local storage after setting userType:', localStorage.getItem('userType')); // Debug log
  
  // Add the user type as a query parameter to preserve it through redirects
  const redirectPath = userType === 'renter' ? '/map' : '/lender-dashboard';
  console.log('Redirecting to:', redirectPath); // Debug log
  
  try {
    // First check if backend is available
    const isBackendAvailable = await checkBackendAvailability(3000);
    
    if (!isBackendAvailable) {
      console.warn('Backend appears to be unavailable. Bypassing authentication.');
      
      // Store a flag to remember we bypassed auth
      sessionStorage.setItem('bypassAuth', 'true');
      
      // Directly redirect to the appropriate dashboard
      if (userType === 'renter') {
        window.location.href = '/map';
      } else {
        window.location.href = '/lender-dashboard';
      }
      return;
    }
    
    // Proceed with normal authentication if backend is available
    const authUrl = `${API_URL}/api/auth/login?userType=${userType}&redirect=${encodeURIComponent(redirectPath)}`;
    console.log('Auth URL:', authUrl);
    
    // Force a small delay to ensure storage is set before redirect
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Double check storage values right before redirect
    console.log('Final check - Session storage userType:', sessionStorage.getItem('userType'));
    console.log('Final check - Local storage userType:', localStorage.getItem('userType'));
    
    // Use window.location for a full page reload and redirect
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error during login redirect:', error);
    throw error;
  }
};

export const logout = async () => {
  // Clear user type from both storage types
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  sessionStorage.removeItem('bypassAuth');
  localStorage.removeItem('bypassAuth');
  
  // If we're in bypass mode, just redirect to home
  if (shouldBypassAuth()) {
    window.location.href = '/';
    return;
  }
  
  // Otherwise use normal logout
  window.location.href = `${API_URL}/api/auth/logout`;
};

export const checkAuthStatus = async () => {
  try {
    console.log('checkAuthStatus called'); // Debug log
    
    // Check if we should bypass auth in development mode
    if (shouldBypassAuth()) {
      console.log('Bypassing authentication check in development mode');
      
      // Get user type from sessionStorage or localStorage
      const sessionUserType = sessionStorage.getItem('userType');
      const localUserType = localStorage.getItem('userType');
      const userType = sessionUserType || localUserType;
      
      // Return mock authenticated status
      return {
        authenticated: true,
        username: 'dev_user',
        userType: userType || 'lender'
      };
    }
    
    // Try to fetch with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to check auth status');
    }
    
    const data = await response.json();
    console.log('Auth status response:', data); // Debug log
    
    // Get user type from sessionStorage or localStorage
    const sessionUserType = sessionStorage.getItem('userType');
    const localUserType = localStorage.getItem('userType');
    console.log('Session userType:', sessionUserType); // Debug log
    console.log('Local userType:', localUserType); // Debug log
    
    const userType = sessionUserType || localUserType;
    
    return {
      ...data,
      userType
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    
    // If we got an abort error (timeout), enable bypass mode
    if (error.name === 'AbortError') {
      console.warn('Auth check timed out. Enabling authentication bypass mode.');
      sessionStorage.setItem('bypassAuth', 'true');
      
      // Get user type from sessionStorage or localStorage
      const sessionUserType = sessionStorage.getItem('userType');
      const localUserType = localStorage.getItem('userType');
      const userType = sessionUserType || localUserType;
      
      // Return mock authenticated status
      return {
        authenticated: true,
        username: 'dev_user',
        bypassMode: true,
        userType: userType || 'lender'
      };
    }
    
    throw error;
  }
};
