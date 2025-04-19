import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import { checkAuthStatus } from '../utils/auth';

console.log('ListingDetails component loaded');

const ListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reservationVolume, setReservationVolume] = useState('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [isLender, setIsLender] = useState(false);
  const [lenderActionLoading, setLenderActionLoading] = useState({}); // { [requestId]: bool }
  const [lenderActionError, setLenderActionError] = useState({});
  const [partialApproveInput, setPartialApproveInput] = useState({}); // { [requestId]: value }
  const [refreshKey, setRefreshKey] = useState(0); // for triggering refresh

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus();
        console.log('ListingDetails - auth status:', status);
        setIsAuthenticated(status.authenticated);
      } catch (error) {
        console.error('Error checking auth in ListingDetails:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    console.log('ListingDetails component mounted with ID:', id);
    
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('Invalid listing ID');
        }
        
        console.log(`Fetching details for listing ID: ${id}`);
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`;
        console.log('API URL:', apiUrl);
        
        // Get user information for headers
        const userType = sessionStorage.getItem('userType') || 'renter';
        const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
        
        const response = await fetch(apiUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': storedUsername || ''
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch listing details: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Received listing data:', data);
        
        // Only fetch interest status if user is authenticated
        let isInterested = false;
        if (isAuthenticated) {
          try {
            const interestResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/my-interested-listings`, {
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'X-User-Type': userType,
                'X-Username': storedUsername || ''
              }
            });
            
            if (interestResponse.ok) {
              const interestedListings = await interestResponse.json();
              isInterested = interestedListings.some(listing => listing.id === data.id);
            }
          } catch (err) {
            console.error('Error fetching interest status:', err);
            // Continue with isInterested = false
          }
        }
        
        // Simple formatted listing with fallbacks for all properties
        const formattedListing = {
          id: data.id || id,
          location: data.location || 'Unknown Location',
          cost: data.cost || 0,
          cubicFeet: data.cubic_feet || 0,
          description: data.description || 'No description available',
          isAvailable: data.is_available !== undefined ? data.is_available : true,
          startDate: data.start_date || '',
          endDate: data.end_date || '',
          images: [data.image_url || '/assets/placeholder.jpg'],
          lender: {
            name: data.owner_id ? `Owner #${data.owner_id}` : 'Unknown Owner',
            email: 'contact@tigerstorage.com'
          },
          isInterested: isInterested
        };
        
        console.log('Formatted listing:', formattedListing);
        setListing(formattedListing);
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
    
    return () => {
      console.log('ListingDetails component unmounted');
    };
  }, [id, isAuthenticated]);

  // Helper: check if renter has a pending request for this listing
  const hasPendingRequest = myRequests.some(r => r.status === 'pending');

  // Fetch reservation requests for this listing (auto-refresh on refreshKey)
  useEffect(() => {
    if (!listing || !isAuthenticated) return;
    const fetchRequests = async () => {
      setRequestsLoading(true);
      setIsLender(false);
      setMyRequests([]);
      setAllRequests([]);
      try {
        const userType = sessionStorage.getItem('userType') || 'renter';
        const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
        if (listing.lender && listing.lender.name && storedUsername && listing.lender.name.includes(storedUsername)) {
          setIsLender(true);
          const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/listings/${listing.id}/reservation-requests`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          if (resp.ok) {
            setAllRequests(await resp.json());
          }
        } else {
          const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/my-reservation-requests`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          if (resp.ok) {
            const all = await resp.json();
            setMyRequests(all.filter(r => String(r.listing_id) === String(listing.id)));
          }
        }
      } catch (err) {
        // ignore for now
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();
  }, [listing, isAuthenticated, refreshKey]);

  // Auto-refresh listing after lender action or reservation
  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`;
      const userType = sessionStorage.getItem('userType') || 'renter';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername || ''
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch listing details: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      // ...formatting as before...
      const formattedListing = {
        id: data.id || id,
        location: data.location || 'Unknown Location',
        cost: data.cost || 0,
        cubicFeet: data.cubic_feet || 0,
        description: data.description || 'No description available',
        isAvailable: data.is_available !== undefined ? data.is_available : true,
        startDate: data.start_date || '',
        endDate: data.end_date || '',
        images: [data.image_url || '/assets/placeholder.jpg'],
        lender: {
          name: data.owner_id ? `Owner #${data.owner_id}` : 'Unknown Owner',
          email: 'contact@tigerstorage.com'
        },
        isInterested: false // skip for now
      };
      setListing(formattedListing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle showing interest
  const handleShowInterest = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      sessionStorage.setItem('returnTo', `/listing/${id}`);
      navigate('/');
      return;
    }

    try {
      if (!listing || !listing.id) {
        console.error('Cannot toggle interest: listing or listing.id is undefined');
        return;
      }
      
      const isInterested = listing.isInterested;
      const method = isInterested ? 'DELETE' : 'POST';
      
      // Get user information for headers
      const userType = sessionStorage.getItem('userType') || 'renter';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
      
      // Use axios to ensure withCredentials: true for session cookies
      const axios = (await import('axios')).default;
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL}/api/listings/${listing.id}/interest`;
        await axios({
          url: apiUrl,
          method,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': storedUsername || ''
          }
        });
      } catch (err) {
        const errorData = err.response?.data || {};
        throw new Error(errorData.error || `Failed to ${isInterested ? 'remove' : 'add'} interest`);
      }

      // Update the listing's interest status immediately
      setListing(prevListing => ({
        ...prevListing,
        isInterested: !isInterested
      }));
      
      // Show success message
      setMessage({
        type: 'success',
        text: `Successfully ${isInterested ? 'removed' : 'added'} interest in this listing`
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error in handleShowInterest:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to update interest status'
      });
    }
  };

  // Helper: get username from storage
  const getStoredUsername = () => sessionStorage.getItem('username') || localStorage.getItem('username') || '';

  const handleReservation = async (e) => {
    e.preventDefault();
    if (!reservationVolume || isNaN(reservationVolume) || Number(reservationVolume) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid volume.' });
      return;
    }
    if (hasPendingRequest) {
      setMessage({ type: 'error', text: 'You already have a pending request for this listing.' });
      return;
    }
    setReservationLoading(true);
    setMessage(null);
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/listings/${listing.id}/reserve`;
      const userType = sessionStorage.getItem('userType') || 'renter';
      const storedUsername = getStoredUsername();
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        },
        body: JSON.stringify({ requested_volume: reservationVolume })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to request reservation');
      }
      setMessage({ type: 'success', text: 'Reservation request submitted!' });
      setReservationVolume('');
      setRefreshKey(k => k + 1); // trigger requests refresh
      fetchListing(); // refresh listing
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setReservationLoading(false);
    }
  };

  // Lender: handle approve/reject/partial
  const handleLenderAction = async (requestId, action, approvedVolume) => {
    setLenderActionLoading(l => ({ ...l, [requestId]: true }));
    setLenderActionError(e => ({ ...e, [requestId]: null }));
    try {
      const userType = sessionStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reservation-requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        },
        body: JSON.stringify(action === 'approved_partial' ? { status: action, approved_volume: approvedVolume } : { status: action })
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update request');
      }
      setMessage({ type: 'success', text: 'Request updated!' });
      setRefreshKey(k => k + 1); // trigger requests refresh
      fetchListing(); // refresh listing
    } catch (err) {
      setLenderActionError(e => ({ ...e, [requestId]: err.message }));
    } finally {
      setLenderActionLoading(l => ({ ...l, [requestId]: false }));
    }
  };

  // Simple render function for error state
  const renderError = () => (
    <div style={styles.errorContainer}>
      <h2>Error</h2>
      <p>{error}</p>
      <button style={styles.backButton} onClick={() => navigate('/view-listings')}>
        &larr; Back to Listings
      </button>
    </div>
  );

  // Simple render function for loading state
  const renderLoading = () => (
    <div style={styles.loadingContainer}>
      <p>Loading listing details...</p>
    </div>
  );

  // Simple render function for when listing is not found
  const renderNotFound = () => (
    <div style={styles.errorContainer}>
      <h2>Listing Not Found</h2>
      <p>Sorry, we couldn't find this listing. It may have been removed or is temporarily unavailable.</p>
      <button style={styles.backButton} onClick={() => navigate('/view-listings')}>
        &larr; Back to Listings
      </button>
    </div>
  );

  console.log('ListingDetails render state:', { loading, error, listing, isAuthenticated });

  return (
    <div style={styles.container}>
      <Header title="Storage Space Details" />
      <div style={styles.content}>
        <button 
          style={styles.backButton} 
          onClick={() => navigate('/view-listings')}
        >
          ← Back to Listings
        </button>

        {/* Display any success/error messages */}
        {message && (
          <div 
            style={{
              padding: '10px',
              marginBottom: '15px',
              borderRadius: '4px',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              color: message.type === 'success' ? '#155724' : '#721c24',
              textAlign: 'center'
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? renderLoading() : error ? renderError() : !listing ? renderNotFound() : (
          <div style={styles.detailsContainer}>
            <div style={styles.imageSection}>
              <img 
                src={listing.images?.[0] || '/assets/placeholder.jpg'} 
                alt="Storage Space" 
                style={styles.mainImage} 
                onError={(e) => {
                  console.log('Image failed to load, using placeholder');
                  e.target.src = '/assets/placeholder.jpg';
                }}
              />
            </div>

            <div style={styles.infoSection}>
              <h2 style={styles.location}>{listing.location}</h2>
              
              {listing.address && (
                <div style={{ fontStyle: 'italic', color: '#888', marginBottom: 8 }}>{listing.address}</div>
              )}

              <div style={styles.listingInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Location:</span>
                  <span style={styles.infoValue}>{listing.location}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Cost:</span>
                  <span style={styles.infoValue}>${listing.cost}/month</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Size:</span>
                  <span style={styles.infoValue}>{listing.cubicFeet} cubic feet</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Contract Length:</span>
                  <span style={styles.infoValue}>{listing.contractLength} months</span>
                </div>
                {listing.contractStartDate && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Start Date:</span>
                    <span style={styles.infoValue}>{new Date(listing.contractStartDate).toLocaleDateString()}</span>
                  </div>
                )}
                {listing.contractEndDate && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>End Date:</span>
                    <span style={styles.infoValue}>{new Date(listing.contractEndDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Lender:</span>
                  <span style={styles.infoValue}>{listing.lender.name}</span>
                </div>
              </div>

              <div style={styles.descriptionSection}>
                <h3>Description</h3>
                <p style={styles.description}>{listing.description}</p>
              </div>

              <div style={styles.lenderInfo}>
                <h3>Lender Information</h3>
                <p><strong>Name:</strong> {listing.lender?.name || 'Unknown'}</p>
                <p><strong>Email:</strong> {listing.lender?.email || 'contact@tigerstorage.com'}</p>
                <div style={styles.actionSection}>
                  <button 
                    style={{
                      ...styles.interestButton,
                      backgroundColor: listing.isInterested ? '#4caf50' : '#f57c00'
                    }}
                    onClick={handleShowInterest}
                  >
                    {isAuthenticated 
                      ? (listing.isInterested ? '✓ Interested' : '+ Show Interest')
                      : 'Login to Show Interest'}
                  </button>
                </div>
              </div>

              {/* Reservation Form for Renters */}
              {isAuthenticated && listing.isAvailable && !isLender && (
                <div style={{ marginTop: 32, marginBottom: 16, padding: 16, background: '#f8f8f8', borderRadius: 6 }}>
                  <h3>Reserve Space</h3>
                  <form onSubmit={handleReservation} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      max={listing.cubicFeet}
                      value={reservationVolume}
                      onChange={e => setReservationVolume(e.target.value)}
                      placeholder="Volume (cubic feet)"
                      style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', width: 120 }}
                      disabled={reservationLoading || !listing.isAvailable || hasPendingRequest}
                    />
                    <button
                      type="submit"
                      style={{ ...styles.interestButton, backgroundColor: '#1976d2', width: 'auto', minWidth: 120 }}
                      disabled={reservationLoading || !listing.isAvailable || hasPendingRequest}
                    >
                      {reservationLoading ? 'Requesting...' : 'Request Reservation'}
                    </button>
                  </form>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                    Available: {listing.cubicFeet} cubic feet
                    {hasPendingRequest && <span style={{ color: '#d32f2f', marginLeft: 12 }}>You already have a pending request.</span>}
                  </div>
                </div>
              )}

              {/* Renter: My Reservation Requests for this Listing */}
              {isAuthenticated && myRequests.length > 0 && !isLender && (
                <div style={{ marginTop: 24, marginBottom: 8, padding: 16, background: '#e3f2fd', borderRadius: 6 }}>
                  <h4>Your Reservation Requests</h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {myRequests.map(req => (
                      <li key={req.request_id} style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 500 }}>Requested:</span> {req.requested_volume} cu ft | 
                        <span style={{ fontWeight: 500, marginLeft: 8 }}>Status:</span> {req.status.replace('_', ' ')}
                        {req.approved_volume && (
                          <span style={{ marginLeft: 8 }}>(Approved: {req.approved_volume} cu ft)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Lender: All Reservation Requests for this Listing */}
              {isAuthenticated && isLender && (
                <div style={{ marginTop: 24, marginBottom: 8, padding: 16, background: '#fff3e0', borderRadius: 6 }}>
                  <h4>Reservation Requests (Lender View)</h4>
                  {requestsLoading ? <div>Loading requests...</div> : (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {allRequests.length === 0 && <li>No reservation requests yet.</li>}
                      {allRequests.map(req => (
                        <li key={req.request_id} style={{ marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                          <span style={{ fontWeight: 500 }}>{req.renter_username}</span>: {req.requested_volume} cu ft
                          <span style={{ marginLeft: 8, fontWeight: 500 }}>Status:</span> {req.status.replace('_', ' ')}
                          {req.approved_volume && (
                            <span style={{ marginLeft: 8 }}>(Approved: {req.approved_volume} cu ft)</span>
                          )}
                          {req.status === 'pending' && (
                            <span style={{ marginLeft: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <button
                                style={{ ...styles.interestButton, backgroundColor: '#388e3c', minWidth: 80, marginRight: 6 }}
                                disabled={lenderActionLoading[req.request_id]}
                                onClick={() => handleLenderAction(req.request_id, 'approved_full')}
                              >Approve Full</button>
                              <input
                                type="number"
                                min="0.1"
                                max={req.requested_volume}
                                step="0.1"
                                value={partialApproveInput[req.request_id] || ''}
                                onChange={e => setPartialApproveInput(inp => ({ ...inp, [req.request_id]: e.target.value }))}
                                placeholder="Partial (cu ft)"
                                style={{ width: 80, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                                disabled={lenderActionLoading[req.request_id]}
                              />
                              <button
                                style={{ ...styles.interestButton, backgroundColor: '#fbc02d', minWidth: 80, marginRight: 6 }}
                                disabled={lenderActionLoading[req.request_id] || !partialApproveInput[req.request_id] || isNaN(partialApproveInput[req.request_id]) || Number(partialApproveInput[req.request_id]) <= 0 || Number(partialApproveInput[req.request_id]) > req.requested_volume}
                                onClick={() => {
                                  const vol = Number(partialApproveInput[req.request_id]);
                                  if (vol > 0 && vol <= req.requested_volume) {
                                    handleLenderAction(req.request_id, 'approved_partial', vol);
                                    setPartialApproveInput(inp => ({ ...inp, [req.request_id]: '' }));
                                  }
                                }}
                              >Partial Approve</button>
                              <button
                                style={{ ...styles.interestButton, backgroundColor: '#d32f2f', minWidth: 80 }}
                                disabled={lenderActionLoading[req.request_id]}
                                onClick={() => handleLenderAction(req.request_id, 'rejected')}
                              >Reject</button>
                            </span>
                          )}
                          {lenderActionError[req.request_id] && (
                            <span style={{ color: 'red', marginLeft: 8 }}>{lenderActionError[req.request_id]}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
  },
  loadingMessage: {
    fontSize: '1.2rem',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
    gap: '1rem',
  },
  errorMessage: {
    fontSize: '1.2rem',
    color: '#f44336',
  },
  retryButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  descriptionSection: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  description: {
    margin: 0,
    lineHeight: '1.5',
    color: '#555',
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
  backButton: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '2rem',
  },
  imageSection: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  location: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#333',
  },
  listingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  infoValue: {
    color: '#666',
  },
  lenderInfo: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'center',
  },
  interestButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
  },
  interestedRenters: {
    marginTop: '1rem',
  },
  rentersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  renterItem: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  renterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  renterContact: {
    fontSize: '0.9rem',
    color: '#666',
  },
  renterEmail: {
    textDecoration: 'underline',
  },
  renterStatus: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  renterDate: {
    color: '#666',
    fontSize: '0.9rem',
  },
};

export default ListingDetails;
