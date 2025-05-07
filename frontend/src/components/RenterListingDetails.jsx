import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import { checkAuthStatus, axiosInstance } from '../utils/auth';
import { getCSRFToken } from '../utils/csrf';
import ReservationModal from './ReservationModal';
import StarIcon from '@mui/icons-material/Star';
import { useRenterInterest } from '../context/RenterInterestContext';

console.log('ListingDetails component loaded');

// Helper to format YYYY-MM-DD as MM/DD/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

const RenterListingDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [myRequestId, setMyRequestId] = useState(null);
  const { interestedListings, refreshInterestedListings } = useRenterInterest();

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
    // Ensure CSRF token is set on mount
    fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, { credentials: 'include' });
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
        const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
        const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
        
        const response = await axiosInstance.get(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': storedUsername || ''
          }
        });
        
        const data = response.data;
        console.log('Received listing data:', data);
        
        // Get interest status from context instead of fetching separately
        const isInterested = interestedListings.some(l => String(l.id) === String(data.id));
        
        // Simple formatted listing with fallbacks for all properties
        const formattedListing = {
          id: data.id || id,
          title: data.title || 'Unknown Title',
          cost: data.cost || 0,
          sq_ft: data.sq_ft || 0,
          description: data.description || '',
          address: data.address || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          start_date: data.start_date || '',
          end_date: data.end_date || '',
          image_url: data.image_url || '',
          hall_name: data.hall_name || '',
          owner_id: data.owner_id || '',
          remaining_space: data.remaining_space || 0,
          is_available: data.is_available,
          lender: {
            name: data.owner_id ? `Owner #${data.owner_id}` : 'Unknown Owner',
            email: 'contact@tigerstorage.com'
          },
          isInterested: isInterested,
          lender_avg_rating: data.lender_avg_rating,
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
  }, [id, interestedListings]);

  // Auto-refresh listing after lender action or reservation
  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`;
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      const response = await axiosInstance.get(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername || ''
        }
      });
      const data = response.data;
      
      // Get interest status from context
      const isInterested = interestedListings.some(l => String(l.id) === String(data.id));
      
      // Simple formatted listing with fallbacks for all properties
      const formattedListing = {
        id: data.id || id,
        title: data.title || 'Unknown Title',
        cost: data.cost || 0,
        sq_ft: data.sq_ft || 0,
        description: data.description || '',
        address: data.address || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        image_url: data.image_url || '',
        hall_name: data.hall_name || '',
        owner_id: data.owner_id || '',
        remaining_space: data.remaining_space || 0,
        is_available: data.is_available,
        lender: {
          name: data.owner_id ? `Owner #${data.owner_id}` : 'Unknown Owner',
          email: 'contact@tigerstorage.com'
        },
        isInterested: isInterested,
        lender_avg_rating: data.lender_avg_rating,
      };
      setListing(formattedListing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add interest toggle handler
  const handleToggleInterest = async () => {
    if (!listing) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('returnTo', `/listing/${id}`);
      navigate('/');
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || '';

      if (listing.isInterested) {
        // Remove interest after cancelling any pending reservations
        try {
          // First, check for and cancel any pending reservation requests
          const resp = await axiosInstance.get('/api/my-reservation-requests', {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          
          if (resp.data && Array.isArray(resp.data)) {
            const pending = resp.data.find(r => 
              (String(r.listing_id) === String(listing.id)) && 
              r.status === 'pending'
            );
            
            if (pending) {
              console.log(`Cancelling pending reservation request ID: ${pending.request_id}`);
              await axiosInstance.patch(`/api/reservation-requests/${pending.request_id}`, {
                status: 'cancelled_by_renter'
              }, {
                headers: {
                  'X-User-Type': userType,
                  'X-Username': storedUsername,
                  'X-CSRFToken': getCSRFToken()
                }
              });
            }
          }
          
          // Then remove interest
          await axiosInstance.delete(`${apiUrl}/api/listings/${listing.id}/interest`, {
            headers: {
              'Content-Type': 'application/json',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          
          // Update global context and refresh the listing details
          await refreshInterestedListings();
          setMessage({ type: 'success', text: 'Interest removed!' });
          setTimeout(() => setMessage(null), 2000);
          
          // Local state will be synced via the useEffect that watches interestedListings
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Failed to remove interest';
          setError(errorMessage);
          setMessage({ type: 'error', text: errorMessage });
          setTimeout(() => setMessage(null), 2000);
          throw error; // Rethrow to be caught by outer catch
        }
      } else {
        // Before showing interest, check if there's an existing pending request
        try {
          const resp = await axiosInstance.get('/api/my-reservation-requests', {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          
          if (resp.data && Array.isArray(resp.data)) {
            const pending = resp.data.find(r => 
              (String(r.listing_id) === String(listing.id)) && 
              r.status === 'pending'
            );
            
            if (pending) {
              // Cancel the existing request before adding interest
              console.log(`Cancelling existing pending reservation request ID: ${pending.request_id}`);
              await axiosInstance.patch(`/api/reservation-requests/${pending.request_id}`, {
                status: 'cancelled_by_renter'
              }, {
                headers: {
                  'X-User-Type': userType,
                  'X-Username': storedUsername,
                  'X-CSRFToken': getCSRFToken()
                }
              });
            }
          }
          
          // Now show the reservation modal
          setReservationModalOpen(true);
        } catch (error) {
          console.error('Error checking for pending requests:', error);
          // Continue with showing the modal anyway
          setReservationModalOpen(true);
        }
        return;
      }
    } catch (err) {
      console.error('Toggle interest error:', err);
      // Don't set error message if it was already set in the inner catch
      if (!message) {
        setError(err.message);
        setMessage({ type: 'error', text: err.message });
        setTimeout(() => setMessage(null), 2000);
      }
    }
  };

  // Reservation submit handler for modal
  const handleReservationSubmit = async ({ space, mode }) => {
    setReservationLoading(true);
    setReservationError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'renter';
      const username = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
      // Always send full sq_ft for 'full', user-entered for 'partial', as a number
      const requested_space = mode === 'full' ? Number(listing.sq_ft) : Number(space);
      if (!requested_space || requested_space <= 0) {
        setReservationError('Please enter a valid space amount.');
        setReservationLoading(false);
        return;
      }
      console.log('Submitting reservation:', { requested_space, mode, listing });
      await axiosInstance.post(apiUrl, { requested_space }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': username,
          'X-CSRFToken': getCSRFToken()
        }
      });
      
      // Close modal first
      setReservationModalOpen(false);
      
      // Update local state immediately
      setListing(prev => prev ? { ...prev, isInterested: true } : prev);
      
      // Show success message
      setMessage({ type: 'success', text: 'Reservation request submitted!' });
      setTimeout(() => setMessage(null), 2000);
      
      // Refresh global interest state
      await refreshInterestedListings();
      
      // Fetch updated listing details
      await fetchListing();
    } catch (error) {
      console.error('Reservation error:', error);
      const errorData = error.response?.data || {};
      setReservationError(errorData.error || 'Failed to request reservation');
    } finally {
      setReservationLoading(false);
    }
  };

  // Fetch reviews for this lender
  useEffect(() => {
    if (!listing || !listing.owner_id) return;
    const fetchReviews = async () => {
      try {
        setReviewLoading(true);
        const resp = await axiosInstance.get(`/api/lender-reviews/${listing.owner_id}`);
        setReviews(resp.data);
      } catch (err) {
        // ignore
      } finally {
        setReviewLoading(false);
      }
    };
    fetchReviews();
  }, [listing]);

  // Determine if user can review
  useEffect(() => {
    if (!myRequests || myRequests.length === 0) {
      setCanReview(false);
      setHasReviewed(false);
      setMyRequestId(null);
      return;
    }
    // Find an approved reservation with end date in the past (date-only comparison)
    console.log('myRequests:', myRequests);
    const today = new Date();
    today.setHours(0,0,0,0); // midnight local time
    console.log('Review eligibility check - today is:', today.toISOString(), today.toLocaleString());
    const eligible = myRequests.find(r => {
      if (!(r.status === 'approved_full' || r.status === 'approved_partial') || !r.end_date) return false;
      const endDate = new Date(r.end_date);
      endDate.setHours(0,0,0,0); // ignore time
      return endDate < today;
    });
    if (!eligible) {
      setCanReview(false);
      setHasReviewed(false);
      setMyRequestId(null);
      return;
    }
    setMyRequestId(eligible.request_id);
    // Check if already reviewed
    const checkReviewed = async () => {
      try {
        const resp = await axiosInstance.get(`/api/lender-reviews/${listing.owner_id}`);
        const data = resp.data;
        const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username');
        const found = data.find(r => r.renter_username === storedUsername && r.request_id === eligible.request_id);
        setHasReviewed(!!found);
        setCanReview(!found);
      } catch (err) {
        setHasReviewed(false);
        setCanReview(true);
      }
    };
    checkReviewed();
  }, [myRequests, listing]);

  // Review form submit
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      const resp = await axiosInstance.post('/api/lender-reviews', {
        request_id: myRequestId,
        rating: reviewRating,
        review_text: reviewText
      }, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = resp.data;
      if (data && data.error) throw new Error(data.error || 'Failed to submit review');
      setReviewSuccess('Review submitted!');
      setHasReviewed(true);
      setCanReview(false);
      setReviewRating(0);
      setReviewText('');
      // Refresh reviews
      const reviewsResp = await axiosInstance.get('/api/lender-reviews/'+listing.owner_id);
      setReviews(reviewsResp.data);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Clear reservation error when listing id changes
  useEffect(() => {
    setReservationError('');
  }, [id]);

  // Clear general error when listing id changes
  useEffect(() => {
    setError(null);
  }, [id]);

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
              {listing.images && listing.images.length > 0 && (
                <img
                  src={listing.images[0]}
                  alt="Storage Space"
                  style={styles.mainImage}
                />
              )}
            </div>

            <div style={styles.infoSection}>
              <h2 style={styles.location}>{listing.title}</h2>
              {listing.hall_name && (
                <div style={{ fontSize: '1.05rem', color: '#FF8F00', fontWeight: 500, marginBottom: 8 }}>
                  Residential Hall: {listing.hall_name}
                </div>
              )}
              
              <div style={styles.listingInfo}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Cost:</span>
                  <span style={styles.infoValue}>${listing.cost}/month</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Size:</span>
                  <span style={styles.infoValue}>{listing.sq_ft} sq ft</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Start Date:</span>
                  <span style={styles.infoValue}>{listing.start_date ? formatDate(listing.start_date) : 'N/A'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>End Date:</span>
                  <span style={styles.infoValue}>{listing.end_date ? formatDate(listing.end_date) : 'N/A'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Lender NetID:</span>
                  <span style={styles.infoValue}>{listing.lender?.username || listing.lender?.netid || listing.owner_id || 'Unknown'}</span>
                </div>
              </div>

              <div style={styles.descriptionSection}>
                <h3>Description</h3>
                <p style={styles.description}>{listing.description}</p>
              </div>

              <div style={styles.lenderInfo}>
                <h3>Lender Information</h3>
                <p><strong>NetID:</strong> {listing.lender?.username || listing.lender?.netid || listing.owner_id || 'Unknown'}</p>
                <p><strong>Email:</strong> {(listing.lender?.username || listing.lender?.netid || listing.owner_id) ? `${listing.lender?.username || listing.lender?.netid || listing.owner_id}@princeton.edu` : 'cs-tigerstorage@princeton.edu'}</p>
                <div style={styles.actionSection}>
                  <button
                    style={{
                      ...styles.interestButton,
                      backgroundColor: listing.isInterested ? '#4caf50' : '#f57c00'
                    }}
                    onClick={handleToggleInterest}
                  >
                    {isAuthenticated
                      ? (listing.isInterested ? '✓ Interested' : '+ Show Interest')
                      : 'Login to Show Interest'}
                  </button>
                </div>
              </div>

              {/* --- Renter Review Section --- */}
              <div style={{ marginTop: 32 }}>
                <h3>Lender Reviews</h3>
                {reviewLoading ? <div>Loading reviews...</div> : (
                  <>
                    {reviews.length === 0 && <div>No reviews yet.</div>}
                    {reviews.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <b>Average Rating: </b>
                        {(
                          reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
                        ).toFixed(1)}
                        <span style={{ color: '#fbc02d', marginLeft: 8 }}>
                          {[...Array(Math.round(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length))].map((_, i) => <StarIcon key={i} fontSize="small" />)}
                        </span>
                      </div>
                    )}
                    <div>
                      {reviews.map((r, i) => (
                        <div key={i} style={{ background: '#f8f8f8', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#fbc02d' }}>{[...Array(r.rating)].map((_, j) => <StarIcon key={j} fontSize="small" />)}</span>
                            <span style={{ fontWeight: 600 }}>{r.renter_username}</span>
                            <span style={{ color: '#888', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <div style={{ marginTop: 4 }}>{r.review_text}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* Review Form */}
                {canReview && !hasReviewed && (
                  <form onSubmit={handleReviewSubmit} style={{ marginTop: 24, background: '#fffbe6', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ marginBottom: 8 }}><b>Leave a Review</b></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} style={{ cursor: 'pointer', color: reviewRating >= star ? '#fbc02d' : '#ccc' }} onClick={() => setReviewRating(star)}>
                          <StarIcon fontSize="medium" />
                        </span>
                      ))}
                      <span style={{ marginLeft: 8 }}>{reviewRating} / 5</span>
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      rows={3}
                      placeholder="Write your review..."
                      style={{ width: '100%', borderRadius: 6, border: '1px solid #ddd', padding: 8, marginBottom: 8 }}
                      required
                    />
                    {reviewError && <div style={{ color: 'red', marginBottom: 8 }}>{reviewError}</div>}
                    {reviewSuccess && <div style={{ color: 'green', marginBottom: 8 }}>{reviewSuccess}</div>}
                    <button type="submit" style={{ background: '#fbc02d', color: '#333', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }} disabled={reviewLoading || reviewRating === 0}>
                      {reviewLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}
                {hasReviewed && <div style={{ color: 'green', marginTop: 12 }}>You have already reviewed this reservation.</div>}
              </div>

              <ReservationModal
                open={reservationModalOpen}
                onClose={() => setReservationModalOpen(false)}
                onSubmit={handleReservationSubmit}
                maxVolume={listing.sq_ft}
                loading={reservationLoading}
                error={reservationError}
              />
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

export default RenterListingDetails;
