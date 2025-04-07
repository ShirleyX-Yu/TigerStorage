// Authentication utility functions

// Get the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

export const login = async (userType) => {
  // Store the user type in session storage before redirecting
  sessionStorage.setItem('userType', userType);
  window.location.href = `${API_URL}/api/auth/login`;
};

export const logout = async () => {
  sessionStorage.removeItem('userType');
  window.location.href = `${API_URL}/api/auth/logout`;
};

export const checkAuthStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auth/status`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (data.authenticated) {
      // Add the stored user type to the auth data
      return {
        ...data,
        userType: sessionStorage.getItem('userType')
      };
    }
    return { authenticated: false };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false };
  }
};
