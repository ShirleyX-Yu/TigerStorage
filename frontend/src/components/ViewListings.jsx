import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import ReservationModal from './ReservationModal';
import { getCSRFToken } from '../utils/csrf';
import { axiosInstance } from '../utils/auth';
import Slider from '@mui/material/Slider';

// Function to calculate distance between two points in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const getStatusLabel = (status) => {
  if (!status) return '';
  switch (status) {
    case 'approved_full':
      return 'Approved (Full)';
    case 'approved_partial':
      return 'Approved (Partial)';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    case 'cancelled_by_renter':
      return 'Cancelled by Renter';
    case 'expired':
      return 'Expired';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Custom dual-thumb slider component for min/max range
function RangeSlider({ min, max, value, onChange, step = 1, label, unit = '', color = '#FF6B00' }) {
  // value: [minValue, maxValue]
  const [minValue, maxValue] = value;
  const handleMinChange = (e) => {
    const newMin = Math.min(Number(e.target.value), maxValue - step);
    onChange([newMin, maxValue]);
  };
  const handleMaxChange = (e) => {
    const newMax = Math.max(Number(e.target.value), minValue + step);
    onChange([minValue, newMax]);
  };
  return (
    <div style={{ width: '100%', marginBottom: 12 }}>
      <label style={{ fontWeight: 500, color: '#555', marginBottom: 4, display: 'block' }}>{label}</label>
      <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          style={{
            position: 'absolute',
            width: '100%',
            pointerEvents: 'auto',
            zIndex: 2,
            accentColor: color,
            background: 'transparent',
            height: 0,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          style={{
            position: 'absolute',
            width: '100%',
            pointerEvents: 'auto',
            zIndex: 1,
            accentColor: color,
            background: 'transparent',
            height: 0,
          }}
        />
        {/* Track and range highlight */}
        <div style={{ position: 'absolute', width: '100%', height: 6, background: '#FFF3E6', borderRadius: 3, zIndex: 0 }} />
        <div style={{
          position: 'absolute',
          left: `${((minValue - min) / (max - min)) * 100}%`,
          width: `${((maxValue - minValue) / (max - min)) * 100}%`,
          height: 6,
          background: color,
          borderRadius: 3,
          zIndex: 1,
        }} />
        {/* Dots */}
        <div style={{
          position: 'absolute',
          left: `${((minValue - min) / (max - min)) * 100}%`,
          top: -6,
          width: 18,
          height: 18,
          background: color,
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          transform: 'translate(-50%, 0)',
          zIndex: 3,
        }} />
        <div style={{
          position: 'absolute',
          left: `${((maxValue - min) / (max - min)) * 100}%`,
          top: -6,
          width: 18,
          height: 18,
          background: color,
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          transform: 'translate(-50%, 0)',
          zIndex: 3,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
        <span>Min: {minValue}{unit}</span>
        <span>Max: {maxValue}{unit}</span>
      </div>
    </div>
  );
}

const ViewListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [reservationListing, setReservationListing] = useState(null);
  const [message, setMessage] = useState(null);

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

  const openMap = () => {
    navigate('/map');
  };

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
        const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
        
        // Use the same API endpoint as the map view
        const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/api/listings`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username,
            'X-CSRFToken': getCSRFToken()
          }
        });
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Unexpected data format from API');
        }
        
        // Calculate distance for each listing
        const listingsWithDistance = data.map(listing => {
          const distance = listing.latitude && listing.longitude
            ? calculateDistance(
                40.3437, -74.6517,
                listing.latitude, listing.longitude
              )
            : Number.MAX_VALUE;
          return {
            ...listing,
            distance,
            isInterested: false // Default to false, will update below
          };
        });
        
        // Fetch user's reservation requests to mark interest
        try {
          const requestsResponse = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/api/my-reservation-requests`, {
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
            const listingsWithInterest = listingsWithDistance.map(listing => ({
              ...listing,
              isInterested: pendingRequestIds.includes(String(listing.id) || String(listing.listing_id))
            }));
            
            setListings(listingsWithInterest);
          } else {
            setListings(listingsWithDistance);
          }
        } catch (error) {
          //console.error('Error fetching reservation requests:', error);
          // Continue with listings even if we can't fetch reservation status
          setListings(listingsWithDistance);
        }
      } catch (err) {
        //console.error('Error fetching listings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  // Function to toggle interest in a listing
  const toggleInterest = async (listingId) => {
    try {
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      
      // Find the current listing
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return;
      
      // Check if already interested or not
      const isInterested = listing.isInterested;
      
      if (isInterested) {
        // If already interested, try to cancel the pending request
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
            (String(r.listing_id) === String(listingId)) && 
            r.status === 'pending'
          );
          
          if (pending) {
            // Cancel the existing request
            // console.log(`Cancelling pending reservation request ID: ${pending.request_id}`);
            await axiosInstance.patch(`/api/reservation-requests/${pending.request_id}`, {
              status: 'cancelled_by_renter'
            }, {
              headers: {
                'X-User-Type': userType,
                'X-Username': username,
                'X-CSRFToken': getCSRFToken()
              }
            });
            
            // Show success message
            setMessage({ type: 'success', text: 'Space request cancelled!' });
            setTimeout(() => setMessage(null), 3000);
            
            // Update the UI immediately
            setListings(currentListings => 
              currentListings.map(l => 
                l.id === listingId ? {...l, isInterested: false} : l
              )
            );
          }
        }
      } else {
        // Not interested yet, show reservation modal for new interest
        const listing = listings.find(l => l.id === listingId);
        setReservationListing(listing);
        setReservationModalOpen(true);
      }
    } catch (error) {
      // console.error('Error toggling interest:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Error updating request' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Use the same filter structure as the map view
  const [filters, setFilters] = useState({
    minCost: 0,
    maxCost: 100,
    minSize: 0,
    maxSize: 500,
    maxDistance: 50,
    minRating: 1,
    includeUnrated: false,
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      minCost: 0,
      maxCost: 100,
      minSize: 0,
      maxSize: 500,
      maxDistance: 50,
      minRating: 1,
      includeUnrated: false,
    });
  };

  // Debug: log filter values on every render
  // console.log('Current filters:', filters);

  // Live updating filter logic
  const filterListings = (listings) => {
    return listings.filter(listing => {
      const cost = listing.cost ?? 0;
      const size = Number(listing.sq_ft) ?? 0;
      const distance = listing.latitude && listing.longitude
        ? calculateDistance(40.3437, -74.6517, listing.latitude, listing.longitude)
        : 0;
      const rating = listing.lender_avg_rating;
      const hasRating = typeof rating === 'number' && !isNaN(rating);
      return (
        cost >= filters.minCost && cost <= filters.maxCost &&
        size >= filters.minSize && size <= filters.maxSize &&
        distance <= filters.maxDistance &&
        (
          (hasRating && rating >= filters.minRating) ||
          (filters.includeUnrated && !hasRating)
        )
      );
    });
  };

  // Filter out unavailable listings before rendering
  const filteredListings = filterListings(listings).filter(
    listing =>
      (listing.is_available === undefined || listing.is_available === true) &&
      Number(listing.remaining_space) > 0
  );

  // After a reservation is submitted, re-fetch the listings to update remaining_space.
  const handleReservationSubmit = async ({ space, mode }) => {
    setReservationLoading(true);
    setReservationError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      
      // Use axiosInstance for consistency with other components
      const requested_space = mode === 'full' ? Number(reservationListing.sq_ft) : Number(space);
      
      // Submit the reservation request (this now serves as the "interest" functionality)
      await axiosInstance.post(`/api/listings/${reservationListing?.id}/reserve`, 
        { requested_space }, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username,
            'X-CSRFToken': getCSRFToken()
          }
        }
      );
      
      // Close modal first
      setReservationModalOpen(false);
      
      // Show success message
      setMessage({ type: 'success', text: 'Space requested!' });
      setTimeout(() => setMessage(null), 3000);
      
      // Update the UI immediately
      if (reservationListing) {
        setListings(currentListings => 
          currentListings.map(l => 
            l.id === reservationListing.id ? {...l, isInterested: true} : l
          )
        );
      }
      
      // Re-fetch all listings from the server
      await fetchListings();
    } catch (err) {
      // console.error('Reservation error:', err);
      setReservationError(err.response?.data?.error || err.message);
    } finally {
      setReservationLoading(false);
    }
  };

  useEffect(() => {
    // Ensure CSRF token is set on mount
    fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, { credentials: 'include' });
  }, []);

  return (
    <div style={styles.container}>
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
      
      <Header title="Storage Listings" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Browse available storage spaces
        </div>
        
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>Storage Listings</h2>
            <button onClick={openMap} style={{
              background: '#FF6B00',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(255,111,0,0.08)',
              transition: 'background 0.2s',
            }}>View Map</button>
          </div>
          
          {loading ? (
            <div style={styles.message}>Loading storage listings...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : listings.length === 0 ? (
            <div style={styles.message}>No storage listings available.</div>
          ) : (
            <div>
              <div style={styles.filtersSection}>
                <h3 style={styles.filtersTitle}>Filters</h3>
                <div className="responsive-filter-grid" style={styles.filterGrid}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Price Range ($/month)</label>
                    <Slider
                      value={[filters.minCost, filters.maxCost]}
                      onChange={(_, newValue) => setFilters(f => ({ ...f, minCost: newValue[0], maxCost: newValue[1] }))}
                      min={0}
                      max={100}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{ color: '#FF6B00' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                      <span>Min: ${filters.minCost}</span>
                      <span>Max: ${filters.maxCost}</span>
                    </div>
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Size Range (sq ft)</label>
                    <Slider
                      value={[filters.minSize, filters.maxSize]}
                      onChange={(_, newValue) => setFilters(f => ({ ...f, minSize: newValue[0], maxSize: newValue[1] }))}
                      min={0}
                      max={500}
                      step={1}
                      valueLabelDisplay="auto"
                      sx={{ color: '#FF6B00' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                      <span>Min: {filters.minSize} sq ft</span>
                      <span>Max: {filters.maxSize} sq ft</span>
                    </div>
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Distance from Campus (miles)</label>
                    <Slider
                      value={filters.maxDistance}
                      onChange={(_, newValue) => setFilters(f => ({ ...f, maxDistance: newValue }))}
                      min={0}
                      max={50}
                      step={0.1}
                      valueLabelDisplay="auto"
                      sx={{ color: '#FF6B00' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12 }}>
                      <span>Max: {filters.maxDistance} mi</span>
                    </div>
                  </div>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Minimum Lender Rating</label>
                    <Slider
                      value={filters.minRating}
                      onChange={(_, newValue) => setFilters(f => ({ ...f, minRating: newValue }))}
                      min={1}
                      max={5}
                      step={1}
                      marks={[{value:1,label:'1'},{value:2,label:'2'},{value:3,label:'3'},{value:4,label:'4'},{value:5,label:'5'}]}
                      valueLabelDisplay="auto"
                      sx={{ color: '#FF6B00' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} style={{ color: filters.minRating >= star ? '#fbc02d' : '#ccc', fontSize: 18 }}>★</span>
                      ))}
                      <span style={{ marginLeft: 8 }}>{filters.minRating} star{filters.minRating > 1 ? 's' : ''} & up</span>
                      <label style={{ marginLeft: 16, display: 'flex', alignItems: 'center', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={filters.includeUnrated}
                          onChange={e => setFilters(f => ({ ...f, includeUnrated: e.target.checked }))}
                          style={{ marginRight: 4 }}
                        />
                        N/A (Include unrated)
                      </label>
                    </div>
                  </div>
                </div>
                <button onClick={handleReset} style={{ marginTop: 16, width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid #FF6B00', color: '#FF6B00', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Reset Filters</button>
                {/* Responsive styles for filter grid */}
                <style>{`
                  @media (max-width: 700px) {
                    .responsive-filter-grid {
                      display: flex !important;
                      flex-direction: column !important;
                      gap: 1rem !important;
                    }
                  }
                  @media (min-width: 701px) {
                    .responsive-filter-grid {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;
                      gap: 1.5rem !important;
                    }
                  }
                `}</style>
              </div>

              {filteredListings.length === 0 ? (
                <div style={styles.message}>
                  No storage spaces match your criteria
                </div>
              ) : (
                <div style={styles.listingsGrid}>
                  {filteredListings.map(listing => {
                    return (
                      <div key={listing.id} style={styles.listingCard}>
                        <img
                          src={listing.image_url}
                          alt={listing.location}
                          style={styles.listingImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/placeholder.jpg';
                          }}
                        />
                        <div style={styles.listingDetails}>
                          <h3 style={styles.listingTitle}>{listing.title}</h3>
                          {listing.hall_name && (
                            <div style={{ fontSize: '0.98rem', color: '#FF8F00', fontWeight: 500, marginBottom: 4 }}>
                              Residential Hall: {listing.hall_name}
                            </div>
                          )}
                          <div style={{ margin: '4px 0 8px 0' }}>
                            <strong>Lender Rating:</strong> {typeof listing.lender_avg_rating === 'number' ? (
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
                          </div>
                          <p style={styles.listingInfo}>
                            <strong>${listing.cost}</strong> per month · {listing.remaining_space ?? listing.sq_ft} sq ft remaining / {listing.sq_ft} sq ft total · Available: {formatDate(listing.start_date)} - {formatDate(listing.end_date)}
                          </p>
                          <div style={styles.descriptionBox}>
                            <p style={styles.description}>{listing.description || 'No description available'}</p>
                          </div>
                          <div style={styles.listingStatus}>
                            <span style={{
                              ...styles.status,
                              backgroundColor: listing.is_available ? '#4caf50' : '#f44336'
                            }}>
                              {getStatusLabel(listing.status)}
                            </span>
                            <span style={styles.lenderInfo}>Lender: Owner #{listing.owner_id}</span>
                          </div>
                          <div style={styles.actionButtons}>
                            <button
                              style={{
                                ...styles.interestButton,
                                backgroundColor: listing.isInterested ? '#f44336' : '#f57c00'
                              }}
                              onClick={() => toggleInterest(listing.id)}
                            >
                              {listing.isInterested ? 'Cancel Request' : '+ Request Space'}
                            </button>
                            <ReservationModal
                              open={reservationModalOpen}
                              onClose={() => setReservationModalOpen(false)}
                              onSubmit={handleReservationSubmit}
                              maxSpace={reservationListing ? reservationListing.sq_ft : 0}
                              loading={reservationLoading}
                              error={reservationError}
                            />
                            <button 
                              style={styles.viewButton}
                              onClick={() => navigate(`/listing/${listing.id}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  actionButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    gap: '10px',
  },
  interestButton: {
    flex: 1,
    padding: '10px 15px',
    backgroundColor: '#FF8F00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    minWidth: '120px',
    height: '40px',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcome: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
  },
  section: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  message: {
    color: '#666',
    marginBottom: '1rem',
  },
  error: {
    color: '#f44336',
    marginBottom: '1rem',
  },
  filtersSection: {
    backgroundColor: '#f5f5f5',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  filtersTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#333',
  },
  filterLabel: {
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.5rem',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  rangeInputs: {
    display: 'flex',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '0.9rem',
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem',
    marginTop: '1.5rem',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #eee',
    transition: 'transform 0.2s',
  },
  listingImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  listingDetails: {
    padding: '1.5rem',
  },
  listingTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    color: '#333',
  },
  listingInfo: {
    margin: '0.5rem 0',
    color: '#666',
  },
  listingStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
  },
  lenderInfo: {
    color: '#666',
    fontSize: '0.9rem',
  },
  listingId: {
    color: '#666',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
  status: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  actionButton: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    gap: '10px',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '120px',
    height: '40px',
  },
  descriptionBox: {
    backgroundColor: '#f9f9f9',
    padding: '0.75rem',
    borderRadius: '4px',
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
    lineHeight: '1.4',
  },
};

export default ViewListings;
