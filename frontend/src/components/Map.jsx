import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Map = () => {
  const { user } = useAuth();

  return (
    <div className="map-container">
      <h1>Welcome, {user?.username}!</h1>
      <div id="map" style={{ height: '500px', width: '100%' }}></div>
    </div>
  );
};

export default Map; 