import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FilterColumn from './FilterColumn';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Typography, List, ListItem, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, TextField, ToggleButton, ToggleButtonGroup, Select, MenuItem } from '@mui/material';
import Header from './Header';
import { logout, axiosInstance } from '../utils/auth';
import { getCSRFToken } from '../utils/csrf';

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
  shadowSize: [41, 41],
  className: 'custom-orange-marker'
});

// Custom yellow marker icon (for interested listings)
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'custom-yellow-marker'
});

// Custom green marker icon
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'custom-green-marker'
});

// Add CSS for marker colors and custom grouped marker
const markerStyles = `
  .custom-orange-marker {
    filter: hue-rotate(0deg) saturate(1.2) brightness(1.1);
  }
  .custom-yellow-marker {
    filter: none;
  }
  .custom-grouped-marker {
    filter: hue-rotate(0deg) saturate(1.2) brightness(1.1);
  }
  .custom-grouped-marker.interested {
    filter: none;
  }
  .custom-grouped-marker .grouped-marker-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    min-width: 22px;
    height: 22px;
    background: #f57c00;
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
  function getGroupedDivIcon(count, isInterested = false) {
    return L.divIcon({
      className: `custom-grouped-marker ${isInterested ? 'interested' : ''}`,
      html: `
        <div style="position: relative; width: 25px; height: 41px;">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${isInterested ? 'yellow' : 'orange'}.png" style="width: 25px; height: 41px; display: block;" />
          <div class="grouped-marker-badge" style="
            position: absolute;
            top: -7px;
            right: -7px;
            min-width: 22px;
            height: 22px;
            background: ${isInterested ? '#76B474' : '#e65100'};
            color: #fff;
            font-weight: bold;
            font-size: 13px;
            border-radius: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid ${isInterested ? '#e8f5e9' : '#ffffff'};
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
          // Single marker - use yellow icon for interested listings, orange for others
          const listing = group[0];
          const marker = L.marker([listing.latitude, listing.longitude], { 
            icon: listing.isInterested ? yellowIcon : orangeIcon 
          })
          .addTo(map)
          .bindPopup(`
            <div>
              <h3>${listing.title || 'Unknown Title'}</h3>
              <p>Price: $${listing.cost ?? 0}/month</p>
              <p>Size: ${listing.remaining_space ?? listing.sq_ft ?? 0} sq ft remaining • ${listing.sq_ft ?? 0} sq ft total</p>
              <p>Distance from Princeton: ${listing.distance ? listing.distance.toFixed(1) : 'N/A'} miles</p>
              <button 
                style="background-color: ${listing.isInterested ? '#f44336' : '#f57c00'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 8px;"
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
          // Multiple listings - check if any listing in the group is interested
          const hasInterestedListing = group.some(listing => listing.isInterested);
          const lat = group[0].latitude;
          const lng = group[0].longitude;
          const markerIcon = getGroupedDivIcon(group.length, hasInterestedListing);
          const marker = L.marker([lat, lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(`
              <div>
                <h3>${group[0].title || 'Multiple Listings'}</h3>
                <p><b>${group.length}</b> storage listings at this title.</p>
                <ul style="padding-left: 18px;">
                  ${group.map(listing => `
                    <li style='margin-bottom: 2px;'>
                      <b>$${listing.cost ?? 0}/mo</b>, ${listing.remaining_space ?? listing.sq_ft ?? 0} sq ft remaining • ${listing.sq_ft ?? 0} sq ft total
                      <a href='/listing/${listing.id || listing.listing_id}' style='color:${listing.isInterested ? '#ffd700' : '#FF8F00'};margin-left:5px;'>View</a>
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
    background: #f5f5f5;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #bdbdbd;
    border-radius: 10px;
    border: 2px solid #f5f5f5;
  }
  .left-scrollbar {
    direction: rtl;
  }
  .left-scrollbar > * {
    direction: ltr;
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
  const [lastInterestAction, setLastInterestAction] = useState(null); // 'add' or 'remove'

  // State for report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    minCost: 0,
    maxCost: 100,
    minSize: 0,
    maxSize: 500,
    maxDistance: 50,
    minRating: 1
  });
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [reservationMode, setReservationMode] = useState('full');
  const [reservationSpace, setReservationSpace] = useState('');
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

  const [message, setMessage] = useState(null); // For success/error messages
  
  // Message styles
  const messageStyles = {
    container: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      padding: '10px 20px',
      borderRadius: '4px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      animation: 'fadeIn 0.3s ease-out',
      maxWidth: '300px'
    },
    success: {
      backgroundColor: '#4caf50',
      color: 'white'
    },
    error: {
      backgroundColor: '#f44336',
      color: 'white'
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the API URL from environment variable
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Get user information for headers
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      // console.log(`Using auth headers - User type: ${userType} Username: ${username}`);
      
      // Fetch listings from API
      const response = await axiosInstance.get(`${apiUrl}/api/listings`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': username
        }
      });
      
      // console.log(`Listings response status: ${response.status}`);
      const data = response.data;
      
      // Clear any old data
      setListings([]);
      
      // Data validation
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
      
      // Add distance calculations
      const dataWithDistance = data.map(listing => {
        const distance = listing.latitude && listing.longitude
          ? calculateDistance(
              PRINCETON_COORDS.lat, PRINCETON_COORDS.lng,
              listing.latitude, listing.longitude
            )
          : Number.MAX_VALUE;
          
        return {
          ...listing,
          distance,
          // Filter match will be applied later
          matchesFilters: true,
          // Initially set interest to false, will be updated below
          isInterested: false
        };
      });
      
      // Filter out unavailable listings (with 0 remaining space)
      const availableListings = dataWithDistance.filter(
        listing => 
          (listing.is_available === undefined || listing.is_available === true) &&
          Number(listing.remaining_space) > 0
      );
      
      // console.log(`${availableListings.length} listings have valid coordinates`);
      
      // Sort by distance
      availableListings.sort((a, b) => a.distance - b.distance);
      
      // Set available listings
      setListings(availableListings);
      
      // Fetch the user's reservation requests to mark interest
      try {
        const requestsResponse = await axiosInstance.get(`${apiUrl}/api/my-reservation-requests`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username
          }
        });
        
        if (requestsResponse.data && Array.isArray(requestsResponse.data)) {
          const requests = requestsResponse.data;
          const pendingRequestIds = requests
            .filter(r => r.status === 'pending')
            .map(r => String(r.listing_id));
          
          // Mark listings as interested based on pending reservation requests
          const listingsWithInterest = availableListings.map(listing => ({
            ...listing,
            isInterested: pendingRequestIds.includes(String(listing.id) || String(listing.listing_id))
          }));
          
          // Update the available listings with interest information
          setListings(listingsWithInterest);
        }
      } catch (error) {
        // console.error('Error fetching reservation requests:', error);
        // Continue with listings even if we can't fetch reservation status
      }
    } catch (error) {
      // console.error('Error fetching listings:', error);
      setError('Unable to load listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    const interval = setInterval(fetchListings, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Ensure CSRF token is set on mount
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/csrf-token`, { credentials: 'include' });
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
      maxDistance: 10,
      minRating: 1
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
      //console.error('Logout failed:', err);
    }
  };

  const handleListingClick = (listing) => {
    setSelectedListingId(listing.listing_id || listing.id);
    setInterestSuccess(false);
    setLastInterestAction(null);
    if (mapRef.current) {
      mapRef.current.setView([listing.latitude, listing.longitude], 16);
    }
  };

  // Filter listings based on current filters
  const filteredListings = listings.map(listing => {
    if (!listing.latitude || !listing.longitude) return { ...listing, matchesFilters: false };
    // Prioritize the database column names
    const listingCost = listing.cost !== undefined ? listing.cost : 0;
    const costMatches = listingCost >= (filters.minCost ?? 0) && listingCost <= (filters.maxCost ?? 200);
    // Prioritize sq_ft which is the actual database column
    const listingSize = listing.sq_ft !== undefined ? Number(listing.sq_ft) : 0;
    const sizeMatches = listingSize >= (filters.minSize ?? 0) && listingSize <= (filters.maxSize ?? 1000);
    const distance = calculateDistance(
      PRINCETON_COORDS.lat,
      PRINCETON_COORDS.lng,
      listing.latitude,
      listing.longitude
    );
    // Ignore distance filter if maxDistance is 50 (i.e., 50+)
    const distanceMatches = (filters.maxDistance === 50) ? true : distance <= filters.maxDistance;
    // --- Rating filter ---
    const rating = listing.lender_avg_rating;
    const ratingMatches = (filters.minRating <= 1) ? true : (rating === undefined || rating === null ? false : rating >= filters.minRating);
    return {
      ...listing,
      matchesFilters: costMatches && sizeMatches && distanceMatches && ratingMatches
    };
  });

  // Use filteredListings for sidebar, checking availability and matchesFilters
  const availableListings = filteredListings.filter(
    listing => (listing.is_available === undefined || listing.is_available === true) && Number(listing.remaining_space) > 0 && listing.matchesFilters
  );

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

  // Handle interest toggle
  const handleToggleInterest = async (listing) => {
    try {
      setInterestLoading(true);
      setInterestError(null); // Clear any previous errors
      const userType = sessionStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || '';
      
      // Check if already interested
      if (listing.isInterested) {
        // Need to find the reservation request ID for this listing
        const resp = await axiosInstance.get('/api/my-reservation-requests', {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username
          }
        });
        
        if (resp.data && Array.isArray(resp.data)) {
          const pending = resp.data.find(r => 
            (String(r.listing_id) === String(listing.id)) && 
            r.status === 'pending'
          );
          
          if (pending) {
            // Cancel the existing request
            // console.log(`Cancelling pending reservation request ID: ${pending.request_id}`);
            await axiosInstance.patch(`/api/reservation-requests/${pending.request_id}`, {
              status: 'cancelled_by_renter'
            }, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-User-Type': userType,
                'X-Username': username
              }
            });
            
            // Update the UI immediately
            setListings(currentListings => 
              currentListings.map(l => 
                l.id === listing.id ? {...l, isInterested: false} : l
              )
            );
            
            // Update the selected listing ID's isInterested property
            if (selectedListingId && selectedListingId === listing.id) {
              // Show success message inside the modal
              setInterestSuccess(true);
              setLastInterestAction('remove');
              setTimeout(() => setInterestSuccess(false), 3000);
            }
          }
        }
      } else {
        // Not interested yet - show reservation form
        const isAuthenticated = !!(sessionStorage.getItem('username') || localStorage.getItem('username'));
        if (!isAuthenticated) {
          sessionStorage.setItem('returnTo', `/listing/${listing.listing_id || listing.id}`);
          navigate('/');
          setInterestLoading(false);
          return;
        }
        
        // Show reservation form
        setShowReservationForm(true);
        setReservationMode('full');
        setReservationSpace(listing.sq_ft ?? 0);
        setReservationLocalError('');
        setInterestLoading(false);
        return;
      }
    } catch (error) {
      //console.error('Error toggling interest:', error);
      // Show error inside the modal
      setInterestError(error.response?.data?.error || 'Error updating request');
      setTimeout(() => setInterestError(null), 3000);
    } finally {
      setInterestLoading(false);
    }
  };

  useEffect(() => {
    setInterestSuccess(false);
    setLastInterestAction(null);
  }, [groupedListings, groupedIndex]);

  useEffect(() => {
    if (selectedListingId) {
      // Find the updated listing from the listings array (which is synced with interest context)
      const updated = listings.find(l => (l.listing_id || l.id) === selectedListingId);
      if (updated) {
        // If using groupedListings, update the group as well
        if (groupedListings && groupedListings.length > 0) {
          const updatedGroup = groupedListings.map(l => {
            const match = listings.find(x => (x.listing_id || x.id) === (l.listing_id || l.id));
            return match ? match : l;
          });
          setGroupedListings(updatedGroup);
        }
        // This will force the modal to re-render with the new interest state
        setSelectedListingId(updated.listing_id || updated.id);
      }
    }
    // eslint-disable-next-line
  }, [listings]);

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

  const listingsColumn = {
    width: '300px',
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '300px',
    boxSizing: 'border-box'
  };

  const filterColumn = {
    width: '300px',
    backgroundColor: '#fff',
    borderLeft: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    color: '#FF6B00',
    overflowY: 'hidden',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    maxWidth: '300px'
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
          {availableListings && availableListings.length > 0 ? (
            <List className="left-scrollbar" style={{ overflowY: 'auto', flex: 1, height: 'calc(100vh - 72px)' }}>
              {availableListings
                .filter(listing => listing.matchesFilters)
                .map((listing) => (
                <React.Fragment key={listing.listing_id || listing.id}>
                  <ListItem 
                    button 
                    onClick={() => handleListingClick(listing)}
                    style={{ 
                      backgroundColor: (selectedListingId && (selectedListingId === (listing.listing_id || listing.id))) ? '#FFF3E6' : 'transparent',
                      borderLeft: (selectedListingId && (selectedListingId === (listing.listing_id || listing.id))) ? '4px solid #FF6B00' : 'none',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ marginRight: 8 }}>
                      <FontAwesomeIcon icon={listing.isInterested ? ['fas', 'heart'] : ['far', 'heart']} color={listing.isInterested ? '#FF6B00' : '#ccc'} />
                    </span>
                    <ListItemText
                      primary={listing.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="textPrimary">
                            ${listing.cost !== undefined ? listing.cost : 0}/month • {listing.remaining_space ?? listing.sq_ft ?? 0} sq ft remaining • {listing.sq_ft ?? 0} sq ft total
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="textSecondary">
                            {listing.distance ? listing.distance.toFixed(1) : 'N/A'} miles from Princeton University
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2" color="textSecondary">
                            Lender Rating: {typeof listing.lender_avg_rating === 'number' ? (
                              <span style={{ color: '#fbc02d', fontWeight: 600 }}>
                                {[1,2,3,4,5].map(star => (
                                  <span key={star} style={{ color: listing.lender_avg_rating >= star ? '#fbc02d' : '#ccc', fontSize: 16 }}>★</span>
                                ))}
                                <span style={{ color: '#333', marginLeft: 4, fontSize: 14 }}>
                                  {listing.lender_avg_rating.toFixed(1)}
                                </span>
                              </span>
                            ) : (
                              <span style={{ color: '#888', fontSize: 14 }}>N/A</span>
                            )}
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
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={20}
            />
            <MapContent 
              listings={availableListings} 
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
          <Dialog open={!!selectedListing} onClose={() => { setSelectedListingId(null); setGroupedListings(null); setInterestSuccess(false); setLastInterestAction(null); }} PaperProps={{ style: { borderRadius: 16, minWidth: 340, background: '#fff8f1' } }}>
            <DialogTitle style={{ background: '#FF6B00', color: 'white', fontWeight: 700, letterSpacing: 1, padding: '16px 24px', position: 'relative' }}>
              Listing Details
              <button
                onClick={() => { setSelectedListingId(null); setGroupedListings(null); setInterestSuccess(false); setLastInterestAction(null); }}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: 22,
                  cursor: 'pointer',
                  fontWeight: 700,
                  lineHeight: 1
                }}
                aria-label="Close"
              >
                &times;
              </button>
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
                        if (parsed && parsed.error) return parsed.error;
                      } catch (e) {
                        // Not JSON, fall through
                      }
                      // Try to match {"error":"..."} pattern
                      const match = interestError.match(/\{"error"\s*:\s*"([^"]+)"\}/);
                      if (match && match[1]) return match[1];
                      
                      // Remove any numeric codes from error
                      let cleanError = interestError;
                      cleanError = cleanError.replace(/Error:\s*/, '');
                      cleanError = cleanError.replace(/\b[0-9]{3,}\b/, '');
                      cleanError = cleanError.replace(/^\s+|\s+$/g, '');
                      
                      // Add default prefix if error looks too technical
                      if (cleanError.includes('exception') || 
                          cleanError.includes('failed') || 
                          cleanError.toLowerCase().includes('error')) {
                        return "We couldn't process your request. Please try again later.";
                      }
                      
                      return cleanError;
                    }
                    return 'We couldn\'t process your request. Please try again later.';
                  })()
                }</Alert></Box>
              )}
              {interestSuccess && (
                <Box mb={2}><Alert severity="success" variant="filled">
                  {lastInterestAction === 'remove' ? 'Space request cancelled!' : 'Space requested!'}
                </Alert></Box>
              )}
              {selectedListing && (
                <Box>
                  <Typography variant="h5" style={{ color: '#FF6B00', fontWeight: 700, marginBottom: 8 }}>
                    {selectedListing.title}
                  </Typography>
                  {selectedListing.hall_name && (
                    <Typography variant="body2" style={{ color: '#FF8F00', fontWeight: 500, marginBottom: 8 }}>
                      Residential Hall: {selectedListing.hall_name}
                    </Typography>
                  )}
                  <Typography variant="body1" style={{ marginBottom: 4 }}>
                    <b>${selectedListing.cost ?? 0}/month</b> • {selectedListing.remaining_space ?? selectedListing.sq_ft ?? 0} sq ft remaining • {selectedListing.sq_ft ?? 0} sq ft total
                  </Typography>
                  <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                    {selectedListing.distance ? selectedListing.distance.toFixed(1) : 'N/A'} miles from Princeton University
                  </Typography>
                  <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                    Lender Rating: {typeof selectedListing.lender_avg_rating === 'number' ? (
                      <span style={{ color: '#fbc02d', fontWeight: 600 }}>
                        {[1,2,3,4,5].map(star => (
                          <span key={star} style={{ color: selectedListing.lender_avg_rating >= star ? '#fbc02d' : '#ccc', fontSize: 18 }}>★</span>
                        ))}
                        <span style={{ color: '#333', marginLeft: 4, fontSize: 15 }}>
                          {selectedListing.lender_avg_rating.toFixed(1)}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: '#888', fontSize: 15 }}>N/A</span>
                    )}
                  </Typography>
                  {selectedListing.description && (
                    <Typography variant="body2" style={{ marginBottom: 8 }}>
                      {selectedListing.description}
                    </Typography>
                  )}
                </Box>
              )}
              {showReservationForm && selectedListing && (
                <form id="reservation-form" onSubmit={async (e) => {
                  e.preventDefault();
                  let space = reservationMode === 'full' ? (selectedListing.sq_ft ?? 0) : Number(reservationSpace);
                  if (reservationMode === 'partial') {
                    if (!reservationSpace || isNaN(reservationSpace) || space <= 0 || space > (selectedListing.sq_ft ?? 0)) {
                      setReservationLocalError(`Enter a valid space (0 < space ≤ ${(selectedListing.sq_ft ?? 0)})`);
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
                    
                    // Submit reservation request
                    await axiosInstance.post(`/api/listings/${selectedListing.listing_id || selectedListing.id}/reserve`, {
                      requested_space: space
                    }, {
                      headers: {
                        'Content-Type': 'application/json',
                        'X-User-Type': userType,
                        'X-Username': username,
                        'X-CSRFToken': getCSRFToken()
                      }
                    });
                    
                    // Close the form
                    setShowReservationForm(false);
                    
                    // Update UI
                    setInterestSuccess(true);
                    setLastInterestAction('add');
                    setTimeout(() => setInterestSuccess(false), 3000);
                    
                    // Update the listings immediately
                    setListings(currentListings => 
                      currentListings.map(l => 
                        l.id === (selectedListing.listing_id || selectedListing.id) ? {...l, isInterested: true} : l
                      )
                    );
                    
                    // Refresh listings to update UI
                    // await fetchListings();
                  } catch (error) {
                    const errorData = error.response?.data || {};
                    let errorMessage = errorData.error || 'We couldn\'t submit your reservation request. Please try again later.';
                    
                    // Clean up error message
                    errorMessage = errorMessage.replace(/Error:\s*/, '');
                    
                    setReservationError(errorMessage);
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
                        if (newMode === 'full') setReservationSpace(selectedListing.sq_ft ?? 0);
                        else setReservationSpace('');
                        setReservationLocalError('');
                      }
                    }}
                    style={{ marginBottom: 16 }}
                    fullWidth
                  >
                    <ToggleButton value="full" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Full ({selectedListing.sq_ft ?? 0} sq ft)</ToggleButton>
                    <ToggleButton value="partial" style={{ flex: 1, fontWeight: 600, color: '#FF6B00', borderColor: '#FF6B00' }}>Partial</ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    label="Space (sq ft)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={reservationMode === 'full' ? (selectedListing.sq_ft ?? 0) : reservationSpace}
                    onChange={e => setReservationSpace(e.target.value)}
                    disabled={reservationMode === 'full' || reservationLoading}
                    inputProps={{ min: 0.1, max: (selectedListing.sq_ft ?? 0), step: 0.1 }}
                    style={{ marginBottom: 12, background: 'white', borderRadius: 6 }}
                  />
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                    Max available: {selectedListing.sq_ft ?? 0} sq ft
                  </div>
                  {(reservationLocalError || reservationError) && <Alert severity="error" style={{ marginBottom: 8 }}>{reservationLocalError || reservationError}</Alert>}
                  <DialogActions style={{ padding: '16px 0 0 0', background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                    <Button onClick={() => setShowReservationForm(false)} disabled={reservationLoading} style={{ color: '#888', fontWeight: 600 }}>Cancel</Button>
                  </DialogActions>
                </form>
              )}
            </DialogContent>
            <DialogActions style={{ padding: '16px' }}>
              <Button
                onClick={() => {
                  if (selectedListing) navigate(`/listing/${selectedListing.listing_id || selectedListing.id}`);
                }}
                style={{ background: '#FF6B00', color: 'white', fontWeight: 600 }}
                variant="contained"
              >
                View Details
              </Button>
              {!showReservationForm && (
                <Button
                  onClick={() => handleToggleInterest(selectedListing)}
                  style={{
                    background: selectedListing && selectedListing.isInterested ? '#f44336' : '#FF6B00',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600
                  }}
                  variant="contained"
                  disabled={interestLoading}
                >
                  {interestLoading
                    ? "Processing..."
                    : selectedListing && selectedListing.isInterested
                      ? "Cancel Request"
                      : "Request Space"}
                </Button>
              )}
              {showReservationForm && (
                <Button
                  type="submit"
                  form="reservation-form"
                  style={{ background: '#FF6B00', color: 'white', fontWeight: 700 }}
                  variant="contained"
                  disabled={reservationLoading}
                >
                  {reservationLoading ? 'Submitting...' : 'Submit'}
                </Button>
              )}
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
                onClick={async () => {
                  if (!reportReason || reportSuccess) return;
                  // Get user info (renter_id) from local/session storage
                  const renter_id = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
                  const lender_id = selectedListing?.owner_id || selectedListing?.lender_id || '';
                  const listing_id = selectedListing?.listing_id || selectedListing?.id;
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                  try {
                    await axiosInstance.post('/api/report-listing', {
                      listing_id,
                      lender_id,
                      renter_id,
                      reason: reportReason
                    });
                    // Success - axios will throw on error
                    setReportSuccess(true);
                  } catch (err) {
                    // console.error('Report error:', err);
                    setReportSuccess(false);
                    alert(err.response?.data?.error || 'Error submitting report.');
                  }
                }}
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

      {/* Message notification */}
      {message && (
        <div 
          style={{
            ...messageStyles.container,
            ...(message.type === 'success' ? messageStyles.success : messageStyles.error)
          }}
        >
          {message.text}
        </div>
      )}
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
    overflowY: 'hidden',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    maxWidth: '300px'
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
  },
  listingInfo: {
    marginBottom: 8
  }
};

export default Map;