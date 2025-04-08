// Authentication utility functions

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

export const login = async (userType) => {
  // Store the user type in session storage before redirecting
  sessionStorage.setItem('userType', userType);
  // Also store in localStorage as a backup since sessionStorage might be lost during redirects
  localStorage.setItem('userType', userType);
  
  // Add the user type as a query parameter to preserve it through redirects
  window.location.href = `${API_URL}/api/auth/login?userType=${userType}`;
};

export const logout = async () => {
  // Clear user type from both storage types
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  window.location.href = `${API_URL}/api/auth/logout`;
};

export const checkAuthStatus = async () => {
  try {
    console.log('Checking auth status with API URL:', API_URL);
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Auth status response:', response.status);
    const data = await response.json();
    console.log('Auth status data:', data);
    
    if (data.authenticated) {
      // Add the stored user type to the auth data
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
      return {
        ...data,
        userType
      };
    }
    
    // If not authenticated, try to redirect to login
    console.log('Not authenticated, redirecting to login');
    return { authenticated: false };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false };
  }
};
