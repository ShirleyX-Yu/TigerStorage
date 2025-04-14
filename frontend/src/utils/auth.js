// Authentication utility functions

// Get the API URL from environment variables with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const login = async (userType) => {
  console.log('Login called with userType:', userType); // Debug log
  // Store the user type in session storage before redirecting
  sessionStorage.setItem('userType', userType);
  console.log('Session storage after setting userType:', sessionStorage.getItem('userType')); // Debug log
  // Also store in localStorage as a backup since sessionStorage might be lost during redirects
  localStorage.setItem('userType', userType);
  console.log('Local storage after setting userType:', localStorage.getItem('userType')); // Debug log
  
  // Add the user type as a query parameter to preserve it through redirects
  const redirectPath = userType === 'renter' ? '/map' : '/lender-dashboard';
  console.log('Redirecting to:', redirectPath); // Debug log
  window.location.href = `${API_URL}/api/auth/login?userType=${userType}&redirect=${redirectPath}`;
};

export const logout = async () => {
  // Clear user type from both storage types
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  window.location.href = `${API_URL}/api/auth/logout`;
};

export const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to check auth status');
    }
    
    const data = await response.json();
    
    // Get user type from sessionStorage or localStorage
    const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
    
    return {
      ...data,
      userType
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    throw error;
  }
};
