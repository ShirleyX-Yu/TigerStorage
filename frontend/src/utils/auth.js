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
  
  // Force a small delay to ensure storage is set before redirect
  setTimeout(() => {
    // Double check storage values right before redirect
    console.log('Final check - Session storage userType:', sessionStorage.getItem('userType'));
    console.log('Final check - Local storage userType:', localStorage.getItem('userType'));
    window.location.href = `${API_URL}/api/auth/login?userType=${userType}&redirect=${redirectPath}`;
  }, 100);
};

export const logout = async () => {
  // Clear user type from both storage types
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userType');
  window.location.href = `${API_URL}/api/auth/logout`;
};

export const checkAuthStatus = async () => {
  try {
    console.log('checkAuthStatus called'); // Debug log
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include'
    });
    
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
    throw error;
  }
};
