import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FilterColumn from './FilterColumn';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import Header from './Header';
import { logout } from '../utils/auth';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom orange marker icon
const orangeIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-orange-icon'
});

// Princeton University coordinates
const PRINCETON_COORDS = {
  lat: 40.3437,
  lng: -74.6517
};

// Function to calculate distance between two points in miles
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Custom component to handle map instance
const MapContent = ({ listings, onListingClick, selectedListing }) => {
  const map = useMap();

  useEffect(() => {
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for listings
    if (listings && listings.length > 0) {
      console.log("Adding markers for listings:", listings);
      
      listings.forEach(listing => {
        // Debug: log each listing's data
        console.log("Listing data:", JSON.stringify(listing, null, 2));
        
        if (listing.latitude && listing.longitude) {
          // Prioritize the database column names
          const cost = listing.cost !== undefined ? listing.cost : 0;
          const size = listing.cubic_ft !== undefined ? listing.cubic_ft : 
                      (listing.cubic_feet !== undefined ? listing.cubic_feet : 0);
          
          L.marker([listing.latitude, listing.longitude], { icon: orangeIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h3>${listing.location}</h3>
                <p>Price: $${cost}/month</p>
                <p>Size: ${size} cubic feet</p>
                <p>Distance from Princeton: ${listing.distance ? listing.distance.toFixed(1) : 'N/A'} miles</p>
              </div>
            `);
        }
      });
    }
  }, [map, listings]);

  return null;
};

// Add CSS for orange scrollbars
const scrollbarStyles = `
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #FFF3E6;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #FF6B00;
    border-radius: 10px;
    border: 2px solid #FFF3E6;
  }
`;

// Only inject styles in browser environment
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

const Map = () => {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minCost: 0,
    maxCost: 1000,
    minSize: 0,
    maxSize: 1000,
    maxDistance: 10
  });
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        // Get base API URL, falling back to the current origin if in production
        let apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl && typeof window !== 'undefined') {
          // In production without VITE_API_URL, use the same origin
          apiUrl = window.location.origin;
          console.log("Using current origin as API URL:", apiUrl);
        } else if (!apiUrl) {
          // Default for local development
          apiUrl = 'http://localhost:8000';
          console.log("Using default local API URL:", apiUrl);
        }
        
        console.log("Fetching listings from:", `${apiUrl}/api/listings`);
        
        // Get user information for headers
        const userType = sessionStorage.getItem('userType') || 'renter';
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || 'renter';
        
        const response = await fetch(`${apiUrl}/api/listings`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username
          }
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          // Try to read the response body as text first
          const responseText = await response.text();
          console.error("Error response body:", responseText);
          
          let errorText = `Server returned ${response.status}: ${response.statusText}`;
          try {
            // Try to parse as JSON if possible
            const errorData = JSON.parse(responseText);
            errorText += ` - ${errorData.error || errorData.message || JSON.stringify(errorData)}`;
          } catch (e) {
            // If not JSON, just append the text
            if (responseText) {
              errorText += ` - ${responseText}`;
            }
          }
          throw new Error(`Failed to fetch listings: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Fetched listings count:", data?.length || 0);
        
        // Debug: Print the first listing to see its structure
        if (data && data.length > 0) {
          console.log("First listing structure:", JSON.stringify(data[0], null, 2));
        }
        
        // Add distance to each listing
        const listingsWithDistance = data.map(listing => {
          if (listing.latitude && listing.longitude) {
            const distance = calculateDistance(
              PRINCETON_COORDS.lat,
              PRINCETON_COORDS.lng,
              listing.latitude,
              listing.longitude
            );
            return { ...listing, distance };
          }
          return listing;
        });
        
        setListings(listingsWithDistance);
      } catch (err) {
        console.error("Error fetching listings:", err);
        setError(err.message || "Failed to fetch listings. Check console for details.");
      }
    };

    fetchListings();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      minCost: 0,
      maxCost: 1000,
      minSize: 0,
      maxSize: 1000,
      maxDistance: 10
    });
  };

  const handleDashboard = () => {
    navigate('/renter');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
    if (mapRef.current) {
      mapRef.current.setView([listing.latitude, listing.longitude], 16);
    }
  };

  // Filter listings based on current filters
  const filteredListings = listings.filter(listing => {
    if (!listing.latitude || !listing.longitude) return false;
    
    // Prioritize the database column names
    const listingCost = listing.cost !== undefined ? listing.cost : 0;
    if (listingCost < (filters.minCost || 0) || listingCost > (filters.maxCost || 1000)) return false;
    
    // Prioritize cubic_ft which is the actual database column
    const listingSize = listing.cubic_ft !== undefined ? listing.cubic_ft : 
                        (listing.cubic_feet !== undefined ? listing.cubic_feet : 0);
    if (listingSize < (filters.minSize || 0) || listingSize > (filters.maxSize || 1000)) return false;
    
    const distance = calculateDistance(
      PRINCETON_COORDS.lat,
      PRINCETON_COORDS.lng,
      listing.latitude,
      listing.longitude
    );
    if (distance > (filters.maxDistance || 10)) return false;
    
    return true;
  });

  // No listings message component
  const NoListingsMessage = () => (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center', 
      color: '#666',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ marginBottom: '15px', fontSize: '18px' }}>No listings found</div>
      <div style={{ fontSize: '14px' }}>Try adjusting your filters or check back later for new listings</div>
    </div>
  );

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#FF6B00', marginBottom: '20px' }}>Unable to Load Map</h2>
        <p style={{ marginBottom: '20px', maxWidth: '600px' }}>{error}</p>
        <div>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              backgroundColor: '#FF6B00',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px',
              fontWeight: 'bold'
            }}
          >
            Retry
          </button>
          <button 
            onClick={() => navigate('/')} 
            style={{
              backgroundColor: 'white',
              color: '#FF6B00',
              border: '1px solid #FF6B00',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const filterColumn = {
    width: '300px',
    backgroundColor: '#f5f5f5', // Match the listings column background
    borderLeft: '1px solid #e0e0e0', // Match the listings column border
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    color: '#FF6B00', // Keep the orange text color
    overflowY: 'hidden' // Remove scrollbar
  };

  const listingsColumn = {
    width: '300px',
    backgroundColor: '#f5f5f5',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Use the existing Header component */}
      <Header title="Renter Dashboard" onLogout={handleLogout} />

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Listings Column */}
        <div style={{ ...listingsColumn, overflow: 'hidden' }}>
          <Typography variant="h6" style={{ padding: '16px', color: '#FF6B00' }}>
            Available Listings
          </Typography>
          {filteredListings && filteredListings.length > 0 ? (
            <List style={{ overflowY: 'auto', flex: 1, height: 'calc(100vh - 72px)' }}>
              {filteredListings.map((listing) => (
                <React.Fragment key={listing.listing_id || listing.id}>
                  <ListItem 
                    button 
                    onClick={() => handleListingClick(listing)}
                    style={{ 
                      backgroundColor: selectedListing && selectedListing.listing_id === listing.listing_id ? '#FFF3E6' : 'transparent',
                      borderLeft: selectedListing && selectedListing.listing_id === listing.listing_id ? '4px solid #FF6B00' : 'none'
                    }}
                  >
                    <ListItemText
                      primary={listing.location}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textPrimary">
                            ${listing.cost !== undefined ? listing.cost : 0}/month • {listing.cubic_ft !== undefined ? listing.cubic_ft : (listing.cubic_feet !== undefined ? listing.cubic_feet : 0)} cubic feet
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="textSecondary">
                            {listing.distance ? listing.distance.toFixed(1) : 'N/A'} miles from Princeton University
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <NoListingsMessage />
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative', height: 'calc(100vh - 72px)' }}>
          <MapContainer
            center={[40.3437, -74.6517]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapContent 
              listings={filteredListings} 
              onListingClick={handleListingClick}
              selectedListing={selectedListing}
            />
          </MapContainer>
        </div>

        {/* Filter Column */}
        <div style={{ ...filterColumn, overflow: 'hidden' }}>
          <FilterColumn 
            filters={filters} 
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  mainContent: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    position: 'relative'
  },
  listingsColumn: {
    width: '300px',
    height: '100%',
    backgroundColor: '#f5f5f5',
    overflowY: 'auto'
  },
  mapContainer: {
    flex: 1,
    height: '100%',
    position: 'relative'
  },
  map: {
    height: '100%',
    width: '100%'
  },
  filterColumn: {
    width: '300px',
    height: '100%',
    backgroundColor: '#f5f5f5',
    overflowY: 'auto'
  },
  controls: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    gap: '10px'
  },
  controlButton: {
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    color: '#333'
  }
};

export default Map; 