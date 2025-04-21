import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FilterColumn from './FilterColumn';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { Box, Typography, List, ListItem, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, TextField, ToggleButton, ToggleButtonGroup, Select, MenuItem } from '@mui/material';
import Header from './Header';
import { logout } from '../utils/auth';
import { Link } from 'react-router-dom';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom orange marker icon
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom gray marker icon
const grayIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-gray-icon'
});

// Add CSS for marker colors and custom grouped marker
const markerStyles = `
  .leaflet-gray-icon {
    filter: grayscale(100%) brightness(0.7);
  }
  .custom-grouped-marker .grouped-marker-outer {
    position: relative;
    width: 38px;
    height: 48px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .custom-grouped-marker .grouped-marker-inner {
    display: none;
  }
  .custom-grouped-marker .grouped-marker-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    min-width: 22px;
    height: 22px;
    background: #ff9800;
    color: #fff;
    font-weight: bold;
    font-size: 13px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff3e6;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    z-index: 2;
  }
`;

// Only inject styles in browser environment
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = markerStyles;
  document.head.appendChild(styleSheet);
}

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

  // Helper to group listings by lat/lng
  function groupListingsByCoords(listings) {
    const groups = {};
    listings.forEach(listing => {
      if (!listing.latitude || !listing.longitude || isNaN(listing.latitude) || isNaN(listing.longitude)) return;
      const key = `${listing.latitude},${listing.longitude}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(listing);
    });
    return groups;
  }

  // Helper to create a grouped divIcon with badge
  function getGroupedDivIcon(count) {
    return L.divIcon({
      className: 'custom-grouped-marker',
      html: `
        <div style="position: relative; width: 25px; height: 41px;">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" style="width: 25px; height: 41px; display: block;" />
          <div class="grouped-marker-badge" style="
            position: absolute;
            top: -7px;
            right: -7px;
            min-width: 22px;
            height: 22px;
            background: #ff9800;
            color: #fff;
            font-weight: bold;
            font-size: 13px;
            border-radius: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #fff3e6;
            box-shadow: 0 1px 6px rgba(0,0,0,0.23);
            z-index: 2;
            letter-spacing: 0.5px;
            padding: 0 4px;
          ">+${count}</div>
        </div>
      `,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
  }

  useEffect(() => {
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (listings && listings.length > 0) {
      const groups = groupListingsByCoords(listings);
      Object.entries(groups).forEach(([key, group]) => {
        if (group.length === 1) {
          // Single marker, no offset
          const listing = group[0];
          const markerIcon = listing.isInterested ? orangeIcon : grayIcon;
          const marker = L.marker([listing.latitude, listing.longitude], { icon: markerIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h3>${listing.location || 'Unknown Location'}</h3>
                <p>Price: $${listing.cost ?? 0}/month</p>
                <p>Size: ${listing.cubic_ft ?? listing.cubic_feet ?? 0} cubic feet</p>
                <p>Distance from Princeton: ${listing.distance ? listing.distance.toFixed(1) : 'N/A'} miles</p>
                <button 
                  style="background-color: #f57c00; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 8px;"
                  onclick="window.location.href='/listing/${listing.id || listing.listing_id}'"
                >
                  View Details
                </button>
                <button 
                  style="background: none; border: none; color: #f44336; font-weight: 700; font-size: 15px; display: inline-flex; align-items: center; cursor: pointer; gap: 5px; padding: 2px 8px; border-radius: 6px;"
                  onclick="window.dispatchEvent(new CustomEvent('open-report-modal', { detail: { listingId: '${listing.id || listing.listing_id}' } }))"
                  title="Report this listing"
                >
                  <span style='font-size:18px;color:#f44336;'>🚩</span>
                  <span>Report</span>
                </button>
              </div>
            `);
          marker.on('click', () => {
            onListingClick(listing);
          });
        } else {
          // Multiple listings at same coordinates: show a single thick orange marker with badge
          const lat = group[0].latitude;
          const lng = group[0].longitude;
          const markerIcon = getGroupedDivIcon(group.length);
          const marker = L.marker([lat, lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h3>${group[0].location || 'Multiple Listings'}</h3>
                <p><b>${group.length}</b> storage listings at this location.</p>
                <ul style="padding-left: 18px;">
                  ${group.map(listing => `
                    <li style='margin-bottom: 2px;'>
                      <b>$${listing.cost ?? 0}/mo</b>, ${listing.cubic_ft ?? listing.cubic_feet ?? 0} ft³
                      <a href='/listing/${listing.id || listing.listing_id}' style='color:#f57c00;margin-left:5px;'>View</a>
                    </li>
                  `).join('')}
                </ul>
              </div>
            `);
          marker.on('click', () => {
            onListingClick(group[0], group);
          });
        }
      });
    } else {
      map.setView([PRINCETON_COORDS.lat, PRINCETON_COORDS.lng], 15);
    }
  }, [map, listings, onListingClick]);

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
  const [interestLoading, setInterestLoading] = React.useState(false);
  const [interestSuccess, setInterestSuccess] = React.useState(false);
  const [interestError, setInterestError] = React.useState(null);

  // State for report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minCost: 0,
    maxCost: 1000,
    minSize: 0,
    maxSize: 1000,
    maxDistance: 10
  });
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationMode, setReservationMode] = useState('full');
  const [reservationVolume, setReservationVolume] = useState('');
  const [reservationLocalError, setReservationLocalError] = useState('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState('');

  // --- Grouped listing modal state ---
  const [groupedListings, setGroupedListings] = useState(null); // array of listings at same coords or null
  const [groupedIndex, setGroupedIndex] = useState(0);

  // Compute selected listing: if grouped modal, pick from group, else by id
  const selectedListing = groupedListings && groupedListings.length > 0
    ? groupedListings[groupedIndex]
    : listings.find(l => (l.listing_id || l.id) === selectedListingId) || null;

  const fetchAndSyncInterest = useCallback(async (listingsData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/my-interested-listings`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch interest');
      const interested = await response.json();
      const interestedIds = new Set(interested.map(l => l.id));
      return listingsData.map(l => ({ ...l, isInterested: interestedIds.has(l.listing_id || l.id) }));
    } catch (err) {
      return listingsData.map(l => ({ ...l, isInterested: false }));
    }
  }, []);

  const fetchListings = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const fetchUrl = `${apiUrl}/api/listings`;
      console.log('Fetching listings from:', fetchUrl);
      
      // Get user info for headers
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      
      console.log('Using auth headers - User type:', userType, 'Username:', username);
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': username
        },
        credentials: 'include'
      });

      console.log('Listings response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching listings:', errorText);
        throw new Error(`Failed to fetch listings: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Received ${data.length} listings:`, data);
      
      // Validate coordinates
      const validListings = data.filter(listing => {
        const hasCoords = listing.latitude && listing.longitude && 
                          !isNaN(listing.latitude) && !isNaN(listing.longitude);
        if (!hasCoords) {
          console.warn('Listing with invalid coordinates:', listing.id);
        }
        return hasCoords;
      });
      
      console.log(`${validListings.length} listings have valid coordinates`);
      
      // Add distance to each listing
      const listingsWithDistance = validListings.map(listing => {
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
      
      const synced = await fetchAndSyncInterest(listingsWithDistance);
      setListings(synced);
    } catch (err) {
      console.error('Error in fetchListings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    setSelectedListingId(listing.listing_id || listing.id);
    if (mapRef.current) {
      mapRef.current.setView([listing.latitude, listing.longitude], 16);
    }
  };

  // Filter listings based on current filters
  const filteredListings = listings.map(listing => {
    if (!listing.latitude || !listing.longitude) return { ...listing, matchesFilters: false };
    
    // Prioritize the database column names
    const listingCost = listing.cost !== undefined ? listing.cost : 0;
    const costMatches = (filters.minCost === 0 && filters.maxCost === 0) 
      ? listingCost === 0 
      : listingCost >= filters.minCost && listingCost <= filters.maxCost;
    
    // Prioritize cubic_ft which is the actual database column
    const listingSize = listing.cubic_ft !== undefined ? listing.cubic_ft : 
                        (listing.cubic_feet !== undefined ? listing.cubic_feet : 0);
    const sizeMatches = (filters.minSize === 0 && filters.maxSize === 0)
      ? listingSize === 0
      : listingSize >= filters.minSize && listingSize <= filters.maxSize;
    
    const distance = calculateDistance(
      PRINCETON_COORDS.lat,
      PRINCETON_COORDS.lng,
      listing.latitude,
      listing.longitude
    );
    const distanceMatches = distance <= filters.maxDistance;
    
    return {
      ...listing,
      matchesFilters: costMatches && sizeMatches && distanceMatches
    };
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
              {filteredListings
                .filter(listing => listing.matchesFilters)
                .map((listing) => (
                <React.Fragment key={listing.listing_id || listing.id}>
                  <ListItem 
                    button 
                    onClick={() => handleListingClick(listing)}
                    style={{ 
                      backgroundColor: selectedListing && selectedListing.listing_id === listing.listing_id ? '#FFF3E6' : 'transparent',
                      borderLeft: selectedListing && selectedListing.listing_id === listing.listing_id ? '4px solid #FF6B00' : 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ marginRight: 8 }}>
                      <FontAwesomeIcon icon={listing.isInterested ? ['fas', 'heart'] : ['far', 'heart']} color={listing.isInterested ? '#FF6B00' : '#ccc'} />
                    </span>
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
              onListingClick={(listing, group) => {
                if (group && group.length > 1) {
                  setGroupedListings(group);
                  setGroupedIndex(0);
                  setSelectedListingId(null);
                } else {
                  setGroupedListings(null);
                  setGroupedIndex(0);
                  setSelectedListingId(listing.listing_id || listing.id);
                }
              }}
              selectedListing={selectedListing}
            />
          </MapContainer>
          {/* Popup Modal for Selected Listing */}
          <Dialog open={!!selectedListing} onClose={() => { setSelectedListingId(null); setGroupedListings(null); }} PaperProps={{ style: { borderRadius: 16, minWidth: 340, background: '#fff8f1' } }}>
            <DialogTitle style={{ background: '#FF6B00', color: 'white', fontWeight: 700, letterSpacing: 1, padding: '16px 24px' }}>
              Listing Details
            </DialogTitle>
            <DialogContent dividers style={{ background: '#fff8f1', padding: 24, position: 'relative' }}>
                {/* Report Button - top right */}
                <button
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#ffeaea',
                    border: '1.5px solid #f44336',
                    color: '#f44336',
                    fontWeight: 700,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '4px 12px',
                    borderRadius: 7,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}
                  title="Report this listing"
                  onClick={() => {
                    setReportModalOpen(true);
                    setReportReason("");
                    setReportSuccess(false);
                  }}
                >
                  <span style={{fontSize: 20, color: '#f44336'}}>🚩</span>
                  <span>Report</span>
                </button>
              {/* Grouped modal navigation */}
              {groupedListings && groupedListings.length > 1 && (
                <Box mb={2} display="flex" alignItems="center" justifyContent="center" gap={2}>
                  <Button
                    onClick={() => setGroupedIndex(i => (i - 1 + groupedListings.length) % groupedListings.length)}
                    disabled={groupedListings.length <= 1}
                    style={{ minWidth: 40, fontWeight: 700 }}
                  >
                    &#8592; Prev
                  </Button>
                  <span style={{ fontWeight: 600, color: '#FF6B00' }}>{groupedIndex + 1} / {groupedListings.length}</span>
                  <Button
                    onClick={() => setGroupedIndex(i => (i + 1) % groupedListings.length)}
                    disabled={groupedListings.length <= 1}
                    style={{ minWidth: 40, fontWeight: 700 }}
                  >
                    Next &#8594;
                  </Button>
                </Box>
              )}
              {interestError && (<Box mb={2}><Alert severity="error" variant="filled">{
                  (() => {
                    if (typeof interestError === 'string') {
                      try {
                        const parsed = JSON.parse(interestError);
                        if (parsed && parsed.error) return `Error: ${parsed.error}`;
                      } catch (e) {
                        // Not JSON, fall through
                      }
                      // Try to match {"error":"..."} pattern
                      const match = interestError.match(/\{"error"\s*:\s*"([^"]+)"\}/);
                      if (match && match[1]) return `Error: ${match[1]}`;
                      return `Error: ${interestError}`;
                    }
                    return 'An error occurred.';
                  })()
                }</Alert></Box>
              )}
              {interestSuccess && (
                <Box mb={2}><Alert severity="success" variant="filled">{selectedListing && selectedListing.isInterested ? 'Interest removed!' : 'Interest recorded!'}</Alert></Box>
              )}
              {selectedListing && (
                <Box>
                  <Typography variant="h5" style={{ color: '#FF6B00', fontWeight: 700, marginBottom: 8 }}>
                    {selectedListing.location}
                  </Typography>
                  <Typography variant="body2" style={{ fontStyle: 'italic', color: '#888', marginBottom: 8 }}>
                    {selectedListing.address}
                  </Typography>
                  <Typography variant="body1" style={{ marginBottom: 4 }}>
                    <b>${selectedListing.cost ?? 0}/month</b> • {selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0} cubic feet
                  </Typography>
                  <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                    {selectedListing.distance ? selectedListing.distance.toFixed(1) : 'N/A'} miles from Princeton University
                  </Typography>
                  {selectedListing.description && (
                    <Typography variant="body2" style={{ marginBottom: 8 }}>
                      {selectedListing.description}
                    </Typography>
                  )}
                </Box>
              )}
              {showReservationForm && selectedListing && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  let vol = reservationMode === 'full' ? (selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0) : Number(reservationVolume);
                  if (reservationMode === 'partial') {
                    if (!reservationVolume || isNaN(reservationVolume) || vol <= 0 || vol > (selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0)) {
                      setReservationLocalError(`Enter a valid volume (0 < volume ≤ ${(selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0)})`);
                      return;
                    }
                  }
                  setReservationLocalError('');
                  setReservationLoading(true);
                  setReservationError('');
                  try {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
                    const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
                    const response = await fetch(`${apiUrl}/api/listings/${selectedListing.listing_id || selectedListing.id}/reserve`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'X-User-Type': userType,
                        'X-Username': username
                      },
                      body: JSON.stringify({ requested_volume: vol })
                    });
                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.error || 'Failed to request reservation');
                    }
                    // Also record interest so the pin/heart updates
                    await fetch(`${apiUrl}/api/listings/${selectedListing.listing_id || selectedListing.id}/interest`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-User-Type': userType,
                        'X-Username': username
                      }
                    });
                    setShowReservationForm(false);
                    setInterestSuccess(true);
                    fetchListings();
                  } catch (err) {
                    setReservationError(err.message);
                  } finally {
                    setReservationLoading(false);
                  }
                }} style={{ marginTop: 24 }}>
                  <ToggleButtonGroup
                    value={reservationMode}
                    exclusive
                    onChange={(e, newMode) => {
                      if (newMode) {
                        setReservationMode(newMode);
                        if (newMode === 'full') setReservationVolume(selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0);
                        else setReservationVolume('');
                        setReservationLocalError('');
                      }
                    }}
                    style={{ marginBottom: 16 }}
                    fullWidth
                  >
                    <ToggleButton value="full" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Full ({selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0} cu ft)</ToggleButton>
                    <ToggleButton value="partial" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Partial</ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    label="Volume (cubic feet)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={reservationMode === 'full' ? (selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0) : reservationVolume}
                    onChange={e => setReservationVolume(e.target.value)}
                    disabled={reservationMode === 'full' || reservationLoading}
                    inputProps={{ min: 0.1, max: (selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0), step: 0.1 }}
                    style={{ marginBottom: 12, background: 'white', borderRadius: 6 }}
                  />
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                    Max available: {selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0} cu ft
                  </div>
                  {(reservationLocalError || reservationError) && <Alert severity="error" style={{ marginBottom: 8 }}>{reservationLocalError || reservationError}</Alert>}
                  <DialogActions style={{ padding: '16px 0 0 0', background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                    <Button onClick={() => setShowReservationForm(false)} disabled={reservationLoading} style={{ color: '#888', fontWeight: 600 }}>Cancel</Button>
                    <Button type="submit" variant="contained" style={{ background: '#FF6B00', color: 'white', fontWeight: 700 }} disabled={reservationLoading}>
                      {reservationLoading ? 'Submitting...' : 'Submit'}
                    </Button>
                  </DialogActions>
                </form>
              )}
            </DialogContent>
            <DialogActions style={{ padding: '16px' }}>
              <Button
                onClick={() => setSelectedListingId(null)} style={{ color: '#888' }}>
                Close
              </Button>
              
              <Button
                onClick={() => {
                  if (selectedListing) navigate(`/listing/${selectedListing.listing_id || selectedListing.id}`);
                }}
                style={{ background: '#FF6B00', color: 'white', fontWeight: 600 }}
                variant="contained"
              >
                View Details
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedListing) return;
                  if (selectedListing.isInterested) {
                    // Remove interest as before
                    setInterestLoading(true);
                    setInterestError(null);
                    setInterestSuccess(false);
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
                      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
                      const response = await fetch(`${apiUrl}/api/listings/${selectedListing.listing_id || selectedListing.id}/interest`, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-User-Type': userType,
                          'X-Username': username,
                        },
                        credentials: 'include',
                      });
                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || 'Failed to remove interest');
                      }
                      setInterestSuccess(true);
                      fetchListings();
                    } catch (err) {
                      setInterestError(err.message);
                    } finally {
                      setInterestLoading(false);
                    }
                  } else {
                    // Show reservation form inline
                    const isAuthenticated = !!(sessionStorage.getItem('username') || localStorage.getItem('username'));
                    if (!isAuthenticated) {
                      sessionStorage.setItem('returnTo', `/listing/${selectedListing.listing_id || selectedListing.id}`);
                      navigate('/');
                      return;
                    }
                    setShowReservationForm(true);
                    setReservationMode('full');
                    setReservationVolume(selectedListing.cubic_ft ?? selectedListing.cubic_feet ?? 0);
                    setReservationLocalError('');
                  }
                }}
                style={{
                  background: selectedListing && selectedListing.isInterested ? '#fff' : '#FF6B00',
                  color: selectedListing && selectedListing.isInterested ? '#FF6B00' : 'white',
                  border: selectedListing && selectedListing.isInterested ? '1.5px solid #FF6B00' : 'none',
                  fontWeight: 600
                }}
                variant={selectedListing && selectedListing.isInterested ? 'outlined' : 'contained'}
                disabled={interestLoading}
              >
                {interestLoading
                  ? "Processing..."
                  : selectedListing && selectedListing.isInterested
                    ? "Remove Interest"
                    : "Show Interest"}
              </Button>
              <Button
                onClick={() => setReportModalOpen(true)}
                style={{
                  background: '#fff',
                  color: '#FF6B00',
                  border: '1.5px solid #FF6B00',
                  fontWeight: 600
                }}
                variant="outlined"
              >
                Report
              </Button>
            </DialogActions>
          </Dialog>

          {/* Report Modal */}
          <Dialog 
            open={reportModalOpen} 
            onClose={() => {
              setReportModalOpen(false);
              setReportReason("");
              setReportSuccess(false);
            }} 
            maxWidth="xs" 
            fullWidth
            PaperProps={{
              style: {
                borderRadius: 16,
                minWidth: 340,
                background: '#fff8f1',
                boxShadow: '0 4px 24px rgba(0,0,0,0.14)'
              }
            }}
          >
            <DialogTitle style={{ background: '#FF6B00', color: 'white', fontWeight: 700, letterSpacing: 1, padding: '16px 24px', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              Report Listing
            </DialogTitle>
            <DialogContent dividers style={{ background: '#fff8f1', padding: 28 }}>
              <div style={{ marginTop: 6, marginBottom: 18 }}>
                <span style={{ fontWeight: 600, fontSize: 17, color: '#FF6B00' }}>Reason for Report</span>
                <Select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  disabled={reportSuccess}
                  displayEmpty
                  style={{ width: '100%', marginTop: 16, background: '#fff', borderRadius: 8, fontSize: 16, border: '1.5px solid #FF6B00', color: '#444', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                  inputProps={{ 'aria-label': 'Reason' }}
                >
                  <MenuItem value="" disabled>
                    <span style={{ color: '#bbb' }}>Select a reason...</span>
                  </MenuItem>
                  <MenuItem value="Inappropriate or offensive content">Inappropriate or offensive content</MenuItem>
                  <MenuItem value="Misleading or false information">Misleading or false information</MenuItem>
                  <MenuItem value="Suspicious or scam-related listing">Suspicious or scam-related listing</MenuItem>
                  <MenuItem value="Irrelevant to summer storage">Irrelevant to summer storage</MenuItem>
                  <MenuItem value="Duplicate post">Duplicate post</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
                {reportSuccess && (
                  <Alert severity="success" style={{ marginTop: 22, background: '#e6f4ea', color: '#1b5e20', borderRadius: 8, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
                    Thank you for your report!
                  </Alert>
                )}
              </div>
            </DialogContent>
            <DialogActions style={{ background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '16px 24px' }}>
              <Button 
                onClick={() => setReportModalOpen(false)} 
                disabled={reportSuccess}
                style={{ color: '#888', fontWeight: 600 }}
              >Cancel</Button>
              <Button
                onClick={() => { if (reportReason) setReportSuccess(true); }}
                color="success"
                variant="contained"
                disabled={!reportReason || reportSuccess}
                style={{ background: reportSuccess ? '#4caf50' : '#FF6B00', fontWeight: 700, letterSpacing: 1, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
              >
                {reportSuccess ? 'Submitted!' : 'Submit'}
              </Button>
            </DialogActions>
          </Dialog>
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