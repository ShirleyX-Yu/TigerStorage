import React, { useEffect, useState } from 'react';

const UserTypeDebug = () => {
  const [userType, setUserType] = useState('');
  
  useEffect(() => {
    // Get the current user type from sessionStorage
    const currentUserType = sessionStorage.getItem('userType');
    setUserType(currentUserType || 'not set');
    
    // Add event listener to detect changes to sessionStorage
    const handleStorageChange = () => {
      const updatedUserType = sessionStorage.getItem('userType');
      setUserType(updatedUserType || 'not set');
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const setRenterType = () => {
    sessionStorage.setItem('userType', 'renter');
    setUserType('renter');
  };
  
  const setLenderType = () => {
    sessionStorage.setItem('userType', 'lender');
    setUserType('lender');
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div>Current User Type: <strong>{userType}</strong></div>
      <div style={{ marginTop: '5px' }}>
        <button 
          onClick={setRenterType}
          style={{ marginRight: '5px', padding: '2px 5px', fontSize: '10px' }}
        >
          Set Renter
        </button>
        <button 
          onClick={setLenderType}
          style={{ padding: '2px 5px', fontSize: '10px' }}
        >
          Set Lender
        </button>
      </div>
    </div>
  );
};

export default UserTypeDebug;
